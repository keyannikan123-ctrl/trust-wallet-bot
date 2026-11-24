
import React, { useEffect, useState } from 'react';
import { useSimulateContract, useWriteContract } from 'wagmi';
import { CHAIN_ID, CONTRACTS } from './contracts/addresses';
import { bankAbi } from './contracts/abi';

function Check({ label, ok }) {
  return (
    <div style={{ margin: '6px 0', fontSize: 14 }}>
      <span style={{ color: ok ? '#16a34a' : '#dc2626' }}>
        {ok ? '✓' : '✗'}
      </span>{' '}
      {label}
    </div>
  );
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
  modes
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const id = Number(accountId || 0);
  const giftReceived = Number(giftData?.Total_Gift_Received_USDT ?? 0);
  const daysSinceGift = Number(giftData?.Days_Passed_Since_Last_Gift ?? 0);
  const callerReward = Number(giftData?.Caller_Reward_Total_USDT ?? 0);
  const hoursSinceCaller = Number(giftData?.Hours_Passed_Since_Last_Caller ?? 0);
  const points = Number(pointsData?.data ?? pointsData ?? 0);
  const balance = Number(bankBalance ?? 0);
  const listSize = Number(giftListSize ?? 0);

  const giftMode = modes?.gift || 'OFF';
  const distributeMode = modes?.distribute || 'OFF';

  const giftSimulation = useSimulateContract({
    address: CONTRACTS.bank,
    abi: bankAbi,
    functionName: 'registerForGift',
    args: [],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(enabled && address && id > 0 && giftMode !== 'OFF'),
      refetchInterval: giftMode === 'AUTO' ? 30000 : false
    }
  });

  const distributeSimulation = useSimulateContract({
    address: CONTRACTS.bank,
    abi: bankAbi,
    functionName: 'distributeBank',
    args: [],
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(enabled && address && id > 0 && distributeMode !== 'OFF'),
      refetchInterval: distributeMode === 'AUTO' ? 30000 : false
    }
  });

  useEffect(() => {
    if (giftMode === 'AUTO' || distributeMode === 'AUTO') {
      setMessage('حالت AUTO فقط اطلاعات را هر ۳۰ ثانیه تازه می‌کند؛ هیچ تراکنشی خودکار ارسال نمی‌شود.');
    }
  }, [giftMode, distributeMode]);

  async function sendAction(simulation, label) {
    if (!enabled || !address) {
      setMessage('لطفاً ابتدا کیف پول را وصل کنید.');
      return;
    }

    if (busy) return;

    if (!simulation.data?.request) {
      setMessage('شرایط قرارداد تأیید نشده است. لطفاً اطلاعات و شرایط را بررسی کنید.');
      return;
    }

    try {
      setBusy(true);
      setMessage('در انتظار تأیید شما در کیف پول...');
      const result = await writeContractAsync(simulation.data.request);
      setMessage(`${label} ارسال شد. هش تراکنش: ${result}`);
    } catch (error) {
      setMessage(error?.shortMessage || error?.message || 'تراکنش انجام نشد یا لغو شد.');
    } finally {
      setBusy(false);
    }
  }

  const giftChecks = [
    { label: 'حساب دارای ID معتبر است', ok: id > 0 },
    { label: 'تعداد امتیازها صفر است', ok: points === 0 },
    { label: 'مجموع اعضای چپ و راست بیشتر از ۹ نیست', ok: points <= 9 },
    { label: 'کمتر از ۳۰ USDT گیفت دریافت شده', ok: giftReceived < 30 },
    { label: 'شش روز از گیفت گذشته یا قبلاً گیفت نگرفته‌اید', ok: giftReceived === 0 || daysSinceGift > 6 },
    { label: 'ظرفیت فهرست گیفت موجود است', ok: listSize < 500 }
  ];

  const distributeChecks = [
    { label: 'حساب دارای ID معتبر است', ok: id > 0 },
    { label: 'موجودی بانک حداقل ۳۶ USDT است', ok: balance >= 36 },
    { label: 'حداقل ۲۴ ساعت از پاداش قبلی گذشته است', ok: hoursSinceCaller > 24 },
    { label: 'مجموع پاداش دریافت‌شده کمتر از ۳۰ USDT است', ok: callerReward < 30 }
  ];

  return (
    <section style={{
      border: '1px solid #8885',
      borderRadius: 12,
      padding: 14,
      margin: '16px 0'
    }}>
      <h3>عملیات SmartGlobal</h3>

      <h4>Gift</h4>
      {giftChecks.map((item, index) => (
        <Check key={index} label={item.label} ok={item.ok} />
      ))}
      <p>حالت: {giftMode}</p>
      <button
        disabled={busy || giftMode !== 'MANUAL' || !giftSimulation.data?.request}
        onClick={() => sendAction(giftSimulation, 'Gift')}
      >
        ثبت‌نام در Gift
      </button>

      <hr />

      <h4>Distribute</h4>
      {distributeChecks.map((item, index) => (
        <Check key={index} label={item.label} ok={item.ok} />
      ))}
      <p>حالت: {distributeMode}</p>
      <button
        disabled={busy || distributeMode !== 'MANUAL' || !distributeSimulation.data?.request}
        onClick={() => sendAction(distributeSimulation, 'Distribute')}
      >
        اجرای Distribute
      </button>

      {message && (
        <p style={{ overflowWrap: 'anywhere', fontSize: 13 }}>
          {message}
        </p>
      )}

      <p style={{ fontSize: 12, opacity: 0.75 }}>
        AUTO فقط اطلاعات را تازه می‌کند و هیچ تراکنشی را خودکار ارسال نمی‌کند.
        پیش از تأیید هر تراکنش، جزئیات و مقدار آن را در کیف پول بررسی کنید.
      </p>
    </section>
  );
}
