import React, { useState } from 'react';
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
  { type: 'function', name: 'ownerStatus', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'ownerAllPoint', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastRewardTimePassed', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'newOwnerStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastTotalPoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastValuePoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
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

function fmt(value, decimals = 18) {
  if (value === undefined || value === null) return 'دریافت نشد';
  try {
    return Number(formatUnits(BigInt(value), decimals))
      .toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return String(value);
  }
}

function Value({ title, value, loading, error }) {
  let shown = 'دریافت نشد';

  if (loading) shown = 'در حال دریافت...';
  else if (error) shown = 'خطا در دریافت';
  else if (value !== undefined && value !== null) shown = value;

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
      <strong>{loading ? '...' : error ? 'خطا' : value ?? '0'}</strong>
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
  const accountId = rawId !== undefined && rawId !== null
    ? BigInt(rawId)
    : undefined;

  const personalQuery = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerBankInfo',
    args: accountId !== undefined && accountId > 0n ? [accountId] : undefined,
    account: address,
    chainId: 56,
    query: {
      enabled: Boolean(enabled && accountId !== undefined && accountId > 0n),
      retry: 2
    }
  });

  const giftRoundQuery = useReadContract({
    address: BANK, abi: bankABI, functionName: '_currentGiftRound', chainId: 56
  });

  const giftSizeQuery = useReadContract({
    address: BANK, abi: bankABI, functionName: 'giftListSize', chainId: 56
  });

  const tokenBalanceQuery = useReadContract({
    address: BANK, abi: bankABI, functionName: 'globalTokenBalance', chainId: 56
  });

  const bankUsdtQuery = useReadContract({
    address: BANK, abi: bankABI, functionName: 'usdtBalance', chainId: 56
  });

  const proposalQuery = useReadContract({
    address: BANK, abi: bankABI, functionName: 'currentProposalStatus', chainId: 56
  });

  const payMemberQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerStatus',
    args: address ? [address] : undefined,
    chainId: 56,
    query: { enabled }
  });

  const payOwnerQuery = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    account: address,
    chainId: 56,
    query: { enabled, retry: 2 }
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
    address: PAY, abi: payABI, functionName: 'justContractBalance', chainId: 56
  });

  const pendingOwnersQuery = useReadContract({
    address: PAY, abi: payABI, functionName: 'newOwnerStatus', chainId: 56
  });

  const lastTotalPointsQuery = useReadContract({
    address: PAY, abi: payABI, functionName: 'lastTotalPoint', chainId: 56
  });

  const lastPointValueQuery = useReadContract({
    address: PAY, abi: payABI, functionName: 'lastValuePoint', chainId: 56
  });

  // فقط شبیه‌سازی؛ هیچ تراکنشی ارسال نمی‌شود.
  const distributeSimulation = useSimulateContract({
    address: BANK,
    abi: bankABI,
    functionName: 'distributeBank',
    account: address,
    chainId: 56,
    query: { enabled, retry: false }
  });

  const payRewardSimulation = useSimulateContract({
    address: PAY,
    abi: payABI,
    functionName: 'payReward',
    account: address,
    chainId: 56,
    query: { enabled, retry: false }
  });

  const owner = ownerQuery.data;
  const personal = personalQuery.data;
  const payOwner = payOwnerQuery.data;
  const proposal = proposalQuery.data;

  const currentLeft = field(payOwner, 'Current_Left', 3);
  const currentRight = field(payOwner, 'Current_Right', 4);

  const rawCurrentPoints =
    currentLeft !== undefined && currentRight !== undefined
      ? Math.min(Number(currentLeft), Number(currentRight))
      : undefined;

  async function refreshAll() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      const queries = [
        bnbQuery, usdtQuery, sgtQuery, ownerQuery, personalQuery,
        giftRoundQuery, giftSizeQuery, tokenBalanceQuery, bankUsdtQuery,
        proposalQuery, payMemberQuery, payOwnerQuery, payPointsQuery,
        rewardHoursQuery, payBalanceQuery, pendingOwnersQuery,
        lastTotalPointsQuery, lastPointValueQuery,
        distributeSimulation, payRewardSimulation
      ];

      await Promise.allSettled(queries.map(q => q.refetch()));
      setLastUpdated(new Date().toLocaleTimeString('fa-AF'));
    } finally {
      setRefreshing(false);
    }
  }

  function simStatus(result) {
    if (!enabled) return 'ابتدا کیف پول را به شبکه BNB وصل کنید.';
    if (result.isLoading) return 'در حال بررسی...';
    if (result.isError) return 'شبیه‌سازی ناموفق بود؛ دلیل خطا پایین نمایش داده شده است.';
    if (result.data) return 'شبیه‌سازی موفق بود؛ اجرای واقعی تضمین نمی‌شود.';
    return 'نتیجه هنوز دریافت نشده است.';
  }

  return (
    <main className="app">
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#101827;color:#f4f6fb;font-family:Arial,sans-serif}
        .app{max-width:850px;margin:auto;padding:16px}
        h1{text-align:center;font-size:25px;margin:12px 0}
        .subtitle{text-align:center;color:#aebbd0;margin-bottom:20px}
        .panel{background:#1b293d;border:1px solid #34445d;border-radius:13px;padding:16px;margin:14px 0}
        h2{font-size:18px;margin:0 0 14px;color:#f4c95d}
        h3{font-size:16px;margin-top:20px}
        .info-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #34445d;overflow-wrap:anywhere}
        .info-row:last-child{border-bottom:0}
        .info-row span{color:#bdc9d9}
        .info-row strong{text-align:right;overflow-wrap:anywhere}
        .balances{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .balance-card{background:#263750;padding:14px 8px;border-radius:10px;text-align:center;min-width:0}
        .balance-symbol{display:block;font-size:23px}
        .balance-title{display:block;color:#bdc9d9;font-size:13px;margin:7px 0}
        .balance-card strong{overflow-wrap:anywhere;font-size:15px}
        button{width:100%;padding:13px;border:0;border-radius:9px;background:#e8b943;color:#172033;font-weight:bold;font-size:16px;margin-top:10px}
        button:disabled{opacity:.55}
        .status{padding:12px;border-radius:9px;background:#263750;margin:9px 0;line-height:1.7;overflow-wrap:anywhere}
        .warning{background:#493b20;border:1px solid #8d7130;color:#ffe6a0;padding:13px;border-radius:9px;line-height:1.8}
        .good{color:#7ee0a1}.bad{color:#ff9999}
        .small{font-size:12px;color:#aebbd0;line-height:1.8;overflow-wrap:anywhere}
        .address{font-size:12px;word-break:break-all}
        @media(max-width:500px){.balances{grid-template-columns:1fr}.info-row{font-size:13px}.app{padding:10px}}
      `}</style>

      <h1>Trust Wallet Bot</h1>
      <div className="subtitle">SmartGlobal Dashboard · BNB Smart Chain · Read Only</div>

      <section className="panel">
        <h2>اتصال کیف پول</h2>
        <div className="status">
          {isConnected
            ? <span className="good">● کیف پول متصل است</span>
            : <span className="bad">● کیف پول وصل نیست</span>}
        </div>
        <button onClick={() => open()}>
          {isConnected ? 'مدیریت اتصال کیف پول' : 'اتصال کیف پول'}
        </button>
        <Value title="آدرس کیف پول" value={address ? <span className="address">{address}</span> : 'وصل نیست'} />
        <Value title="شناسه شبکه" value={chainId ?? 'نامشخص'} />
        {isConnected && !correctNetwork && (
          <div className="warning">لطفاً شبکه را روی BNB Smart Chain با شناسه 56 قرار بده.</div>
        )}
      </section>

      <section className="panel">
        <h2>موجودی دارایی‌ها</h2>
        <div className="balances">
          <BalanceCard title="BNB" symbol="🟡" value={bnbQuery.data ? fmt(bnbQuery.data.value) : '0'} loading={bnbQuery.isLoading} error={bnbQuery.isError} />
          <BalanceCard title="USDT" symbol="💵" value={usdtQuery.data ? fmt(usdtQuery.data.value) : '0'} loading={usdtQuery.isLoading} error={usdtQuery.isError} />
          <BalanceCard title="SGT" symbol="🪙" value={sgtQuery.data ? fmt(sgtQuery.data.value) : '0'} loading={sgtQuery.isLoading} error={sgtQuery.isError} />
        </div>
      </section>

      <section className="panel">
        <h2>اطلاعات حساب SmartGlobal</h2>
        <Value title="شناسه حساب" value={accountId !== undefined ? accountId.toString() : 'یافت نشد'} />
        <Value title="تعداد معرفی‌شده‌ها" value={field(owner, 'Directs_Count', 5)} />
        <Value title="مجموع سمت چپ" value={field(owner, 'Total_Left', 1)} />
        <Value title="مجموع سمت راست" value={field(owner, 'Total_Right', 2)} />
        <Value title="آدرس بالادست" value={field(owner, 'UpLine_Address', 7)} />
      </section>

      <section className="panel">
        <h2>اطلاعات عمومی Gift</h2>
        <Value title="دور فعلی Gift" value={giftRoundQuery.data?.toString()} />
        <Value title="تعداد اعضای فهرست Gift" value={giftSizeQuery.data?.toString()} />
        <Value title="موجودی توکن عمومی" value={tokenBalanceQuery.data !== undefined ? fmt(tokenBalanceQuery.data) : undefined} />
        <Value title="موجودی USDT قرارداد بانک" value={bankUsdtQuery.data !== undefined ? fmt(bankUsdtQuery.data) : undefined} />
      </section>

      <section className="panel">
        <h2>اطلاعات شخصی Gift و پاداش</h2>
        <Value title="مجموع Gift دریافت‌شده (USDT)" value={personal ? fmt(field(personal, 'Total_Gift_Received_USDT', 0)) : undefined} />
        <Value title="روزهای گذشته از Gift قبلی" value={field(personal, 'Days_Passed_Since_Last_Gift', 1)} />
        <Value title="توکن رایگان دریافت شده؟" value={field(personal, 'Has_Received_Free_Token', 2) === undefined ? undefined : (field(personal, 'Has_Received_Free_Token', 2) ? 'بله' : 'خیر')} />
        <Value title="مجموع پاداش شخصی (USDT)" value={personal ? fmt(field(personal, 'Caller_Reward_Total_USDT', 3)) : undefined} />
        <Value title="ساعت گذشته از پاداش قبلی بانک" value={field(personal, 'Hours_Passed_Since_Last_Caller', 4)} />
        <Value title="ساعت گذشته از خرید قبلی" value={field(personal, 'Hours_Passed_Since_Last_Buy', 5)} />
      </section>

      <section className="panel">
        <h2>بررسی دقیق SmartGlobalPay</h2>
        <Value title="عضویت حساب در Pay" value={payMemberQuery.data === undefined ? undefined : (payMemberQuery.data ? 'فعال' : 'غیرفعال')} />
        <Value title="مجموع امتیاز تاریخی دو سمت" value={payPointsQuery.data?.toString()} />
        <Value title="امتیاز جاری سمت چپ" value={currentLeft?.toString()} />
        <Value title="امتیاز جاری سمت راست" value={currentRight?.toString()} />
        <Value title="حداقل امتیاز جاری دو سمت (قبل از سقف قرارداد)" value={rawCurrentPoints?.toString()} />
        <Value title="ساعت گزارش‌شده از پاداش قبلی" value={rewardHoursQuery.data?.toString()} />
        <Value title="موجودی USDT قرارداد Pay" value={payBalanceQuery.data !== undefined ? fmt(payBalanceQuery.data, 0) : undefined} />
        <Value title="تعداد اعضای جدید ثبت‌شده" value={pendingOwnersQuery.data?.toString()} />
        <Value title="مجموع امتیاز آخرین توزیع" value={lastTotalPointsQuery.data?.toString()} />
        <Value title="ارزش آخرین امتیاز (عدد گزارش‌شده)" value={lastPointValueQuery.data?.toString()} />

        <div className="warning">
          نکته: قرارداد سقف امتیاز جاری را بر اساس وضعیت Max Point محدود می‌کند.
          این وضعیت از طریق توابع عمومی موجود در قرارداد قابل خواندن نیست؛ بنابراین حداقل امتیاز بالا فقط مقدار خام دو سمت است و امتیاز نهایی واجد شرایط را تضمین نمی‌کند.
          همچنین عدد 24 در زمان پاداش می‌تواند به معنی 24 ساعت یا بیشتر باشد؛ زمان دقیق‌تر از این تابع قابل تشخیص نیست.
        </div>
      </section>

      <section className="panel">
        <h2>وضعیت پیشنهاد قرارداد</h2>
        <Value title="آدرس هدف" value={proposal ? field(proposal, 'target', 0) : undefined} />
        <Value title="نوع پیشنهاد" value={proposal ? field(proposal, 'pType', 1)?.toString() : undefined} />
        <Value title="رأی‌های 300" value={proposal ? field(proposal, 'votes300', 2)?.toString() : undefined} />
        <Value title="رأی‌های 100" value={proposal ? field(proposal, 'votes100', 3)?.toString() : undefined} />
        <Value title="مرحله پیشنهاد" value={proposal ? field(proposal, 'stage', 4)?.toString() : undefined} />
      </section>

      <section className="panel">
        <h2>شبیه‌سازی عملیات (بدون ارسال تراکنش)</h2>
        <div className="warning">
          این بخش فقط عملیات را به‌صورت آزمایشی بررسی می‌کند.
          هیچ تراکنشی ارسال نمی‌شود و هیچ پولی جابه‌جا نمی‌شود.
          موفقیت شبیه‌سازی نیز اجرای واقعی را تضمین نمی‌کند.
        </div>

        <h3>Distribute Bank</h3>
        <div className="status">{simStatus(distributeSimulation)}</div>
        {distributeSimulation.error && (
          <p className="small">دلیل خطا: {getErrorMessage(distributeSimulation.error)}</p>
        )}

        <h3>Pay Reward</h3>
        <div className="status">{simStatus(payRewardSimulation)}</div>
        {payRewardSimulation.error && (
          <p className="small">دلیل خطا: {getErrorMessage(payRewardSimulation.error)}</p>
        )}

        <p className="small">
          قرارداد بعضی شرط‌ها مانند زمان آخرین توزیع عمومی و مجموع پاداش فراخواننده را به شکل تابع عمومی نمایش نمی‌دهد.
          شبیه‌سازی خود قرارداد برای بررسی نهایی خطا اهمیت دارد.
        </p>
      </section>

      <section className="panel">
        <h2>بروزرسانی اطلاعات</h2>
        <button onClick={refreshAll} disabled={refreshing}>
          {refreshing ? 'در حال بروزرسانی...' : 'بررسی و بروزرسانی همه اطلاعات'}
        </button>
        <Value title="آخرین بروزرسانی" value={lastUpdated ?? 'هنوز بروزرسانی نشده'} />
      </section>

      <section className="panel">
        <h2>یادآوری امنیتی</h2>
        <p className="small">
          این برنامه فقط اطلاعات عمومی شبکه و کیف پول متصل را می‌خواند.
          عبارت بازیابی و کلید خصوصی را هیچ‌جا وارد نکن.
          برای بررسی قرارداد، موفقیت شبیه‌سازی را با تضمین پرداخت یا دریافت پاداش اشتباه نگیر.
        </p>
      </section>
    </main>
  );
    }
