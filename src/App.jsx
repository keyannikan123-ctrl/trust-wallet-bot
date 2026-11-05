import React from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';

import { useBalance } from 'wagmi';
import { formatUnits } from 'viem';

const tokens = [
  {
    name: 'USDT',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18
  },
  {
    name: 'SGT',
    address: '0x227c706300ad4df617358e51de443c6dc466353e',
    decimals: 18
  }
];

function TokenBalance({ token, address }) {
  const { data, isLoading, error } = useBalance({
    address,
    token: token.address,
    chainId: 56,
    query: {
      enabled: Boolean(address)
    }
  });

  return (
    <p>
      {token.name}: {' '}
      {isLoading
        ? 'در حال دریافت...'
        : error
          ? 'خطا در دریافت'
          : data
            ? formatUnits(data.value, token.decimals)
            : '0'}
    </p>
  );
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const { data: balance, isLoading, error } = useBalance({
    address,
    chainId: 56,
    query: {
      enabled: Boolean(isConnected && address)
    }
  });

  return (
    <main className="container">
      <h1>Trust Wallet Bot</h1>

      <p>اتصال به شبکه BNB Smart Chain</p>

      <button onClick={() => open()}>
        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
      </button>

      {isConnected && (
        <section>
          <h3>اطلاعات کیف پول</h3>
          <p>وضعیت: متصل ✅</p>
          <p>آدرس کیف پول:</p>
          <p>{address}</p>
          <p>شناسه شبکه: {chainId}</p>

          <hr />

          <h3>موجودی دارایی‌ها</h3>

          <p>BNB:</p>

          {isLoading && <p>در حال دریافت...</p>}
          {balance && <p>{balance.formatted} BNB</p>}
          {error && <p>خطا در دریافت BNB</p>}

          {tokens.map((token) => (
            <TokenBalance
              key={token.name}
              token={token}
              address={address}
            />
          ))}
        </section>
      )}

      <p className="notice">
        این برنامه فقط اطلاعات کیف پول را می‌خواند.
        هیچ انتقال پول یا تراکنشی انجام نمی‌دهد.
      </p>
    </main>
  );
}
