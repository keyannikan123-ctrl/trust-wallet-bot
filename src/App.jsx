import React, { useState, useEffect, useCallback } from 'react';

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
    name: 'distributeBank',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
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
    name: 'payReward',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
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
    name: 'ownerPoint7',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'ownerPoint20',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'ownerPoint100',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'ownerPoint300',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }]
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
  }
];

function field(data, name, index) {
  if (!data) return undefined;
  return data[name] ?? data[index];
}

function getErrorMessage(error) {
  if (!error) return '';

  return (
    error.shortMessage ||
    error.details ||
    error.cause?.shortMessage ||
    error.cause?.message ||
    error.message ||
    'خطای نامشخص'
  );
}

function fmt(value, decimals = 18) {
  if (value === undefined || value === null) {
    return 'دریافت نشد';
  }

  try {
    return Number(formatUnits(BigInt(value), decimals))
      .toLocaleString('en-US', {
        maximumFractionDigits: 4
      });
  } catch {
    return String(value);
  }
}

function Value({ title, value, loading, error }) {
  let shown = 'دریافت نشد';

  if (loading) {
    shown = 'در حال دریافت...';
  } else if (error) {
    shown = 'خطا در دریافت';
  } else if (value !== undefined && value !== null) {
    shown = value;
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

  // =====================================
  // تنظیمات AUTO و MANUAL
  // =====================================

  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('smartglobal_mode') || 'manual';
    } catch {
      return 'manual';
    }
  });

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const correctNetwork = Number(chainId) === 56;

  const enabled = Boolean(
    isConnected && address && correctNetwork
  );

  function changeMode(newMode) {
    setMode(newMode);

    try {
      localStorage.setItem('smartglobal_mode', newMode);
    } catch {
      // ادامه کار بدون ذخیره تنظیمات
    }
  }

  // =====================================
  // موجودی کیف پول
  // =====================================

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

  // =====================================
  // اطلاعات حساب بانک
  // =====================================

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
        enabled &&
        accountId !== undefined &&
        accountId > 0n
      ),
      retry: 2
    }
  });

  // =====================================
  // اطلاعات عمومی Gift
  // =====================================

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

  // =====================================
  // اطلاعات SmartGlobalPay
  // =====================================

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

  // امتیازهای دوره‌ای

  const point7Query = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerPoint7',
    chainId: 56,
    query: { enabled }
  });

  const point20Query = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerPoint20',
    chainId: 56,
    query: { enabled }
  });

  const point100Query = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerPoint100',
    chainId: 56,
    query: { enabled }
  });

  const point300Query = useReadContract({
    address: PAY,
    abi: payABI,
    functionName: 'ownerPoint300',
    chainId: 56,
    query: { enabled }
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

  // =====================================
  // شبیه‌سازی بدون ارسال تراکنش
  // =====================================

  const distributeSimulation = useSimulateContract({
    address: BANK,
    abi: bankABI,
    functionName: 'distributeBank',
    account: address,
    chainId: 56,
    query: {
      enabled,
      retry: false
    }
  });

  const payRewardSimulation = useSimulateContract({
    address: PAY,
    abi: payABI,
    functionName: 'payReward',
    account: address,
    chainId: 56,
    query: {
      enabled,
      retry: false
    }
  });

  const owner = ownerQuery.data;
  const personal = personalQuery.data;
  const payOwner = payOwnerQuery.data;
  const proposal = proposalQuery.data;

  const currentLeft = field(payOwner, 'Current_Left', 3);
  const currentRight = field(payOwner, 'Current_Right', 4);

  const rawCurrentPoints =
    currentLeft !== undefined && currentRight !== undefined
      ? Math.min(
          Number(currentLeft),
          Number(currentRight)
        )
      : undefined;

  // =====================================
  // بروزرسانی تمام اطلاعات
  // =====================================

  const refreshAll = useCallback(async () => {
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
        payOwnerQuery,
        payPointsQuery,
        point7Query,
        point20Query,
        point100Query,
        point300Query,
        rewardHoursQuery,
        payBalanceQuery,
        pendingOwnersQuery,
        lastTotalPointsQuery,
        lastPointValueQuery,
        distributeSimulation,
        payRewardSimulation
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
  }, [
    refreshing,
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
    payOwnerQuery,
    payPointsQuery,
    point7Query,
    point20Query,
    point100Query,
    point300Query,
    rewardHoursQuery,
    payBalanceQuery,
    pendingOwnersQuery,
    lastTotalPointsQuery,
    lastPointValueQuery,
    distributeSimulation,
    payRewardSimulation
  ]);

  // =====================================
  // اجرای AUTO هر 30 ثانیه
  // =====================================

  useEffect(() => {
    if (mode !== 'auto' || !enabled) return;

    const timer = setInterval(() => {
      refreshAll();
    }, 30000);

    return () => clearInterval(timer);

  }, [mode, enabled, refreshAll]);

  function simStatus(result) {
    if (!enabled) {
      return 'ابتدا کیف پول را به شبکه BNB وصل کنید.';
    }

    if (result.isLoading) {
      return 'در حال بررسی...';
    }

    if (result.isError) {
      return 'شبیه‌سازی ناموفق بود.';
    }

    if (result.data) {
      return 'شبیه‌سازی موفق بود؛ اجرای واقعی تضمین نمی‌شود.';
    }

    return 'نتیجه هنوز دریافت نشده است.';
  }  return (
    <main className="app">

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #101827;
          color: #f4f6fb;
          font-family: Arial, sans-serif;
        }

        .app {
          max-width: 850px;
          margin: auto;
          padding: 16px;
        }

        h1 {
          text-align: center;
          font-size: 25px;
          margin: 12px 0;
        }

        .subtitle {
          text-align: center;
          color: #aebbd0;
          margin-bottom: 20px;
        }

        .panel {
          background: #1b293d;
          border: 1px solid #34445d;
          border-radius: 13px;
          padding: 16px;
          margin: 14px 0;
        }

        h2 {
          font-size: 18px;
          margin: 0 0 14px;
          color: #f4c95d;
        }

        h3 {
          font-size: 16px;
          margin-top: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #34445d;
          overflow-wrap: anywhere;
        }

        .info-row:last-child {
          border-bottom: 0;
        }

        .info-row span {
          color: #bdc9d9;
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
          background: #263750;
          padding: 14px 8px;
          border-radius: 10px;
          text-align: center;
          min-width: 0;
        }

        .balance-symbol {
          display: block;
          font-size: 23px;
        }

        .balance-title {
          display: block;
          color: #bdc9d9;
          font-size: 13px;
          margin: 7px 0;
        }

        .balance-card strong {
          overflow-wrap: anywhere;
          font-size: 15px;
        }

        button {
          width: 100%;
          padding: 13px;
          border: 0;
          border-radius: 9px;
          background: #e8b943;
          color: #172033;
          font-weight: bold;
          font-size: 16px;
          margin-top: 10px;
          cursor: pointer;
        }

        button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .status {
          padding: 12px;
          border-radius: 9px;
          background: #263750;
          margin: 9px 0;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .warning {
          background: #493b20;
          border: 1px solid #8d7130;
          color: #ffe6a0;
          padding: 13
