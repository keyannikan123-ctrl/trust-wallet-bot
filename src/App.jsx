import React, { useState } from 'react';

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';

import {
  useBalance,
  useReadContract
} from 'wagmi';

import { formatUnits } from 'viem';

const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';

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

function getField(data, name, index) {
  if (!data) return undefined;
  return data[name] ?? data[index];
}

function Value({ title, value, loading, error }) {
  return (
    <div className="info-row">
      <span>{title}</span>
      <strong>
        {loading
          ? 'در حال دریافت...'
          : error
            ? 'خطا در دریافت'
            : value !== undefined && value !== null
              ? String(value)
              : 'دریافت نشد'}
      </strong>
    </div>
  );
}

function BalanceCard({ title, value, symbol, loading, error }) {
  return (
    <div className="balance-card">
      <span className="balance-symbol">{symbol}</span>
      <span className="balance-title">{title}</span>
      <strong>
        {loading
          ? '...'
          : error
            ? 'خطا'
            : value ?? '0'}
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

  // موجودی BNB
  const {
    data: bnb,
    isLoading: bnbLoading,
    error: bnbError,
    refetch: refetchBnb
  } = useBalance({
    address,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address && correctNetwork)
    }
  });

  // موجودی USDT
  const {
    data: usdt,
    isLoading: usdtLoading,
    error: usdtError,
    refetch: refetchUsdt
  } = useBalance({
    address,
    token: USDT,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address && correctNetwork)
    }
  });

  // موجودی SGT
  const {
    data: sgt,
    isLoading: sgtLoading,
    error: sgtError,
    refetch: refetchSgt
  } = useBalance({
    address,
    token: SGT,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address && correctNetwork)
    }
  });

  // اطلاعات حساب
  const {
    data: owner,
    isLoading: ownerLoading,
    error: ownerError,
    refetch: refetchOwner
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    account: address,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address && correctNetwork),
      retry: 2
    }
  });

  const rawAccountId = getField(owner, 'ID', 0);

  const accountId =
    rawAccountId !== undefined && rawAccountId !== null
      ? BigInt(rawAccountId)
      : undefined;

  const {
    data: personalInfo,
    isLoading: accountLoading,
    error: accountError,
    refetch: refetchPersonal
  } = useReadContract({
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
        isConnected &&
        address &&
        correctNetwork &&
        accountId !== undefined &&
        accountId > 0n
      ),
      retry: 2
    }
  });

  // اطلاعات عمومی
  const {
    data: giftRound,
    isLoading: giftLoading,
    refetch: refetchGift
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: '_currentGiftRound',
    chainId: 56
  });

  const {
    data: giftSize,
    isLoading: sizeLoading,
    refetch: refetchSize
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'giftListSize',
    chainId: 56
  });

  const {
    data: tokenBalance,
    isLoading: tokenLoading,
    refetch: refetchToken
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'globalTokenBalance',
    chainId: 56
  });

  const {
    data: contractUsdt,
    isLoading: usdtContractLoading,
    refetch: refetchContractUsdt
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'usdtBalance',
    chainId: 56
  });

  const {
    data: proposal,
    refetch: refetchProposal
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'currentProposalStatus',
    chainId: 56
  });

  // به‌روزرسانی اطلاعات فقط با خواندن بلاک‌چین
  async function refreshAll() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await Promise.allSettled([
        refetchBnb(),
        refetchUsdt(),
        refetchSgt(),
        refetchOwner(),
        refetchPersonal(),
        refetchGift(),
        refetchSize(),
        refetchToken(),
        refetchContractUsdt(),
        refetchProposal()
      ]);

      setLastUpdated(
        new Date().toLocaleTimeString('fa-AF')
      );
    } finally {
      setRefreshing(false);
    }
  }

  const bnbValue = bnb?.formatted
    ? Number(bnb.formatted).toFixed(6)
    : '0';

  const usdtValue = usdt
    ? Number(formatUnits(usdt.value, usdt.decimals)).toFixed(4)
    : '0';

  const sgtValue = sgt
    ? Number(formatUnits(sgt.value, sgt.decimals)).toFixed(4)
    : '0';

  return (
    <main className="app">

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f5f9;
          font-family: Tahoma, Arial, sans-serif;
          direction: rtl;
        }

        .app {
          max-width: 760px;
          margin: auto;
          padding: 18px;
          color: #172033;
        }

        .header {
          background: linear-gradient(135deg, #102a43, #176b87);
          color: white;
          padding: 27px 20px;
          border-radius: 20px;
          text-align: center;
          margin-bottom: 18px;
        }

        .header h1 {
          margin: 0 0 10px;
          font-size: 25px;
        }

        .header p {
          margin: 0;
          color: #dbeafe;
        }

        .panel {
          background: white;
          padding: 18px;
          border-radius: 16px;
          margin-bottom: 16px;
          box-shadow: 0 3px 14px rgba(0,0,0,.05);
        }

        .panel h3 {
          margin-top: 0;
          color: #176b87;
          font-size: 18px;
        }

        .connect-button,
        .refresh-button {
          border: none;
          border-radius: 12px;
          padding: 13px 18px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
        }

        .connect-button {
          background: #0f766e;
          color: white;
        }

        .refresh-button {
          background: #176b87;
          color: white;
        }

        button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .wallet-address {
          direction: ltr;
          text-align: left;
          overflow-wrap: anywhere;
          background: #f1f5f9;
          padding: 12px;
          border-radius: 9px;
          font-size: 12px;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .balance-card {
          background: #f0fdfa;
          border: 1px solid #ccfbf1;
          padding: 13px 7px;
          border-radius: 13px;
          text-align: center;
          min-width: 0;
        }

        .balance-symbol {
          display: block;
          font-size: 24px;
          margin-bottom: 8px;
        }

        .balance-title {
          display: block;
          font-size: 13px;
          color: #475569;
          margin-bottom: 8px;
        }

        .balance-card strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid #edf2f7;
          font-size: 13px;
        }

        .info-row strong {
          text-align: left;
          overflow-wrap: anywhere;
        }

        .notice {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          border-radius: 12px;
          padding: 15px;
          font-size: 13px;
          line-height: 2;
          text-align: center;
        }

        .status {
          color: #047857;
          font-size: 13px;
        }

        .warning {
          color: #b45309;
          background: #fffbeb;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
        }

        .updated {
          color: #64748b;
          font-size: 12px;
          text-align: center;
          margin-top: 10px;
        }

        @media (max-width: 420px) {
          .app {
            padding: 11px;
          }

          .balance-grid {
            gap: 6px;
          }

          .balance-card {
            padding: 12px 4px;
          }

          .balance-card strong {
            font-size: 11px;
          }

          .info-row {
            font-size: 12px;
          }
        }
      `}</style>

      <header className="header">
        <h1>Trust Wallet Bot</h1>
        <p>SmartGlobal Dashboard</p>
        <p>BNB Smart Chain</p>
      </header>

      <section className="panel">
        <h3>کیف پول</h3>

        <p className="status">
          {isConnected
            ? '● کیف پول متصل است'
            : '● کیف پول متصل نیست'}
        </p>

        <button
          className="connect-button"
          onClick={() => open()}
        >
          {isConnected
            ? 'مدیریت اتصال کیف پول'
            : 'اتصال کیف پول'}
        </button>

        {isConnected && (
          <>
            <p>آدرس کیف پول:</p>
            <div className="wallet-address">
              {address}
            </div>

            <Value
              title="شناسه شبکه"
              value={chainId}
            />

            {!correctNetwork && (
              <p className="warning">
                لطفاً شبکه BNB Smart Chain را انتخاب کنید.
              </p>
            )}
          </>
        )}
      </section>

      {isConnected && correctNetwork && (
        <>
          <section className="panel">
            <h3>موجودی دارایی‌ها</h3>

            <div className="balance-grid">
              <BalanceCard
                title="BNB"
                symbol="🟡"
                value={bnbValue}
                loading={bnbLoading}
                error={bnbError}
              />

              <BalanceCard
                title="USDT"
                symbol="💵"
                value={usdtValue}
                loading={usdtLoading}
                error={usdtError}
              />

              <BalanceCard
                title="SGT"
                symbol="🪙"
                value={sgtValue}
                loading={sgtLoading}
                error={sgtError}
              />
            </div>
          </section>

          <section className="panel">
            <h3>شناسه حساب SmartGlobal</h3>

            <Value
              title="شناسه حساب"
              value={
                accountId !== undefined && accountId > 0n
                  ? accountId.toString()
                  : undefined
              }
              loading={ownerLoading}
              error={ownerError}
            />

            {ownerError && (
              <p className="warning">
                خطا: {ownerError.shortMessage || ownerError.message}
              </p>
            )}
          </section>

          <section className="panel">
            <h3>اطلاعات حساب شخصی</h3>

            {personalInfo ? (
              <>
                <Value
                  title="مجموع Gift دریافتی"
                  value={getField(personalInfo, 'Total_Gift_Received_USDT', 0)?.toString()}
                />

                <Value
                  title="روز از آخرین Gift"
                  value={getField(personalInfo, 'Days_Passed_Since_Last_Gift', 1)?.toString()}
                />

                <Value
                  title="توکن رایگان دریافت شده"
                  value={getField(personalInfo, 'Has_Received_Free_Token', 2) ? 'بله' : 'خیر'}
                />

                <Value
                  title="مجموع پاداش Caller"
                  value={getField(personalInfo, 'Caller_Reward_Total_USDT', 3)?.toString()}
                />

                <Value
                  title="ساعت از آخرین Caller"
                  value={getField(personalInfo, 'Hours_Passed_Since_Last_Caller', 4)?.toString()}
                />

                <Value
                  title="ساعت از آخرین خرید"
                  value={getField(personalInfo, 'Hours_Passed_Since_Last_Buy', 5)?.toString()}
                />

                {[6, 7, 8, 9].map((index) => (
                  <Value
                    key={index}
                    title={`پاداش Tier ${index - 5}`}
                    value={
                      getField(personalInfo, [
                        'Claimed_Tier_1_Reward',
                        'Claimed_Tier_2_Reward',
                        'Claimed_Tier_3_Reward',
                        'Claimed_Tier_4_Reward'
                      ][index - 6], index)
                        ? 'دریافت شده'
                        : 'دریافت نشده'
                    }
                  />
                ))}
              </>
            ) : (
              <p>
                {accountLoading
                  ? 'در حال دریافت اطلاعات...'
                  : accountError
                    ? 'اطلاعات حساب دریافت نشد.'
                    : 'اطلاعات حساب موجود نیست.'}
              </p>
            )}
          </section>

          <section className="panel">
            <h3>اطلاعات عمومی Gift</h3>

            <Value
              title="دور فعلی Gift"
              value={giftRound?.toString()}
              loading={giftLoading}
            />

            <Value
              title="اندازه فهرست Gift"
              value={giftSize?.toString()}
              loading={sizeLoading}
            />

            <Value
              title="موجودی Global Token"
              value={tokenBalance?.toString()}
              loading={tokenLoading}
            />

            <Value
              title="موجودی USDT قرارداد"
              value={contractUsdt?.toString()}
              loading={usdtContractLoading}
            />
          </section>

          <section className="panel">
            <h3>وضعیت پیشنهادها</h3>

            {proposal && (
              <>
                <Value
                  title="آدرس هدف"
                  value={getField(proposal, 'target', 0)}
                />

                <Value
                  title="نوع پیشنهاد"
                  value={getField(proposal, 'pType', 1)}
                />

                <Value
                  title="رأی 300"
                  value={getField(proposal, 'votes300', 2)?.toString()}
                />

                <Value
                  title="رأی 100"
                  value={getField(proposal, 'votes100', 3)?.toString()}
                />

                <Value
                  title="مرحله"
                  value={getField(proposal, 'stage', 4)}
                />
              </>
            )}
          </section>

          <section className="panel">
            <h3>به‌روزرسانی اطلاعات</h3>

            <button
              className="refresh-button"
              onClick={refreshAll}
              disabled={refreshing}
            >
              {refreshing
                ? 'در حال به‌روزرسانی...'
                : '↻ به‌روزرسانی اطلاعات'}
            </button>

            <p className="updated">
              آخرین به‌روزرسانی: {lastUpdated || 'هنوز انجام نشده'}
            </p>
          </section>
        </>
      )}

      <div className="notice">
        🔒 این برنامه فقط اطلاعات عمومی بلاک‌چین و حساب متصل‌شده را می‌خواند.
        <br />
        هیچ انتقال پول، امضا، تأیید دسترسی یا تراکنشی انجام نمی‌دهد.
      </div>

    </main>
  );
}
