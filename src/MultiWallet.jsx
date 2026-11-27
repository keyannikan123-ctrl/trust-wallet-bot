
import React, { useEffect, useState } from 'react';
import {
  createPublicClient,
  http,
  formatEther,
} from 'viem';

const networks = [
  {
    id: 56,
    name: 'BNB Smart Chain',
    coin: 'BNB',
    rpc: 'https://bsc-dataseed.binance.org/',
  },
  {
    id: 1,
    name: 'Ethereum',
    coin: 'ETH',
    rpc: 'https://ethereum-rpc.publicnode.com',
  },
  {
    id: 137,
    name: 'Polygon',
    coin: 'POL',
    rpc: 'https://polygon-bor-rpc.publicnode.com',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    coin: 'ETH',
    rpc: 'https://arbitrum-one-rpc.publicnode.com',
  },
  {
    id: 10,
    name: 'Optimism',
    coin: 'ETH',
    rpc: 'https://optimism-rpc.publicnode.com',
  },
  {
    id: 8453,
    name: 'Base',
    coin: 'ETH',
    rpc: 'https://base-rpc.publicnode.com',
  },
];

const clients = Object.fromEntries(
  networks.map((network) => [
    network.id,
    createPublicClient({
      transport: http(network.rpc),
    }),
  ])
);

export default function MultiWallet() {
  const [addressInput, setAddressInput] = useState('');
  const [wallets, setWallets] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('ce-watch-wallets') || '[]'
      );
    } catch {
      return [];
    }
  });

  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => {
    localStorage.setItem(
      'ce-watch-wallets',
      JSON.stringify(wallets)
    );
  }, [wallets]);

  async function loadBalances() {
    if (!wallets.length) return;

    setLoading(true);

    const results = {};

    await Promise.all(
      wallets.flatMap((wallet) =>
        networks.map(async (network) => {
          const key = `${wallet.address}-${network.id}`;

          try {
            const balance = await clients[
              network.id
            ].getBalance({
              address: wallet.address,
            });

            results[key] = {
              value: Number(formatEther(balance)),
              error: false,
            };
          } catch {
            results[key] = {
              value: null,
              error: true,
            };
          }
        })
      )
    );

    setBalances((old) => ({ ...old, ...results }));
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
      {
        id: Date.now(),
        address,
      },
    ]);

    setAddressInput('');
  }

  function removeWallet(id) {
    setWallets((old) =>
      old.filter((wallet) => wallet.id !== id)
    );
  }

  return (
    <Panel title="مدیریت چند کیف پول">
      <p className="muted">
        آدرس عمومی کیف پول را وارد کنید.
        برای مشاهده موجودی، نیازی به اتصال یا رمز کیف پول نیست.
      </p>

      <div className="search-row">
        <input
          value={addressInput}
          onChange={(event) =>
            setAddressInput(event.target.value)
          }
          placeholder="0x..."
          dir="ltr"
        />

        <button onClick={addWallet}>
          افزودن کیف پول
        </button>
      </div>

      {wallets.map((wallet) => (
        <div className="panel" key={wallet.id}>
          <p dir="ltr">{wallet.address}</p>

          <div className="stats">
            {networks.map((network) => {
              const key =
                `${wallet.address}-${network.id}`;

              const item = balances[key];

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

          <button
            onClick={() => removeWallet(wallet.id)}
          >
            حذف آدرس
          </button>
        </div>
      ))}

      {wallets.length === 0 && (
        <p className="muted">
          هنوز آدرسی اضافه نشده است.
        </p>
      )}

      <p className="muted">
        {loading
          ? 'در حال دریافت اطلاعات...'
          : lastUpdate
            ? `آخرین بررسی: ${lastUpdate}`
            : ''}
      </p>
    </Panel>
  );
}
