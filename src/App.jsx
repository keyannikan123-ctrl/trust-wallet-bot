
import React, { useEffect, useMemo, useState } from 'react';

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork
} from '@reown/appkit/react';

import { useBalance, useReadContract } from 'wagmi';
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
  }
];

const money = (value, decimals = 18) => {
  if (value === undefined || value === null) return '—';
  try {
    return Number(formatUnits(BigInt(value), decimals))
      .toLocaleString('en-US', { maximumFractionDigits: 4 });
  } catch {
    return String(value);
  }
};

function Card({ title, value, subtitle }) {
  return (
    <div className="card">
      <div className="muted">{title}</div>
      <strong className="card-value">{value ?? '—'}</strong>
      {subtitle && <small>{subtitle}</small>}
    </div>
  );
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const [language, setLanguage] = useState('fa');
  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [auto, setAuto] = useState(false);
  const [tab, setTab] = useState('market');

  const fa = language === 'fa';
  const connected = Boolean(isConnected && address);
  const correctNetwork = Number(chainId) === 56;

  const t = (faText, enText) => fa ? faText : enText;

  const bnb = useBalance({
    address,
    query: { enabled: connected }
  });

  const usdt = useReadContract({
    address: USDT,
    abi: [{
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: connected && correctNetwork }
  });

  const sgt = useReadContract({
    address: SGT,
    abi: [{
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }]
    }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: connected && correctNetwork }
  });

  const giftRound = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: '_currentGiftRound'
  });

  const giftSize = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'giftListSize'
  });

  const globalTokens = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'globalTokenBalance'
  });

  const bankUsdt = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'usdtBalance'
  });

  const ownerInfo = useReadContract({
    address: BANK,
    abi: bankABI,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    query: { enabled: connected && correctNetwork }
  });

  async function loadMarket() {
    setLoading(true);
    setMarketError('');

    try {
      const response = await fetch(
        'https://crypto-explorer-api.keyannikan123.workers.dev/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
      );

      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'Too many requests. Please wait and try again.'
            : 'Market data could not be loaded.'
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid market data.');
      }

      setCoins(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      setMarketError(error.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();
  }, []);

  useEffect(() => {
    if (!auto) return;

    const timer = window.setInterval(() => {
      loadMarket();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [auto]);

  const filteredCoins = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return coins;

    return coins.filter((coin) =>
      coin.name.toLowerCase().includes(q) ||
      coin.symbol.toLowerCase().includes(q)
    );
  }, [coins, search]);

  const accountId = ownerInfo.data?.ID ?? ownerInfo.data?.[0];

  return (
    <main className="app" dir={fa ? 'rtl' : 'ltr'}>
      <header className="top">
        <div>
          <h1>Crypto Explorer</h1>
          <p>SmartGlobal · BNB Smart Chain</p>
        </div>

        <button
          className="language"
          onClick={() => setLanguage(fa ? 'en' : 'fa')}
        >
          {fa ? 'English' : 'دری'}
        </button>
      </header>

      <section className="hero">
        <h2>{t('بازار ارزهای دیجیتال', 'Crypto Market')}</h2>
        <p>
          {t(
            'قیمت‌ها، تغییرات بازار و بررسی ارزها',
            'Prices, market changes and coin research'
          )}
        </p>

        <div className="hero-buttons">
          <button onClick={() => setTab('market')}>
            {t('بازار', 'Market')}
          </button>
          <button onClick={() => setTab('wallet')}>
            {t('کیف پول', 'Wallet')}
          </button>
          <button onClick={() => setTab('smart')}>
            SmartGlobal
          </button>
        </div>
      </section>

      {tab === 'market' && (
        <section className="panel">
          <div className="section-heading">
            <h2>{t('قیمت ارزها', 'Cryptocurrency Prices')}</h2>
            <button onClick={loadMarket} disabled={loading}>
              {loading ? '...' : t('تازه‌سازی', 'Refresh')}
            </button>
          </div>

          <input
            className="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('نام یا نماد ارز را جستجو کن', 'Search coin name or symbol')}
          />

          <label className="auto-control">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            {t('تازه‌سازی خودکار هر ۶۰ ثانیه', 'Auto refresh every 60 seconds')}
          </label>

          {marketError && (
            <p className="error">{marketError}</p>
          )}

          {loading && coins.length === 0 && (
            <p>{t('در حال دریافت قیمت‌ها...', 'Loading market data...')}</p>
          )}

          <div className="coin-list">
            {filteredCoins.map((coin) => (
              <div className="coin" key={coin.id}>
                <img src={coin.image} alt="" />
                <div className="coin-name">
                  <strong>{coin.name}</strong>
                  <small>{coin.symbol.toUpperCase()}</small>
                </div>

                <div className="coin-price">
                  <strong>
                    ${Number(coin.current_price).toLocaleString('en-US')}
                  </strong>
                  <small className={
                    coin.price_change_percentage_24h >= 0
                      ? 'positive'
                      : 'negative'
                  }>
                    {coin.price_change_percentage_24h == null
                      ? '—'
                      : `${coin.price_change_percentage_24h.toFixed(2)}%`}
                  </small>
                </div>
              </div>
            ))}
          </div>

          {filteredCoins.length === 0 && !loading && (
            <p>{t('ارزی پیدا نشد.', 'No coins found.')}</p>
          )}

          <small className="muted">
            {t('آخرین به‌روزرسانی: ', 'Last update: ')}
            {lastUpdate || '—'}
          </small>
        </section>
      )}

      {tab === 'wallet' && (
        <section className="panel">
          <h2>{t('کیف پول', 'Wallet')}</h2>

          <button className="main-button" onClick={() => open()}>
            {connected
              ? t('مدیریت اتصال', 'Manage Connection')
              : t('اتصال کیف پول', 'Connect Wallet')}
          </button>

          <Card
            title={t('وضعیت اتصال', 'Connection')}
            value={connected
              ? t('متصل است', 'Connected')
              : t('متصل نیست', 'Not connected')}
          />

          <Card title="Address" value={address || '—'} />

          <Card
            title="Network"
            value={chainId ?? '—'}
            subtitle={correctNetwork ? 'BNB Smart Chain' : 'Please select BNB Chain'}
          />

          {!correctNetwork && connected && (
            <p className="error">
              {t('شبکه کیف پول را روی BNB Smart Chain قرار بده.', 'Please switch your wallet to BNB Smart Chain.')}
            </p>
          )}

          <div className="cards">
            <Card
              title="BNB"
              value={bnb.data
                ? money(bnb.data.value, bnb.data.decimals)
                : '—'}
            />
            <Card
              title="USDT"
              value={usdt.data !== undefined ? money(usdt.data) : '—'}
            />
            <Card
              title="SGT"
              value={sgt.data !== undefined ? money(sgt.data) : '—'}
            />
          </div>

          <p className="muted">
            {t(
              'این بخش فقط موجودی را می‌خواند و هیچ انتقالی انجام نمی‌دهد.',
              'This section only reads balances. It does not transfer funds.'
            )}
          </p>
        </section>
      )}

      {tab === 'smart' && (
        <section className="panel">
          <h2>SmartGlobal Dashboard</h2>

          <div className="cards">
            <Card title="Account ID" value={accountId?.toString()} />
            <Card title="Gift Round" value={giftRound.data?.toString()} />
            <Card title="Gift List Size" value={giftSize.data?.toString()} />
            <Card
              title="Global Token Balance"
              value={globalTokens.data !== undefined
                ? money(globalTokens.data)
                : '—'}
            />
            <Card
              title="Bank USDT Balance"
              value={bankUsdt.data !== undefined
                ? money(bankUsdt.data)
                : '—'}
            />
          </div>

          <p className="muted">
            {t(
              'اطلاعات قرارداد فقط به شکل خواندنی نمایش داده می‌شود.',
              'Contract information is displayed in read-only mode.'
            )}
          </p>
        </section>
      )}

      <section className="panel">
        <h2>{t('ابزارهای تحقیق', 'Research Tools')}</h2>
        <p>
          {t(
            'از جستجو برای یافتن ارزها و بررسی قیمت و ارزش بازار استفاده کن.',
            'Search coins and review prices and market capitalization.'
          )}
        </p>
        <p className="warning">
          {t(
            'قیمت‌ها اطلاعات بازار هستند و درآمد یا سود را تضمین نمی‌کنند. قبل از هر معامله تحقیق کن.',
            'Market data does not guarantee income or profit. Research before trading.'
          )}
        </p>
      </section>

      <footer>
        Crypto Explorer · Version 2
        <br />
        CoinGecko Market Data · BNB Smart Chain
        <br />
        Read-only dashboard · No automatic transactions
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f1f5f9;
          color: #172033;
          font-family: Arial, sans-serif;
        }

        .app {
          max-width: 900px;
          margin: auto;
          padding: 15px;
        }

        .top, .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .top h1 {
          margin: 0 0 5px;
          font-size: 25px;
        }

        .top p, .muted {
          color: #64748b;
          font-size: 13px;
        }

        .language, button {
          border: 0;
          border-radius: 9px;
          padding: 10px 14px;
          background: #1769aa;
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        button:disabled {
          opacity: .5;
        }

        .hero {
          background: linear-gradient(130deg, #123b69, #1769aa);
          color: white;
          padding: 22px;
          border-radius: 15px;
          margin: 18px 0;
        }

        .hero h2 {
          margin-top: 0;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }

        .hero-buttons button {
          background: #ffffff25;
          border: 1px solid #ffffff70;
        }

        .panel {
          background: white;
          border-radius: 14px;
          padding: 17px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px #0000000c;
          overflow-wrap: anywhere;
        }

        .panel h2 {
          font-size: 19px;
        }

        .section-heading h2 {
          margin: 0 0 12px;
        }

        .search {
          width: 100%;
          padding: 13px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          font-size: 15px;
          margin: 12px 0;
        }

        .auto-control {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          margin: 10px 0 16px;
        }

        .coin {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 2px;
          border-bottom: 1px solid #edf0f4;
        }

        .coin img {
          width: 30px;
          height: 30px;
        }

        .coin-name {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .coin-name small, .coin-price small {
          color: #64748b;
        }

        .coin-price {
          display: flex;
          flex-direction: column;
          text-align: end;
          gap: 4px;
          font-size: 13px;
        }

        .positive {
          color: #159447 !important;
        }

        .negative {
          color: #dc3545 !important;
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin: 15px 0;
        }

        .card {
          background: #f5f8fc;
          border-radius: 10px;
          padding: 14px;
          min-width: 0;
          margin-bottom: 9px;
          overflow-wrap: anywhere;
        }

        .card-value {
          display: block;
          font-size: 18px;
          margin: 8px 0;
        }

        .card small {
          color: #64748b;
        }

        .main-button {
          width: 100%;
          margin: 10px 0;
        }

        .warning {
          background: #fff7e6;
          color: #8a5700;
          border-radius: 9px;
          padding: 12px;
          line-height: 1.8;
          font-size: 13px;
        }

        .error {
          color: #b42318;
          background: #fff0ef;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        footer {
          text-align: center;
          color: #64748b;
          font-size: 12px;
          line-height: 1.9;
          padding: 20px 5px;
        }

        @media(max-width: 500px) {
          .app {
            padding: 10px;
          }

          .panel {
            padding: 13px;
          }

          .cards {
            grid-template-columns: 1fr 1fr;
          }

          .coin-price {
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
