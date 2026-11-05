import React from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';

import { useBalance } from 'wagmi';

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const {
    data: balance,
    isLoading,
    error
  } = useBalance({
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

          <h3>موجودی کیف پول</h3>

          <p>موجودی BNB:</p>

          {isLoading && <p>در حال دریافت موجودی...</p>}

          {balance && (
            <p>{balance.formatted} BNB</p>
          )}

          {error && (
            <p>دریافت موجودی ناموفق بود.</p>
          )}
        </section>
      )}

      <p className="notice">
        این برنامه فقط اطلاعات کیف پول را می‌خواند.
        هیچ انتقال پول یا تراکنشی انجام نمی‌دهد.
      </p>
    </main>
  );
}
