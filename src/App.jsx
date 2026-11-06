import React from 'react';

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
    <p>
      <b>{title}: </b>
      {loading
        ? 'در حال دریافت...'
        : error
          ? 'خطا در دریافت'
          : value !== undefined && value !== null
            ? String(value)
            : 'دریافت نشد'}
    </p>
  );
}

function TokenBalance({ name, tokenAddress }) {
  const { address, isConnected } = useAppKitAccount();

  const { data, isLoading, error } = useBalance({
    address,
    token: tokenAddress,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address)
    }
  });

  return (
    <Value
      title={name}
      value={data
        ? formatUnits(data.value, data.decimals)
        : undefined}
      loading={isLoading}
      error={error}
    />
  );
}

export default function App() {
  const { open } = useAppKit();

  const { address, isConnected } = useAppKitAccount();

  const { chainId } = useAppKitNetwork();

  const correctNetwork = Number(chainId) === 56;

  const {
    data: bnb,
    isLoading: bnbLoading,
    error: bnbError
  } = useBalance({
    address,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address)
    }
  });

  // دریافت شناسه حساب با فرستنده مشخص
  const {
    data: owner,
    isLoading: ownerLoading,
    error: ownerError
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    account: address,
    chainId: 56,
    query: {
      enabled: Boolean(
        isConnected && address && correctNetwork
      ),
      retry: 2
    }
  });

  const rawAccountId = getField(owner, 'ID', 0);

  const accountId = rawAccountId !== undefined
    ? BigInt(rawAccountId)
    : undefined;

  // دریافت اطلاعات شخصی با فرستنده مشخص
  const {
    data: personalInfo,
    isLoading: accountLoading,
    error: accountError
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerBankInfo',
    args: accountId !== undefined && accountId > 0n
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

  const { data: giftRound, isLoading: giftLoading } =
    useReadContract({
      address: BANK,
      abi: bankABI,
      functionName: '_currentGiftRound',
      chainId: 56
    });

  const { data: giftSize, isLoading: sizeLoading } =
    useReadContract({
      address: BANK,
      abi: bankABI,
      functionName: 'giftListSize',
      chainId: 56
    });

  const { data: tokenBalance, isLoading: tokenLoading } =
    useReadContract({
      address: BANK,
      abi: bankABI,
      functionName: 'globalTokenBalance',
      chainId: 56
    });

  const { data: contractUsdt, isLoading: usdtLoading } =
    useReadContract({
      address: BANK,
      abi: bankABI,
      functionName: 'usdtBalance',
      chainId: 56
    });

  const { data: proposal } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'currentProposalStatus',
    chainId: 56
  });

  return (
    <main className="container">

      <h1>Trust Wallet Bot</h1>

      <p>SmartGlobal - BNB Smart Chain</p>

      <button onClick={() => open()}>
        {isConnected
          ? 'کیف پول متصل است'
          : 'اتصال کیف پول'}
      </button>

      {!isConnected && (
        <p>برای مشاهده اطلاعات، کیف پول خود را وصل کنید.</p>
      )}

      {isConnected && (
        <section>

          <h3>اطلاعات کیف پول</h3>

          <p>آدرس کیف پول:</p>
          <p>{address}</p>

          <p>شناسه شبکه: {chainId}</p>

          {!correctNetwork && (
            <p>لطفاً شبکه BNB Smart Chain را انتخاب کنید.</p>
          )}

          <hr />

          <h3>موجودی دارایی‌ها</h3>

          <Value
            title="BNB"
            value={bnb?.formatted}
            loading={bnbLoading}
            error={bnbError}
          />

          <TokenBalance name="USDT" tokenAddress={USDT} />

          <TokenBalance name="SGT" tokenAddress={SGT} />

          <hr />

          <h3>شناسه حساب SmartGlobal</h3>

          <Value
            title="شناسه حساب"
            value={accountId !== undefined && accountId > 0n
              ? accountId.toString()
              : undefined}
            loading={ownerLoading}
            error={ownerError}
          />

          {ownerError && (
            <p>
              جزئیات خطا: {ownerError.shortMessage || ownerError.message}
            </p>
          )}

          <hr />

          <h3>اطلاعات حساب شخصی</h3>

          {personalInfo && (
            <>
              <Value title="مجموع Gift دریافتی"
                value={getField(personalInfo, 'Total_Gift_Received_USDT', 0)?.toString()} />

              <Value title="روز از آخرین Gift"
                value={getField(personalInfo, 'Days_Passed_Since_Last_Gift', 1)?.toString()} />

              <Value title="توکن رایگان دریافت شده"
                value={getField(personalInfo, 'Has_Received_Free_Token', 2) ? 'بله' : 'خیر'} />

              <Value title="مجموع پاداش Caller"
                value={getField(personalInfo, 'Caller_Reward_Total_USDT', 3)?.toString()} />

              <Value title="ساعت از آخرین Caller"
                value={getField(personalInfo, 'Hours_Passed_Since_Last_Caller', 4)?.toString()} />

              <Value title="ساعت از آخرین خرید"
                value={getField(personalInfo, 'Hours_Passed_Since_Last_Buy', 5)?.toString()} />

              <Value title="پاداش Tier 1"
                value={getField(personalInfo, 'Claimed_Tier_1_Reward', 6) ? 'دریافت شده' : 'دریافت نشده'} />

              <Value title="پاداش Tier 2"
                value={getField(personalInfo, 'Claimed_Tier_2_Reward', 7) ? 'دریافت شده' : 'دریافت نشده'} />

              <Value title="پاداش Tier 3"
                value={getField(personalInfo, 'Claimed_Tier_3_Reward', 8) ? 'دریافت شده' : 'دریافت نشده'} />

              <Value title="پاداش Tier 4"
                value={getField(personalInfo, 'Claimed_Tier_4_Reward', 9) ? 'دریافت شده' : 'دریافت نشده'} />
            </>
          )}

          {!personalInfo && accountId > 0n && (
            <p>
              {accountLoading
                ? 'در حال دریافت اطلاعات حساب...'
                : accountError
                  ? 'اطلاعات حساب دریافت نشد.'
                  : 'اطلاعات حساب موجود نیست.'}
            </p>
          )}

          <hr />

          <h3>اطلاعات عمومی Gift</h3>

          <Value title="دور فعلی Gift"
            value={giftRound?.toString()}
            loading={giftLoading} />

          <Value title="اندازه فهرست Gift"
            value={giftSize?.toString()}
            loading={sizeLoading} />

          <Value title="موجودی Global Token"
            value={tokenBalance?.toString()}
            loading={tokenLoading} />

          <Value title="موجودی USDT قرارداد"
            value={contractUsdt?.toString()}
            loading={usdtLoading} />

          <hr />

          <h3>وضعیت پیشنهادها</h3>

          {proposal && (
            <>
              <Value title="آدرس هدف" value={getField(proposal, 'target', 0)} />
              <Value title="نوع پیشنهاد" value={getField(proposal, 'pType', 1)} />
              <Value title="رأی 300" value={getField(proposal, 'votes300', 2)} />
              <Value title="رأی 100" value={getField(proposal, 'votes100', 3)} />
              <Value title="مرحله" value={getField(proposal, 'stage', 4)} />
            </>
          )}

        </section>
      )}

      <p className="notice">
        این برنامه فقط اطلاعات بلاک‌چین و حساب متصل‌شده را می‌خواند.
        هیچ انتقال پول، امضا یا تراکنشی انجام نمی‌دهد.
      </p>

    </main>
  );
}
