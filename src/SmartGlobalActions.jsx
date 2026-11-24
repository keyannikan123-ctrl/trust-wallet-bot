
import React, { useState } from 'react';
import {
  useSimulateContract,
  useWriteContract,
} from 'wagmi';

import { CHAIN_ID, CONTRACTS } from './contracts/addresses';
import { bankAbi } from './contracts/abi';
import { tok } from './utils/format';

function Check({ label, ok }) {
  return (
    <div style={{ margin: '7px 0', fontSize: 14 }}>
      <span style={{ color: ok ? '#16a34a' : '#dc2626' }}>
        {ok ? '✓' : '✗'}
      </span>{' '}
      {label}
    </div>
  );
}

function amount(value) {
  const result = Number(tok(value));
  return Number.isFinite(result) ? result : 0;
}

export default function SmartGlobalActions({
  address,
  enabled,
  accountId,
  ownerData,
  giftData,
  pointsData,
  bankBalance,
  giftListSize,
  modes,
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const id = Number(accountId || 0);

  const totalLeft = Number(ownerData?.Total_Left ?? ownerData?.[1] ?? 0);
  const totalRight = Number(ownerData?.Total_Right ?? ownerData?.[2] ?? 0);

  const giftReceived = amount(
    giftData?.Total_Gift_Received_USDT ?? giftData?.[0]
  );

  const daysSinceGift = Number(
    giftData?.Days_Passed_Since_Last_Gift ?? giftData?.[1] ?? 0
  );

  const callerReward = amount(
    giftData?.Caller_Reward_Total_USDT ?? giftData?.[3]
  );

  const hoursSinceCaller = Number(
    giftData?.Hours_Passed_Since_Last_Caller ?? giftData?.[4] ?? 0
  );

  const points = Number(pointsData ?? 0);
  const balance = amount(bankBalance);
  const listSize = Number(giftListSize ?? 0);

  const giftMode = modes?.gift || 'OFF';
  const distributeMode = modes?.distribute || 'OFF';

  const giftSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'registerForGift',
    args: [],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(
        enabled &&
        address &&
        id > 0 &&
        giftMode !== 'OFF'
      ),
      refetchInterval:
        giftMode === 'AUTO' ? 30000 : false,
    },
  });

  const distributeSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'distributeBank',
    args: [],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(
        enabled &&
        address &&
        id > 0 &&
        distributeMode !== 'OFF'
      ),
      refetchInterval:
        distributeMode === 'AUTO' ? 30000 : false,
    },
  });

  async function sendAction(simulation, label, mode) {
    if (mode !== 'MANUAL') {
      setMessage('برای اجرای دستی، حالت MANUAL را انتخاب کنید.');
      return;
    }

    if (!enabled || !address) {
      setMessage('ابتدا کیف پول را به شبکه BNB Smart Chain وصل کنید.');
      return;
    }

    if (busy) return;

    if (!simulation.data?.request) {
      setMessage(
        'شبیه‌سازی موفق نیست یا شرایط قرارداد فراهم نشده است. خطا و اطلاعات را بررسی کنید.'
      );
      return;
    }

    try {
      setBusy(true);
      setMessage(
        'در انتظار تأیید شما در کیف پول هستیم. جزئیات تراکنش را بررسی کنید.'
      );

      const result = await writeContractAsync(
        simulation.data.request
      );

      setMessage(
        `${label} به کیف پول ارسال شد. هش تراکنش: ${result}`
      );
    } catch (error) {
      setMessage(
        error?.shortMessage ||
        error?.message ||
        'تراکنش انجام نشد یا لغو شد.'
      );
    } finally {
      setBusy(false);
    }
  }

  const giftChecks = [
    {
      label: 'حساب دارای ID معتبر است',
      ok: id > 0,
    },
    {
      label: 'امتیازهای حساب صفر است',
      ok: points === 0,
    },
    {
      label: 'مجموع اعضای چپ و راست حداکثر ۹ است',
      ok: totalLeft + totalRight <= 9,
    },
    {
      label: 'مجموع Gift دریافتی کمتر از ۳۰ USDT است',
      ok: giftReceived < 30,
    },
    {
      label: 'بیش از ۶ روز از Gift گذشته یا قبلاً دریافت نشده است',
      ok: giftReceived === 0 || daysSinceGift > 6,
    },
    {
      label: 'ظرفیت فهرست Gift کمتر از ۵۰۰ است',
      ok: listSize < 500,
    },
  ];

  const distributeChecks = [
    {
      label: 'حساب دارای ID معتبر است',
      ok: id > 0,
    },
    {
      label: 'موجودی بانک حداقل ۳۶ USDT است',
      ok: balance >= 36,
    },
    {
      label: 'بیش از ۲۴ ساعت از Caller Reward گذشته است',
      ok: hoursSinceCaller > 24,
    },
    {
      label: 'مجموع Caller Reward کمتر از ۳۰ USDT است',
      ok: callerReward < 30,
    },
  ];

  return (
    <section
      style={{
        border: '1px solid #8885',
        borderRadius: 12,
        padding: 14,
        margin: '16px 0',
      }}
    >
      <h3>عملیات SmartGlobal</h3>

      <p>
        این بخش شرایط اولیه را نشان می‌دهد.
        نتیجه شبیه‌سازی قرارداد برای امکان اجرای عملیات مهم است.
      </p>

      <hr />

      <h4>Gift</h4>

      {giftChecks.map((item, index) => (
        <Check
          key={index}
          label={item.label}
          ok={item.ok}
        />
      ))}

      <p>
        حالت Gift: <b>{giftMode}</b>
      </p>

      <p>
        موجودی Gift دریافتی: {giftReceived.toFixed(4)} USDT
      </p>

      <button
        disabled={
          busy ||
          !enabled ||
          giftMode !== 'MANUAL' ||
          !giftSimulation.data?.request
        }
        onClick={() =>
          sendAction(giftSimulation, 'Gift', giftMode)
        }
      >
        {busy ? 'لطفاً صبر کنید...' : 'ثبت‌نام در Gift'}
      </button>

      <hr />

      <h4>Distribute</h4>

      {distributeChecks.map((item, index) => (
        <Check
          key={index}
          label={item.label}
          ok={item.ok}
        />
      ))}

      <p>
        حالت Distribute: <b>{distributeMode}</b>
      </p>

      <p>
        موجودی بانک: {balance.toFixed(4)} USDT
      </p>

      <button
        disabled={
          busy ||
          !enabled ||
          distributeMode !== 'MANUAL' ||
          !distributeSimulation.data?.request
        }
        onClick={() =>
          sendAction(
            distributeSimulation,
            'Distribute',
            distributeMode
          )
        }
      >
        {busy ? 'لطفاً صبر کنید...' : 'اجرای Distribute'}
      </button>

      {message && (
        <p
          style={{
            overflowWrap: 'anywhere',
            fontSize: 13,
            marginTop: 14,
          }}
        >
          {message}
        </p>
      )}

      <hr />

      <p style={{ fontSize: 12, opacity: 0.8 }}>
        حالت AUTO فقط اطلاعات و شبیه‌سازی را هر ۳۰ ثانیه تازه می‌کند.
        هیچ تراکنشی به‌صورت خودکار ارسال نمی‌شود.
        پیش از تأیید هر تراکنش، شبکه، آدرس قرارداد،
        مقدار و جزئیات آن را در کیف پول بررسی کنید.
      </p>
    </section>
  );
}
