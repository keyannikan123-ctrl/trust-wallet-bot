import React, { useEffect, useState } from 'react';
import { createPublicClient, http, formatEther } from 'viem';

const networks = [
  { id: 56, name: 'BNB Smart Chain', coin: 'BNB', rpc: 'https://bsc-dataseed.binance.org/' },
  { id: 1, name: 'Ethereum', coin: 'ETH', rpc: 'https://ethereum-rpc.publicnode.com' },
  { id: 137, name: 'Polygon', coin: 'POL', rpc: 'https://polygon-bor-rpc.publicnode.com' },
  { id: 42161, name: 'Arbitrum', coin: 'ETH', rpc: 'https://arbitrum-one-rpc.publicnode.com' },
  { id: 10, name: 'Optimism', coin: 'ETH', rpc: 'https://optimism-rpc.publicnode.com' },
  { id: 8453, name: 'Base', coin: 'ETH', rpc: 'https://base-rpc.publicnode.com' },
];

const clients = Object.fromEntries(
  networks.map((network) => [
    network.id,
    createPublicClient({ transport: http(network.rpc) }),
  ])
);

export default function MultiWallet({
  connectedAddress,
  activeAddress,
  onSelect,
}) {
  const [addressInput, setAddressInput] = useState('');
  const [wallets, setWallets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ce-watch-wallets') || '[]');
    } catch {
      return [];
    }
  });
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    let next = wallets;

    if (
      connectedAddress &&
      /^0x[a-fA-F0-9]{40}$/.test(connectedAddress) &&
      !wallets.some(
        (item) =>
          item.address.toLowerCase() === connectedAddress.toLowerCase()
      )
    ) {
      next = [
        ...wallets,
        { id: connectedAddress.toLowerCase(), address: connectedAddress },
      ];
      setWallets(next);
    }

    localStorage.setItem('ce-watch-wallets', JSON.stringify(next));
  }, [wallets, connectedAddress]);

  async function loadBalances() {
    if (!wallets.length) return;

    setLoading(true);
    const results = {};

    await Promise.all(
      wallets.flatMap((wallet) =>
        networks.map(async (network) => {
          const key = `${wallet.address}-${network.id}`;

          try {
            const balance = await clients[network.id].getBalance({
              address: wallet.address,
            });

            results[key] = {
              value: Number(formatEther(balance)),
              error: false,
            };
          } catch {
            results[key] = { value: null, error: true };
          }
        })
      )
    );

    setBalances(results);
    setLastUpdate(new Date().toLocaleTimeString());
    setLoading(false);
  }

  useEffect(() => {
    loadBalances();
    const timer = setInterval(loadBalances, 60000);
    return () => clearInterval(timer);
  }, [wallets]);

  function addWallet() {
    const address = addressInput.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      alert('آدرس کیف پول معتبر نیست.');
      return;
    }

    if (
      wallets.some(
        (item) =>
          item.address.toLowerCase() === address.toLowerCase()
      )
    ) {
      alert('این آدرس قبلاً اضافه شده است.');
      return;
    }

    setWallets((old) => [
      ...old,
      { id: address.toLowerCase(), address },
    ]);
    onSelect(address);
    setAddressInput('');
  }

  function removeWallet(id) {
    const removed = wallets.find((item) => item.id === id);
    const remaining = wallets.filter((item) => item.id !== id);

    setWallets(remaining);

    if (
      removed &&
      activeAddress?.toLowerCase() === removed.address.toLowerCase()
    ) {
      onSelect(remaining[0]?.address || '');
    }
  }

  return (
    <section className="panel">
      <h2>مدیریت حساب‌ها</h2>
      <p className="muted">
        آدرس عمومی را اضافه کنید. حساب‌ها تا زمان حذف در برنامه باقی می‌مانند.
      </p>

      <div className="search-row">
        <input
          value={addressInput}
          onChange={(event) => setAddressInput(event.target.value)}
          placeholder="0x..."
          dir="ltr"
        />
        <button onClick={addWallet}>افزودن حساب</button>
      </div>

      {wallets.map((wallet, index) => {
        const active =
          activeAddress?.toLowerCase() === wallet.address.toLowerCase();

        return (
          <div className="panel" key={wallet.id}>
            <p>حساب {index + 1}</p>
            <p dir="ltr">{wallet.address}</p>

            <button
              className={active ? 'primary' : ''}
              onClick={() => onSelect(wallet.address)}
            >
              {active ? 'حساب فعال' : 'فعال کردن این حساب'}
            </button>

            <div className="stats">
              {networks.map((network) => {
                const item = balances[`${wallet.address}-${network.id}`];

                return (
                  <div className="stat" key={network.id}>
                    <small>{network.name}</small>
                    <b>
                      {item?.error
                        ? 'خطای شبکه'
                        : item?.value == null
                          ? 'در حال دریافت...'
                          : `${item.value.toFixed(6)} ${network.coin}`}
                    </b>
                  </div>
                );
              })}
            </div>

            <button onClick={() => removeWallet(wallet.id)}>
              حذف حساب
            </button>
          </div>
        );
      })}

      {!wallets.length && (
        <p className="muted">هنوز حسابی اضافه نشده است.</p>
      )}

      <p className="muted">
        {loading ? 'در حال بررسی موجودی...' : `آخرین بررسی: ${lastUpdate || '—'}`}
      </p>
    </section>
  );
}
