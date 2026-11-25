
import React, { useState } from 'react';
import { useSimulateContract } from 'wagmi';

import { CHAIN_ID, CONTRACTS } from './contracts/addresses';
import { bankAbi, payAbi } from './contracts/abi';
import { tok } from './utils/format';

function errorText(error) {
  if (!error) return '';

  return (
    error.shortMessage ||
    error.cause?.shortMessage ||
    error.message ||
    'خطای نامشخص'
  );
}

function SimulationStatus({ simulation, label }) {
  if (simulation.isFetching || simulation.isPending) {
    return <p className="muted">{label}: در حال بررسی قرارداد...</p>;
  }

  if (simulation.isError) {
    return (
      <div className="notice" style={{ overflowWrap: 'anywhere' }}>
        <b>{label}: شرایط فعلاً تأیید نشد.</b>
        <p>{errorText(simulation.error)}</p>
      </div>
    );
  }

  if (simulation.data?.request) {
    return (
      <div className="notice">
        <b>{label}: شبیه‌سازی موفق بود.</b>
        <p>
          قرارداد در زمان بررسی خطای اجرایی برنگرداند.
          این نتیجه تضمین پرداخت یا موفقیت تراکنش نیست.
        </p>
      </div>
    );
  }

  return (
    <p className="muted">
      {label}: هنوز نتیجهٔ قابل تأییدی دریافت نشده است.
    </p>
  );
}

function ActionPanel({
  title,
  mode,
  simulation,
  description,
}) {
  const [checking, setChecking] = useState(false);

  async function checkAgain() {
    if (!simulation.refetch || checking) return;

    try {
      setChecking(true);
      await simulation.refetch();
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid #8885',
        borderRadius: 12,
        padding: 14,
        margin: '14px 0',
      }}
    >
      <h4>{title}</h4>

      <p>{description}</p>

      <p>
        حالت فعلی: <b>{mode}</b>
      </p>

      {mode === 'OFF' ? (
        <p className="muted">
          این بررسی خاموش است. برای فعال شدن بررسی، حالت MANUAL یا AUTO را انتخاب کن.
        </p>
      ) : (
        <>
          <SimulationStatus
            simulation={simulation}
            label={title}
          />

          {mode === 'MANUAL' && (
            <button
              type="button"
              disabled={checking || simulation.isFetching}
              onClick={checkAgain}
            >
              {checking || simulation.isFetching
                ? 'در حال بررسی...'
                : 'بررسی دوباره شرایط'}
            </button>
          )}

          {mode === 'AUTO' && (
            <p className="muted">
              بررسی خودکار هر ۳۰ ثانیه تازه می‌شود.
            </p>
          )}
        </>
      )}
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
  modes,
}) {
  const [info, setInfo] = useState('');

  const id = Number(accountId || 0);
  const connected = Boolean(enabled && address);
  const canCheckBank = connected && id > 0;

  const giftMode = modes?.gift || 'OFF';
  const distributeMode = modes?.distribute || 'OFF';
  const payMode = modes?.pay || 'OFF';

  const giftSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'registerForGift',
    args: [],
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(
        canCheckBank && giftMode !== 'OFF'
      ),
      refetchInterval:
        giftMode === 'AUTO' ? 30000 : false,
      retry: 1,
    },
  });

  const distributeSimulation = useSimulateContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'distributeBank',
    args: [],
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(
        canCheckBank && distributeMode !== 'OFF'
      ),
      refetchInterval:
        distributeMode === 'AUTO' ? 30000 : false,
      retry: 1,
    },
  });

  const paySimulation = useSimulateContract({
    address: CONTRACTS.PAY,
    abi: payAbi,
    functionName: 'payReward',
    args: [],
    account: address,
    chainId: CHAIN_ID,
    query: {
      enabled: Boolean(
        connected && payMode !== 'OFF'
      ),
      refetchInterval:
        payMode === 'AUTO' ? 30000 : false,
      retry: 1,
    },
  });

  const totalLeft = ownerData?.Total_Left ?? ownerData?.[1];
  const totalRight = ownerData?.Total_Right ?? ownerData?.[2];

  const giftReceived =
    giftData?.Total_Gift_Received_USDT ??
    giftData?.[0];

  const daysSinceGift =
    giftData?.Days_Passed_Since_Last_Gift ??
    giftData?.[1];

  const callerReward =
    giftData?.Caller_Reward_Total_USDT ??
    giftData?.[3];

  const hoursSinceCaller =
    giftData?.Hours_Passed_Since_Last_Caller ??
    giftData?.[4];

  const hoursSinceBuy =
    giftData?.Hours_Passed_Since_Last_Buy ??
    giftData?.[5];

  const numberText = (value) => {
    if (value === undefined || value === null) return '—';

    try {
      return BigInt(value).toString();
    } catch {
      return String(value);
    }
  };

  return (
    <section
      style={{
        border: '1px solid #8885',
        borderRadius: 12,
        padding: 14,
        margin: '16px 0',
      }}
    >
      <h3>بررسی عملیات SmartGlobal</h3>

      <p>
        این قسمت شرایط Gift، Distribute و Pay Reward را
        مستقیماً با شبیه‌سازی قرارداد بررسی می‌کند.
      </p>

      {!connected && (
        <div className="notice">
          برای بررسی اطلاعات، کیف پول را به شبکه BNB Smart Chain وصل کن.
        </div>
      )}

      {connected && Number(id) === 0 && (
        <div className="notice">
          برای Gift و Distribute، شناسهٔ حساب از قرارداد دریافت نشده است.
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <small>SmartGlobal ID</small>
          <b>{id || '—'}</b>
        </div>

        <div className="stat">
          <small>مجموع امتیاز Pay</small>
          <b>{numberText(pointsData)}</b>
        </div>

        <div className="stat">
          <small>چپ کل</small>
          <b>{numberText(totalLeft)}</b>
        </div>

        <div className="stat">
          <small>راست کل</small>
          <b>{numberText(totalRight)}</b>
        </div>

        <div className="stat">
          <small>Gift دریافتی USDT</small>
          <b>{tok(giftReceived)}</b>
        </div>

        <div className="stat">
          <small>روز از آخرین Gift</small>
          <b>{numberText(daysSinceGift)}</b>
        </div>

        <div className="stat">
          <small>Caller Reward USDT</small>
          <b>{tok(callerReward)}</b>
        </div>

        <div className="stat">
          <small>ساعت از آخرین Caller</small>
          <b>{numberText(hoursSinceCaller)}</b>
        </div>

        <div className="stat">
          <small>ساعت از آخرین خرید</small>
          <b>{numberText(hoursSinceBuy)}</b>
        </div>

        <div className="stat">
          <small>موجودی بانک USDT</small>
          <b>{tok(bankBalance)}</b>
        </div>

        <div className="stat">
          <small>اندازه فهرست Gift</small>
          <b>{numberText(giftListSize)}</b>
        </div>
      </div>

      <hr />

      <ActionPanel
        title="Gift"
        mode={giftMode}
        simulation={giftSimulation}
        description="بررسی ثبت‌نام Gift از طریق تابع registerForGift در قرارداد SmartGlobalBank."
      />

      <ActionPanel
        title="Distribute"
        mode={distributeMode}
        simulation={distributeSimulation}
        description="بررسی امکان اجرای distributeBank در قرارداد SmartGlobalBank."
      />

      <ActionPanel
        title="Pay Reward"
        mode={payMode}
        simulation={paySimulation}
        description="بررسی تابع payReward در قرارداد جداگانه SmartGlobalPay."
      />

      <hr />

      <div className="notice">
        <b>حفاظت از کیف پول</b>
        <p>
          این نسخه فقط اطلاعات را می‌خواند و شبیه‌سازی می‌کند.
          هیچ تراکنشی ارسال نمی‌شود، هیچ امضایی درخواست نمی‌شود
          و هیچ توکنی انتقال یا تأیید نمی‌شود.
        </p>
        <p>
          نتیجهٔ شبیه‌سازی فقط وضعیت قرارداد در همان لحظه است؛
          ممکن است شرایط بعداً تغییر کند.
        </p>
      </div>

      {info && <p className="muted">{info}</p>}
    </section>
  );
}
