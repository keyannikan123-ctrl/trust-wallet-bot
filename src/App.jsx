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
  const { address } = useAppKitAccount();

  const { data, isLoading, error } = useBalance({
    address,
    token: tokenAddress,
    chainId: 56,
    query: {
      enabled: Boolean(address)
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

  const { data: bnb, isLoading: bnbLoading, error: bnbError } =
    useBalance({
      address,
      chainId: 56,
      query: {
        enabled: Boolean(isConnected && address)
      }
    });

  // Find the connected user's SmartGlobal ID
  const {
    data: owner,
    isLoading: ownerLoading,
    error: ownerError
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address && correctNetwork)
    }
  });

  // Read personal account information using the discovered ID
  const accountId = owner ? owner[0] : undefined;

  const {
    data: account,
    isLoading: accountLoading,
    error: accountError
  } = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerBankInfo',
    args: accountId !== undefined && accountId > 0n
      ? [accountId]
      : undefined,
    chainId: 56,
    query: {
      enabled: Boolean(
        isConnected &&
        correctNetwork &&
        accountId !== undefined &&
        accountId > 0n
      )
    }
  });

  // Public SmartGlobal information
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

          <TokenBalance
            name="USDT"
            tokenAddress={USDT}
          />

          <TokenBalance
            name="SGT"
            tokenAddress={SGT}
          />

          <hr />

          <h3>شناسه حساب SmartGlobal</h3>

          <Value
            title="شناسه حساب"
            value={
              owner && accountId > 0n
                ? accountId.toString()
                : owner
                  ? 'حساب پیدا نشد'
                  : undefined
            }
            loading={ownerLoading}
            error={ownerError}
          />

          <hr />

          <h3>اطلاعات حساب شخصی</h3>

          {account && (
            <>
              <Value
                title="مجموع Gift دریافتی"
                value={account[0]}
              />

              <Value
                title="روز از آخرین Gift"
                value={account[1]}
              />

              <Value
                title="توکن رایگان دریافت شده"
                value={account[2] ? 'بله' : 'خیر'}
              />

              <Value
                title="مجموع پاداش Caller"
                value={account[3]}
              />

              <Value
                title="ساعت از آخرین Caller"
                value={account[4]}
              />

              <Value
                title="ساعت از آخرین خرید"
                value={account[5]}
              />

              <Value
                title="پاداش Tier 1"
                value={account[6] ? 'دریافت شده' : 'دریافت نشده'}
              />

              <Value
                title="پاداش Tier 2"
                value={account[7] ? 'دریافت شده' : 'دریافت نشده'}
              />

              <Value
                title="پاداش Tier 3"
                value={account[8] ? 'دریافت شده' : 'دریافت نشده'}
              />

              <Value
                title="پاداش Tier 4"
                value={account[9] ? 'دریافت شده' : 'دریافت نشده'}
              />
            </>
          )}

          {!account && accountId > 0n && (
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
            title="موجودی Global Token (واحد خام)"
            value={tokenBalance?.toString()}
            loading={tokenLoading}
          />

          <Value
            title="موجودی USDT قرارداد (واحد خام)"
            value={contractUsdt?.toString()}
            loading={usdtLoading}
          />

          <hr />

          <h3>وضعیت پیشنهادها</h3>

          {proposal && (
            <>
              <Value title="آدرس هدف" value={proposal[0]} />
              <Value title="نوع پیشنهاد" value={proposal[1]} />
              <Value title="رأی 300" value={proposal[2]} />
              <Value title="رأی 100" value={proposal[3]} />
              <Value title="مرحله" value={proposal[4]} />
            </>
          )}

        </section>
      )}

      <p className="notice">
        این برنامه فقط اطلاعات عمومی بلاک‌چین و حساب متصل‌شده را
        می‌خواند. هیچ انتقال پول، امضا یا تراکنشی انجام نمی‌دهد.
      </p>

    </main>
  );
}
