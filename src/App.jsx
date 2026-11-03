import React from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  return (
    <main className="container">
      <h1>Trust Wallet Connection</h1>
      <p>اتصال امن کیف پول به شبکه BNB Smart Chain</p>

      <button onClick={() => open()}>
        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
      </button>

      {isConnected && (
        <section>
          <p>وضعیت: متصل</p>
          <p>آدرس کیف پول: {address}</p>
          <p>شناسه شبکه: {chainId}</p>
        </section>
      )}

      <p className="notice">
        این نسخه فقط برای اتصال و نمایش اطلاعات کیف پول است.
        هیچ انتقال پول یا تأیید تراکنشی انجام نمی‌دهد.
      </p>
    </main>
  );
}
