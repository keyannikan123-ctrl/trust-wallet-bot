import React, { useState, useEffect } from 'react';

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';

import {
  useBalance,
  useReadContract,
  useSimulateContract
} from 'wagmi';

import { formatUnits } from 'viem';

const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';

const bankABI = [
  { type: 'function', name: '_currentGiftRound', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'giftListSize', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'globalTokenBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdtBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'ownerInfo', stateMutability: 'view',
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
    type: 'function', name: 'ownerBankInfo', stateMutability: 'view',
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
  { type: 'function', name: 'distributeBank', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function', name: 'currentProposalStatus', stateMutability: 'view',
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
  { type: 'function', name: 'payReward', stateMutability: 'nonpayable', inputs: [], outputs: [] },
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
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'newOwnerStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastTotalPoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastValuePoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
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
  }
];

function field(data, name, index) {
  if (!data) return undefined;
  return data[name] ?? data[index];
}

function getErrorMessage(error) {
  if (!error) return '';
  return error.shortMessage ||
    error.details ||
    error.cause?.shortMessage ||
    error.cause?.message ||
        error.message ||
    'خطای نامشخص';
}

function fmt(value, decimals = 18, digits = 4) {
  if (value === undefined || value === null) return '—';

  try {
    const number = Number(formatUnits(BigInt(value), decimals));
    return number.toLocaleString('en-US', {
      maximumFractionDigits: digits
    });
  } catch {
    return String(value);
  }
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );
}

function BalanceCard({ title, value, symbol }) {
  return (
    <div className="balance-card">
      <span>{symbol}</span>
      <div className="balance-title">{title}</div>
      <strong>{value}</strong>
    </div>
  );
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [mode, setMode] = useState({
    gift: 'MANUAL',
    distribute: 'MANUAL',
    pay: 'MANUAL'
  });

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [notice, setNotice] = useState('');

  const walletEnabled = Boolean(isConnected && address);

  const bnbBalance = useBalance({
    address,
    query: { enabled: walletEnabled }
  });

  const usdtBalance = useReadContract({
    address: USDT,
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
      }
    ],
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const sgtBalance = useReadContract({
    address: SGT,
    abi: [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
      }
    ],
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const currentGiftRound = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: '_currentGiftRound'
  });

  const giftListSize = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'giftListSize'
  });

  const globalTokenBalance = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'globalTokenBalance'
  });

  const bankUsdtBalance = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'usdtBalance'
  });

  const bankOwnerInfo = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const accountId = field(bankOwnerInfo.data, 'ID', 0);

  const ownerBankInfo = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerBankInfo',
    args: accountId !== undefined ? [accountId] : undefined,
    query: {
      enabled: walletEnabled && accountId !== undefined && BigInt(accountId) > 0n
    }
  });

  const payOwnerStatus = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerStatus',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const payOwnerPoints = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerAllPoint',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const payLastReward = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'lastRewardTimePassed',
    args: [address],
    query: { enabled: walletEnabled }
  });

  const payContractBalance = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'justContractBalance'
  });

  const proposalStatus = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'currentProposalStatus'
  });   const distributeSimulation = useSimulateContract({
    address: BANK,
    abi: bankABI,
    functionName: 'distributeBank',
    account: address,
    query: {
      enabled: walletEnabled && chainId === 56
    }
  });

  const payRewardSimulation = useSimulateContract({
    address: PAY,
    abi: payABI,
    functionName: 'payReward',
    account: address,
    query: {
      enabled: walletEnabled && chainId === 56
    }
  });

  async function refreshAll() {
    setRefreshing(true);
    setNotice('');

    const queries = [
      bnbBalance,
      usdtBalance,
      sgtBalance,
      currentGiftRound,
      giftListSize,
      globalTokenBalance,
      bankUsdtBalance,
      bankOwnerInfo,
      ownerBankInfo,
      payOwnerStatus,
      payOwnerPoints,
      payLastReward,
      payContractBalance,
      proposalStatus,
      distributeSimulation,
      payRewardSimulation
    ];

    try {
      await Promise.allSettled(
        queries.map((query) => query.refetch())
      );

      setLastRefresh(new Date().toLocaleTimeString());
      setNotice('اطلاعات با موفقیت تازه شد.');
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  const bankInfo = ownerBankInfo.data;
  const payPoints = payOwnerPoints.data;

  const giftReceived = field(bankInfo, 'Total_Gift_Received_USDT', 0);
  const daysSinceGift = field(bankInfo, 'Days_Passed_Since_Last_Gift', 1);
  const freeTokenReceived = field(bankInfo, 'Has_Received_Free_Token', 2);
  const callerReward = field(bankInfo, 'Caller_Reward_Total_USDT', 3);
  const hoursSinceCaller = field(bankInfo, 'Hours_Passed_Since_Last_Caller', 4);
  const hoursSinceBuy = field(bankInfo, 'Hours_Passed_Since_Last_Buy', 5);

  const tier1 = field(bankInfo, 'Claimed_Tier_1_Reward', 6);
  const tier2 = field(bankInfo, 'Claimed_Tier_2_Reward', 7);
  const tier3 = field(bankInfo, 'Claimed_Tier_3_Reward', 8);
  const tier4 = field(bankInfo, 'Claimed_Tier_4_Reward', 9);

  const ownerId = field(bankOwnerInfo.data, 'ID', 0);
  const totalLeft = field(bankOwnerInfo.data, 'Total_Left', 1);
  const totalRight = field(bankOwnerInfo.data, 'Total_Right', 2);
  const currentLeft = field(bankOwnerInfo.data, 'Current_Left', 3);
  const currentRight = field(bankOwnerInfo.data, 'Current_Right', 4);
  const directsCount = field(bankOwnerInfo.data, 'Directs_Count', 5);

  const proposal = proposalStatus.data;
  const proposalTarget = field(proposal, 'target', 0);
  const proposalType = field(proposal, 'pType', 1);
  const proposalVotes300 = field(proposal, 'votes300', 2);
  const proposalVotes100 = field(proposal, 'votes100', 3);
  const proposalStage = field(proposal, 'stage', 4);
 useEffect(() => {
    try {
      const saved = localStorage.getItem('smartglobal-modes');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMode({
          gift: parsed.gift || 'MANUAL',
          distribute: parsed.distribute || 'MANUAL',
          pay: parsed.pay || 'MANUAL'
        });
      }
    } catch {
      // تنظیمات ذخیره‌شده قابل خواندن نیست.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('smartglobal-modes', JSON.stringify(mode));
  }, [mode]);

  useEffect(() => {
    const autoEnabled = Object.values(mode).includes('AUTO');

    if (!autoEnabled) return;

    const timer = window.setInterval(() => {
      refreshAll();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [mode.gift, mode.distribute, mode.pay]);

  function changeMode(key, value) {
    setMode((previous) => ({
      ...previous,
      [key]: value
    }));
  }

  function ModeControl({ title, modeKey }) {
    return (
      <div className="mode-control">
        <span>{title}</span>
        <div className="mode-buttons">
          {['OFF', 'MANUAL', 'AUTO'].map((item) => (
            <button
              key={item}
              type="button"
              className={mode[modeKey] === item ? 'selected' : ''}
              onClick={() => changeMode(modeKey, item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const networkCorrect = Number(chainId) === 56;

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Trust Wallet Bot</h1>
          <p>SmartGlobal Dashboard · BNB Smart Chain</p>
        </div>
        <span className="network-badge">
          {networkCorrect ? '● BNB Chain' : '● بررسی شبکه'}
        </span>
      </header>

      <section className="panel">
        <h2>اتصال کیف پول</h2>

        <button
          className="primary-button"
          type="button"
          onClick={() => open()}
        >
          {isConnected ? 'مدیریت اتصال کیف پول' : 'اتصال کیف پول'}
        </button>

        <InfoRow
          label="وضعیت اتصال"
          value={isConnected ? 'متصل است' : 'متصل نیست'}
        />

        <InfoRow
          label="آدرس کیف پول"
          value={address || '—'}
        />

        <InfoRow
          label="شناسه شبکه"
          value={chainId ?? '—'}
        />

        {isConnected && !networkCorrect && (
          <p className="warning">
            لطفاً شبکه کیف پول را روی BNB Smart Chain قرار دهید.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>موجودی دارایی‌ها</h2>

        <div className="balances">
          <BalanceCard
            title="BNB"
            value={bnbBalance.data
              ? fmt(bnbBalance.data.value, bnbBalance.data.decimals)
              : '—'}
            symbol="🟡"
          />

          <BalanceCard
            title="USDT"
            value={usdtBalance.data !== undefined
              ? fmt(usdtBalance.data, 18)
              : '—'}
            symbol="💵"
          />

          <BalanceCard
            title="SGT"
            value={sgtBalance.data !== undefined
              ? fmt(sgtBalance.data, 18)
              : '—'}
            symbol="🪙"
          />
        </div>
      </section>

      <section className="panel">
        <h2>اطلاعات حساب SmartGlobal</h2>

        <InfoRow label="شناسه حساب" value={ownerId?.toString()} />
        <InfoRow label="مجموع سمت چپ" value={totalLeft?.toString()} />
        <InfoRow label="مجموع سمت راست" value={totalRight?.toString()} />
        <InfoRow label="سمت چپ فعلی" value={currentLeft?.toString()} />
        <InfoRow label="سمت راست فعلی" value={currentRight?.toString()} />
        <InfoRow label="تعداد معرفی مستقیم" value={directsCount?.toString()} />
      </section>      <section className="panel">
        <h2>اطلاعات Gift</h2>

        <InfoRow
          label="دور فعلی Gift"
          value={currentGiftRound.data?.toString()}
        />
        <InfoRow
          label="اندازه فهرست Gift"
          value={giftListSize.data?.toString()}
        />
        <InfoRow
          label="مجموع Gift دریافت‌شده (USDT)"
          value={giftReceived !== undefined ? fmt(giftReceived, 18) : '—'}
        />
        <InfoRow
          label="روزهای گذشته از آخرین Gift"
          value={daysSinceGift?.toString()}
        />
        <InfoRow
          label="دریافت توکن رایگان"
          value={freeTokenReceived === undefined ? '—' : freeTokenReceived ? 'بله' : 'خیر'}
        />
        <InfoRow
          label="موجودی توکن جهانی"
          value={globalTokenBalance.data !== undefined ? fmt(globalTokenBalance.data, 18) : '—'}
        />
        <InfoRow
          label="موجودی USDT قرارداد بانک"
          value={bankUsdtBalance.data !== undefined ? fmt(bankUsdtBalance.data, 18) : '—'}
        />
      </section>

      <section className="panel">
        <h2>اطلاعات Pay Reward</h2>

        <InfoRow
          label="وضعیت حساب"
          value={payOwnerStatus.data === undefined ? '—' : payOwnerStatus.data ? 'فعال' : 'غیرفعال'}
        />
        <InfoRow
          label="امتیازهای حساب"
          value={payPoints?.toString()}
        />
        <InfoRow
          label="زمان گذشته از آخرین پاداش"
          value={payLastReward.data !== undefined ? payLastReward.data.toString() : '—'}
        />
        <InfoRow
          label="موجودی قرارداد Pay"
          value={payContractBalance.data !== undefined ? fmt(payContractBalance.data, 18) : '—'}
        />
        <InfoRow
          label="مجموع پاداش Caller (USDT)"
          value={callerReward !== undefined ? fmt(callerReward, 18) : '—'}
        />
        <InfoRow
          label="ساعت گذشته از آخرین Caller"
          value={hoursSinceCaller?.toString()}
        />
        <InfoRow
          label="ساعت گذشته از آخرین خرید"
          value={hoursSinceBuy?.toString()}
        />
        <InfoRow label="Tier 1" value={tier1 === undefined ? '—' : tier1 ? 'Claim شده' : 'Claim نشده'} />
        <InfoRow label="Tier 2" value={tier2 === undefined ? '—' : tier2 ? 'Claim شده' : 'Claim نشده'} />
        <InfoRow label="Tier 3" value={tier3 === undefined ? '—' : tier3 ? 'Claim شده' : 'Claim نشده'} />
        <InfoRow label="Tier 4" value={tier4 === undefined ? '—' : tier4 ? 'Claim شده' : 'Claim نشده'} />
      </section>

      <section className="panel">
        <h2>وضعیت پیشنهاد قرارداد</h2>

        <InfoRow label="آدرس هدف" value={proposalTarget || '—'} />
        <InfoRow label="نوع پیشنهاد" value={proposalType?.toString()} />
        <InfoRow label="رأی‌های 300" value={proposalVotes300?.toString()} />
        <InfoRow label="رأی‌های 100" value={proposalVotes100?.toString()} />
        <InfoRow label="مرحله پیشنهاد" value={proposalStage?.toString()} />
      </section>

      <section className="panel">
        <h2>مدیریت حالت‌ها</h2>

        <ModeControl title="حالت Gift" modeKey="gift" />
        <ModeControl title="حالت Distribute" modeKey="distribute" />
        <ModeControl title="حالت Pay Reward" modeKey="pay" />

        <p className="warning">
          AUTO فقط اطلاعات را هر ۳۰ ثانیه تازه می‌کند.
          هیچ تراکنشی به صورت خودکار ارسال نمی‌شود.
          برای هر تراکنش باید خودتان در کیف پول تأیید کنید.
        </p>

        <InfoRow
          label="بررسی Distribute"
          value={
            distributeSimulation.isLoading
              ? 'در حال بررسی'
              : distributeSimulation.error
                ? 'خطا یا شرایط اجرا فراهم نیست'
                : distributeSimulation.data
                  ? 'بررسی شبیه‌سازی موفق'
                  : 'در انتظار اطلاعات'
          }
        />

        <InfoRow
          label="بررسی Pay Reward"
          value={
            payRewardSimulation.isLoading
              ? 'در حال بررسی'
              : payRewardSimulation.error
                ? 'خطا یا شرایط اجرا فراهم نیست'
                : payRewardSimulation.data
                  ? 'بررسی شبیه‌سازی موفق'
                  : 'در انتظار اطلاعات'
          }
        />
      </section> 
      

     <section className="panel">
        <h2>به‌روزرسانی اطلاعات</h2>

        <button
          type="button"
          className="primary-button"
          onClick={refreshAll}
          disabled={refreshing}
        >
          {refreshing ? 'در حال به‌روزرسانی...' : 'تازه‌سازی اطلاعات'}
        </button>

        <InfoRow
          label="آخرین به‌روزرسانی"
          value={lastRefresh || 'هنوز انجام نشده'}
        />

        {notice && <p className="notice">{notice}</p>}
      </section>

      <footer>
        Trust Wallet Bot · SmartGlobal Dashboard
        <br />
        فقط نمایش اطلاعات و بررسی خواندنی قرارداد
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f4f8;
          font-family: Arial, sans-serif;
          color: #172033;
        }

        .app {
          max-width: 850px;
          margin: auto;
          padding: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 18px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 25px;
        }

        h2 {
          margin: 0 0 16px;
          font-size: 19px;
        }

        .header p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }

        .network-badge {
          background: #e0f2fe;
          color: #075985;
          padding: 9px 12px;
          border-radius: 20px;
          font-size: 13px;
        }

        .panel {
          background: white;
          padding: 18px;
          border-radius: 14px;
          margin-bottom: 16px;
          box-shadow: 0 2px 9px #0000000c;
          overflow-wrap: anywhere;
        }

        .primary-button {
          width: 100%;
          padding: 13px;
          border: 0;
          border-radius: 9px;
          background: #1769aa;
          color: white;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 14px;
        }

        .primary-button:disabled {
          opacity: 0.6;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 11px 0;
          border-bottom: 1px solid #edf0f4;
          font-size: 14px;
        }

        .info-row span {
          color: #64748b;
        }

        .info-row strong {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .balances {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .balance-card {
          background: #f5f8fc;
          border-radius: 12px;
          padding: 14px 8px;
          text-align: center;
          min-width: 0;
        }

        .balance-card span {
          font-size: 22px;
        }

        .balance-title {
          margin: 8px 0;
          color: #64748b;
          font-size: 13px;
        }

        .balance-card strong {
          overflow-wrap: anywhere;
        }

        .mode-control {
          padding: 13px 0;
          border-bottom: 1px solid #edf0f4;
        }

        .mode-control > span {
          display: block;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .mode-buttons {
          display: flex;
          gap: 8px;
        }

        .mode-buttons button {
          flex: 1;
          padding: 9px 4px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
          color: #334155;
          cursor: pointer;
        }

        .mode-buttons button.selected {
          background: #1769aa;
          color: white;
          border-color: #1769aa;
        }

        .warning {
          background: #fff7e6;
          color: #8a5700;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.8;
        }

        .notice {
          background: #e8f7ed;
          color: #176b35;
          padding: 11px;
          border-radius: 8px;
          font-size: 13px;
        }

        footer {
          text-align: center;
          color: #64748b;
          font-size: 12px;
          padding: 18px 5px;
          line-height: 1.8;
        }

        @media(max-width: 500px) {
          .app {
            padding: 10px;
          }

          .panel {
            padding: 13px;
          }

          .balances {
            grid-template-columns: 1fr 1fr;
          }

          .info-row {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
