import React, { useState } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';
import { useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';

const bankABI = [
  {
    type: 'function',
    name: '_currentGiftRound',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'giftListSize',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'globalTokenBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'usdtBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'ownerInfo',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ID', type: 'uint64' },
      { name: 'Total_Left', type: 'uint32' },
      { name: 'Total_Right', type: 'uint32' },
      { name: 'Current_Left', type: 'uint32' },
      { name: 'Current_Right', type: 'uint32' },
      { name: 'Directs_Count', type: 'uint8' },
      { name: 'Is_Right_Side', type: 'bool' },
      { name: 'UpLine_Address', type: 'address' },
      { name: 'Left_Address', type: 'address' },
      { name: 'Right_Address', type: 'address' }
    ]
  },
  {
    type: 'function',
    name: 'ownerBankInfo',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint64' }],
    outputs: [
      { name: 'Total_Gift_Received_USDT', type: 'uint256' },
      { name: 'Days_Passed_Since_Last_Gift', type: 'uint256' },
      { name: 'Has_Received_Free_Token', type: 'bool' },
      { name: 'Caller_Reward_Total_USDT', type: 'uint256' },
      { name: 'Hours_Passed_Since_Last_Caller', type: 'uint256' },
      { name: 'Hours_Passed_Since_Last_Buy', type: 'uint256' },
      { name: 'Claimed_Tier_1_Reward', type: 'bool' },
      { name: 'Claimed_Tier_2_Reward', type: 'bool' },
      { name: 'Claimed_Tier_3_Reward', type: 'bool' },
      { name: 'Claimed_Tier_4_Reward', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'currentProposalStatus',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'target', type: 'address' },
      { name: 'pType', type: 'uint8' },
      { name: 'votes300', type: 'uint256' },
      { name: 'votes100', type: 'uint256' },
      { name: 'stage', type: 'uint8' }
    ]
  }
];

const payABI = [
  {
    type: 'function',
    name: 'ownerStatus',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [{ type: 'bool' }]
  },
  {
    type: 'function',
    name: 'ownerAllPoint',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint32' }]
  },
  {
    type: 'function',
    name: 'lastRewardTimePassed',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'justContractBalance',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'newOwnerStatus',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastTotalPoint',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint32' }]
  },
  {
    type: 'function',
    name: 'lastValuePoint',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  }
];

function field(data, name, index) {
  if (!data) return undefined;
  return data[name] ?? data[index];
}

function Value({ title, value, loading, error }) {
  let shown = 'دریافت نشد';

  if (loading) shown = 'در حال دریافت...';
  else if (error) shown = 'خطا در دریافت';
  else if (value !== undefined && value !== null) {
    shown = String(value);
  }

  return (
    <div className="info-row">
      <span>{title}</span>
      <strong>{shown}</strong>
    </div>
  );
}

function BalanceCard({ title, symbol, value, loading, error }) {
  return (
    <div className="balance-card">
      <span className="balance-symbol">{symbol}</span>
      <span className="balance-title">{title}</span>
      <strong>
        {loading ? '...' : error ? 'خطا' : value ?? '0'}
      </strong>
    </div>
  );
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const correctNetwork = Number(chainId) === 56;
  const enabled = Boolean(isConnected && address && correctNetwork);

  const bnbQuery = useBalance({
    address,
    chainId: 56,
    query: { enabled }
  });

  const usdtQuery = useBalance({
    address,
    token: USDT,
    chainId: 56,
    query: { enabled }
  });

  const sgtQuery = useBalance({
    address,
    token: SGT,
    chainId: 56,
    query: { enabled }
  });

  const ownerQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    account: address,
    chainId: 56,
    query: { enabled, retry: 2 }
  });

  const rawId = field(ownerQuery.data, 'ID', 0);

  const accountId =
    rawId !== undefined && rawId !== null
      ? BigInt(rawId)
      : undefined;

  const personalQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerBankInfo',
    args:
      accountId !== undefined && accountId > 0n
        ? [accountId]
        : undefined,
    account: address,
    chainId: 56,
    query: {
      enabled: Boolean(
        enabled && accountId !== undefined && accountId > 0n
      ),
      retry: 2
    }
  });

  const giftRoundQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: '_currentGiftRound',
    chainId: 56
  });

  const giftSizeQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'giftListSize',
    chainId: 56
  });

  const tokenBalanceQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'globalTokenBalance',
    chainId: 56
  });

  const bankUsdtQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'usdtBalance',
    chainId: 56
  });

  const proposalQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'currentProposalStatus',
    chainId: 56
  });

  const payMemberQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerStatus',
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled }
  });

  const payPointsQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerAllPoint',
    args: address ? [address] : undefined,
    account: address,
    chainId: 56,
    query: { enabled, retry: 2 }
  });

  const rewardHoursQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'lastRewardTimePassed',
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled }
  });

  const payBalanceQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'justContractBalance',
    chainId: 56
  });

  const pendingOwnersQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'newOwnerStatus',
    chainId: 56
  });

  const lastTotalPointsQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'lastTotalPoint',
    chainId: 56
  });

  const lastPointValueQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'lastValuePoint',
    chainId: 56
  });

  async function refreshAll() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      const queries = [
        bnbQuery,
        usdtQuery,
        sgtQuery,
        ownerQuery,
        personalQuery,
        giftRoundQuery,
        giftSizeQuery,
        tokenBalanceQuery,
        bankUsdtQuery,
        proposalQuery,
        payMemberQuery,
        payPointsQuery,
        rewardHoursQuery,
        payBalanceQuery,
        pendingOwnersQuery,
        lastTotalPointsQuery,
        lastPointValueQuery
      ];

      await Promise.allSettled(
        queries.map(q => q.refetch())
      );

      setLastUpdated(
        new Date().toLocaleTimeString('fa-AF')
      );
    } finally {
      setRefreshing(false);
    }
  }

  const bnbValue = bnbQuery.data?.formatted
    ? Number(bnbQuery.data.formatted).toFixed(6)
    : '0';

  const usdtValue = usdtQuery.data
    ? Number(
        formatUnits(
          usdtQuery.data.value,
          usdtQuery.data.decimals
        )
      ).toFixed(4)
    : '0';

  const sgtValue = sgtQuery.data
    ? Number(
        formatUnits(
          sgtQuery.data.value,
          sgtQuery.data.decimals
        )
      ).toFixed(4)
    : '0';

  const personal = personalQuery.data;
  const proposal = proposalQuery.data;

  return (
    <main className="app">
      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #101827;
          color: #f1f5f9;
          font-family: Arial, sans-serif;
        }

        .app {
          max-width: 850px;
          margin: auto;
          padding: 20px;
        }

        header {
          text-align: center;
          padding: 20px 0;
        }

        h1 {
          color: #facc15;
          margin-bottom: 8px;
        }

        h2 {
          color: #facc15;
          font-size: 19px;
          border-bottom: 1px solid #334155;
          padding-bottom: 10px;
        }

        h3 {
          color: #fde68a;
          font-size: 16px;
          margin-top: 22px;
        }

        .panel {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 14px;
          padding: 16px;
          margin: 15px 0;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .balance-card {
          background: #263449;
          border-radius: 12px;
          padding: 14px 5px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-wrap: anywhere;
        }

        .balance-symbol { font-size: 24px; }
        .balance-title { color: #cbd5e1; }
        .balance-card strong { color: #facc15; }

        .info-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #334155;
          overflow-wrap: anywhere;
        }

        .info-row span { color: #cbd5e1; }

        .info-row strong {
          text-align: right;
          color: #facc15;
          max-width: 55%;
          overflow-wrap: anywhere;
        }

        button {
          border: 0;
          border-radius: 10px;
          padding: 13px 18px;
          background: #eab308;
          color: #111827;
          font-weight: bold;
          font-size: 15px;
          cursor: pointer;
        }

        button:disabled { opacity: .6; }

        .connect {
          display: block;
          width: 100%;
          margin: 15px 0;
        }

        .muted {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.7;
        }

        .warning {
          background: #422006;
          color: #fde68a;
          padding: 12px;
          border-radius: 10px;
          line-height: 1.8;
          font-size: 13px;
        }

        .status { color: #86efac; }
        .error-text { color: #fca5a5; }

        @media(max-width: 520px) {
          .app { padding: 12px; }
          .balance-grid { grid-template-columns: 1fr; }
          .info-row { font-size: 13px; }
        }
      `}</style>

      <header>
        <h1>Trust Wallet Bot</h1>
        <p>SmartGlobal Dashboard</p>
        <p className="muted">
          BNB Smart Chain · Read Only
        </p>
      </header>

      <section className="panel">
        <h2>اتصال کیف پول</h2>

        <p className={isConnected ? 'status' : 'muted'}>
          {isConnected
            ? '● کیف پول متصل است'
            : '● کیف پول متصل نیست'}
        </p>

        <button
          className="connect"
          onClick={() => open()}
        >
          {isConnected
            ? 'مدیریت اتصال کیف پول'
            : 'اتصال کیف پول'}
        </button>

        {isConnected && (
          <>
            <Value title="آدرس کیف پول" value={address} />
            <Value title="شناسه شبکه" value={chainId} />
          </>
        )}

        {isConnected && !correctNetwork && (
          <p className="warning">
            لطفاً شبکه کیف پول را روی BNB Smart Chain قرار دهید.
          </p>
        )}
      </section>

      {isConnected && correctNetwork && (
        <>
          <section className="panel">
            <h2>موجودی دارایی‌ها</h2>

            <div className="balance-grid">
              <BalanceCard
                title="BNB"
                symbol="🟡"
                value={bnbValue}
                loading={bnbQuery.isLoading}
                error={bnbQuery.isError}
              />

              <BalanceCard
                title="USDT"
                symbol="💵"
                value={usdtValue}
                loading={usdtQuery.isLoading}
                error={usdtQuery.isError}
              />

              <BalanceCard
                title="SGT"
                symbol="🪙"
                value={sgtValue}
                loading={sgtQuery.isLoading}
                error={sgtQuery.isError}
              />
            </div>
          </section>

          <section className="panel">
            <h2>اطلاعات حساب SmartGlobal</h2>

            <Value
              title="شناسه حساب"
              value={accountId?.toString()}
            />

            <Value
              title="مجموع سمت چپ"
              value={field(ownerQuery.data, 'Total_Left', 1)}
              loading={ownerQuery.isLoading}
              error={ownerQuery.isError}
            />

            <Value
              title="مجموع سمت راست"
              value={field(ownerQuery.data, 'Total_Right', 2)}
              loading={ownerQuery.isLoading}
              error={ownerQuery.isError}
            />

            <Value
              title="تعداد افراد مستقیم"
              value={field(ownerQuery.data, 'Directs_Count', 5)}
              loading={ownerQuery.isLoading}
              error={ownerQuery.isError}
            />
          </section>

          <section className="panel">
            <h2>اطلاعات Gift</h2>

            <Value
              title="دور فعلی Gift"
              value={giftRoundQuery.data?.toString()}
              loading={giftRoundQuery.isLoading}
              error={giftRoundQuery.isError}
            />

            <Value
              title="تعداد اعضای فهرست Gift"
              value={giftSizeQuery.data?.toString()}
              loading={giftSizeQuery.isLoading}
              error={giftSizeQuery.isError}
            />

            <Value
              title="موجودی کلی توکن (مقدار خام)"
              value={tokenBalanceQuery.data?.toString()}
              loading={tokenBalanceQuery.isLoading}
              error={tokenBalanceQuery.isError}
            />

            <Value
              title="موجودی USDT قرارداد (مقدار خام)"
              value={bankUsdtQuery.data?.toString()}
              loading={bankUsdtQuery.isLoading}
              error={bankUsdtQuery.isError}
            />
          </section>

          <section className="panel">
            <h2>اطلاعات شخصی Gift و پاداش</h2>

            <Value
              title="مجموع Gift دریافت‌شده (مقدار خام)"
              value={field(personal, 'Total_Gift_Received_USDT', 0)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="روزهای گذشته از آخرین Gift"
              value={field(personal, 'Days_Passed_Since_Last_Gift', 1)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="توکن رایگان دریافت شده"
              value={
                field(personal, 'Has_Received_Free_Token', 2) === undefined
                  ? undefined
                  : field(personal, 'Has_Received_Free_Token', 2)
                    ? 'بله'
                    : 'خیر'
              }
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="مجموع پاداش تماس‌گیرنده (مقدار خام)"
              value={field(personal, 'Caller_Reward_Total_USDT', 3)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="ساعت گذشته از آخرین فعالیت"
              value={field(personal, 'Hours_Passed_Since_Last_Caller', 4)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />
          </section>

          <section className="panel">
            <h2>اطلاعات SmartGlobalPay</h2>

            <Value
              title="عضویت در Pay"
              value={
                payMemberQuery.data === undefined
                  ? undefined
                  : payMemberQuery.data ? 'بله' : 'خیر'
              }
              loading={payMemberQuery.isLoading}
              error={payMemberQuery.isError}
            />

            <Value
              title="امتیازهای حساب"
              value={payPointsQuery.data?.toString()}
              loading={payPointsQuery.isLoading}
              error={payPointsQuery.isError}
            />

            <Value
              title="ساعت گذشته از آخرین پاداش"
              value={rewardHoursQuery.data?.toString()}
              loading={rewardHoursQuery.isLoading}
              error={rewardHoursQuery.isError}
            />

            <Value
              title="موجودی قرارداد Pay (مقدار خام)"
              value={payBalanceQuery.data?.toString()}
              loading={payBalanceQuery.isLoading}
              error={payBalanceQuery.isError}
            />

            <Value
              title="اعضای جدید در انتظار پردازش"
              value={pendingOwnersQuery.data?.toString()}
              loading={pendingOwnersQuery.isLoading}
              error={pendingOwnersQuery.isError}
            />

            <Value
              title="مجموع امتیاز آخرین توزیع"
              value={lastTotalPointsQuery.data?.toString()}
              loading={lastTotalPointsQuery.isLoading}
              error={lastTotalPointsQuery.isError}
            />

            <Value
              title="ارزش آخرین امتیاز"
              value={lastPointValueQuery.data?.toString()}
              loading={lastPointValueQuery.isLoading}
              error={lastPointValueQuery.isError}
            />
          </section>

          <section className="panel">
            <h2>بررسی شرایط عملیات SmartGlobal</h2>

            <p className="muted">
              این بخش فقط اطلاعات خواندنی را بررسی می‌کند و هیچ تراکنشی انجام نمی‌دهد.
            </p>

            <h3>۱. شرایط ثبت‌نام Gift</h3>

            <Value
              title="تعداد اعضای فهرست Gift (حداکثر ۵۰۰)"
              value={giftSizeQuery.data?.toString()}
              loading={giftSizeQuery.isLoading}
              error={giftSizeQuery.isError}
            />

            <Value
              title="روزهای گذشته از آخرین Gift (بیشتر از ۶ روز)"
              value={field(personal, 'Days_Passed_Since_Last_Gift', 1)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="مجموع Gift دریافت‌شده (مقدار خام)"
              value={field(personal, 'Total_Gift_Received_USDT', 0)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="امتیازهای حساب (باید صفر باشد)"
              value={payPointsQuery.data?.toString()}
              loading={payPointsQuery.isLoading}
              error={payPointsQuery.isError}
            />

            <p className="warning">
              نتیجه قطعی نیست؛ بعضی شرایط داخلی قرارداد از اطلاعات عمومی قابل بررسی نیست.
            </p>

            <h3>۲. شرایط توزیع Gift</h3>

            <Value
              title="موجودی USDT قرارداد Bank (مقدار خام)"
              value={bankUsdtQuery.data?.toString()}
              loading={bankUsdtQuery.isLoading}
              error={bankUsdtQuery.isError}
            />

            <Value
              title="ساعت گذشته از آخرین فعالیت تماس‌گیرنده"
              value={field(personal, 'Hours_Passed_Since_Last_Caller', 4)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <Value
              title="مجموع پاداش تماس‌گیرنده (مقدار خام)"
              value={field(personal, 'Caller_Reward_Total_USDT', 3)?.toString()}
              loading={personalQuery.isLoading}
              error={personalQuery.isError}
            />

            <p className="warning">
              توزیع Gift یک عملیات سراسری است و روی اعضای دیگر هم اثر می‌گذارد.
            </p>

            <h3>۳. شرایط Pay Reward</h3>

            <Value
              title="عضویت در Pay"
              value={
                payMemberQuery.data === undefined
                  ? undefined
                  : payMemberQuery.data ? 'بله' : 'خیر'
              }
              loading={payMemberQuery.isLoading}
              error={payMemberQuery.isError}
            />

            <Value
              title="امتیازهای حساب"
              value={payPointsQuery.data?.toString()}
              loading={payPointsQuery.isLoading}
              error={payPointsQuery.isError}
            />

            <Value
              title="ساعت گذشته از آخرین پاداش شخصی"
              value={rewardHoursQuery.data?.toString()}
              loading={rewardHoursQuery.isLoading}
              error={rewardHoursQuery.isError}
            />

            <Value
              title="موجودی قرارداد Pay (مقدار خام)"
              value={payBalanceQuery.data?.toString()}
              loading={payBalanceQuery.isLoading}
              error={payBalanceQuery.isError}
            />

            <p className="warning">
              شرایط داخلی و زمان آخرین توزیع سراسری کاملاً قابل مشاهده نیست؛
              این بخش صلاحیت نهایی را تضمین نمی‌کند.
            </p>

            <p className="muted">
              هیچ دکمه اجرا، پرداخت یا حالت خودکار در این نسخه وجود ندارد.
            </p>
          </section>

          <section className="panel">
            <h2>وضعیت پیشنهاد قرارداد</h2>

            <Value
              title="آدرس هدف"
              value={field(proposal, 'target', 0)}
              loading={proposalQuery.isLoading}
              error={proposalQuery.isError}
            />

            <Value
              title="نوع پیشنهاد"
              value={field(proposal, 'pType', 1)?.toString()}
            />

            <Value
              title="مرحله پیشنهاد"
              value={field(proposal, 'stage', 4)?.toString()}
            />
          </section>

          <section className="panel">
            <button
              className="connect"
              onClick={refreshAll}
              disabled={refreshing}
            >
              {refreshing
                ? 'در حال تازه‌سازی...'
                : 'تازه‌سازی اطلاعات'}
            </button>

            {lastUpdated && (
              <p className="muted">
                آخرین تازه‌سازی: {lastUpdated}
              </p>
            )}
          </section>
        </>
      )}

      <section className="panel">
        <p className="warning">
          این برنامه فقط اطلاعات عمومی و خواندنی قراردادها را نمایش می‌دهد.
          هیچ انتقال، پرداخت، تأیید یا برداشتی انجام نمی‌دهد.
          نمایش اطلاعات به معنی تضمین پاداش، درآمد یا اعتبار پروژه نیست.
          عبارت بازیابی و کلید خصوصی کیف پول خود را در اختیار هیچ‌کس قرار ندهید.
        </p>
      </section>
    </main>
  );
}
