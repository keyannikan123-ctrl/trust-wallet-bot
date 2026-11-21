import React, { useEffect, useMemo, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useBalance, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const API = 'https://crypto-explorer-api.keyannikan123.workers.dev/api/v3';
const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';

const erc20Abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] }
];

const bankAbi = [
  { type: 'function', name: '_currentGiftRound', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'giftListSize', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'globalTokenBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdtBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'ownerInfo', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'id', type: 'uint64' },
      { name: 'totalLeft', type: 'uint32' },
      { name: 'totalRight', type: 'uint32' },
      { name: 'currentLeft', type: 'uint32' },
      { name: 'currentRight', type: 'uint32' },
      { name: 'directsCount', type: 'uint8' },
      { name: 'isRightSide', type: 'bool' },
      { name: 'upLine', type: 'address' },
      { name: 'left', type: 'address' },
      { name: 'right', type: 'address' }
    ]
  },
  {
    type: 'function', name: 'ownerBankInfo', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint64' }],
    outputs: [
      { name: 'totalGiftReceived', type: 'uint256' },
      { name: 'daysSinceLastGift', type: 'uint256' },
      { name: 'freeToken', type: 'bool' },
      { name: 'callerReward', type: 'uint256' },
      { name: 'hoursSinceCaller', type: 'uint256' },
      { name: 'hoursSinceBuy', type: 'uint256' },
      { name: 'tier1', type: 'bool' },
      { name: 'tier2', type: 'bool' },
      { name: 'tier3', type: 'bool' },
      { name: 'tier4', type: 'bool' }
    ]
  },
  {
    type: 'function', name: 'giftInfo', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [
      { name: 'giftReceived', type: 'uint256' },
      { name: 'giftTime', type: 'uint256' },
      { name: 'giftCount', type: 'uint256' }
    ]
  }
];

const payAbi = [
  { type: 'function', name: 'ownerStatus', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'ownerAllPoint', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastRewardTimePassed', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];

const coinsUrl = `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`;
const money = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US', { maximumFractionDigits: Number(n) < 1 ? 6 : 2 }) : '—';
const usd = (n) => Number.isFinite(Number(n)) ? '$' + money(n) : '—';
const short = (s) => s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '—';
const val = (v, decimals = 18) => v === undefined || v === null ? '—' : money(Number(formatUnits(BigInt(v), decimals)));

const Panel = ({ title, children, right }) => (
  <section className="panel">
    <div className="panel-head"><h2>{title}</h2>{right}</div>
    {children}
  </section>
);

const Stat = ({ label, value, note }) => (
  <div className="stat">
    <span>{label}</span>
    <strong>{value ?? '—'}</strong>
    {note && <small>{note}</small>}
  </div>
);

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const [tab, setTab] = useState('market');
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ce-favorites') || '[]'); }
    catch { return []; }
  });

  const [selected, setSelected] = useState(null);
  const [auto, setAuto] = useState(false);
  const [language, setLanguage] = useState('fa');

  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ce-alerts') || '[]'); }
    catch { return []; }
  });

  const [alertCoin, setAlertCoin] = useState('bitcoin');
  const [alertPrice, setAlertPrice] = useState('');

  const { data: bnbBalance } = useBalance({
    address,
    query: { enabled: !!address }
  });

  const { data: usdtBalance } = useReadContract({
    address: USDT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: sgtBalance } = useReadContract({
    address: SGT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: giftRound } = useReadContract({
    address: BANK, abi: bankAbi, functionName: '_currentGiftRound', chainId: 56
  });

  const { data: giftListSize } = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'giftListSize', chainId: 56
  });

  const { data: globalTokenBalance } = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'globalTokenBalance', chainId: 56
  });

  const { data: bankUsdt } = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'usdtBalance', chainId: 56
  });

  const { data: ownerInfo } = useReadContract({
    address: BANK,
    abi: bankAbi,
    functionName: 'ownerInfo',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const ownerId = ownerInfo?.[0];

  const { data: bankInfo } = useReadContract({
    address: BANK,
    abi: bankAbi,
    functionName: 'ownerBankInfo',
    args: ownerId !== undefined ? [ownerId] : undefined,
    chainId: 56,
    query: {
      enabled: ownerId !== undefined && BigInt(ownerId) > 0n
    }
  });

  const { data: giftInfo } = useReadContract({
    address: BANK,
    abi: bankAbi,
    functionName: 'giftInfo',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: payStatus } = useReadContract({
    address: PAY,
    abi: payAbi,
    functionName: 'ownerStatus',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: payPoints } = useReadContract({
    address: PAY,
    abi: payAbi,
    functionName: 'ownerAllPoint',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: rewardHours } = useReadContract({
    address: PAY,
    abi: payAbi,
    functionName: 'lastRewardTimePassed',
    args: [address],
    chainId: 56,
    query: { enabled: !!address }
  });

  const { data: payBalance } = useReadContract({
    address: PAY,
    abi: payAbi,
    functionName: 'justContractBalance',
    chainId: 56
  });

  const loadMarket = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(coinsUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid market data');

      setCoins(data);
    } catch (e) {
      setError('دریافت قیمت‌ها ناموفق شد. اتصال اینترنت یا API را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMarket(); }, []);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(loadMarket, 60000);
    return () => clearInterval(timer);
  }, [auto]);

  useEffect(() => {
    localStorage.setItem('ce-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ce-alerts', JSON.stringify(alerts));
  }, [alerts]);

  const shownCoins = useMemo(() => {
    let list = tab === 'favorites'
      ? coins.filter(c => favorites.includes(c.id))
      : coins;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.symbol?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [coins, favorites, search, tab]);

  const toggleFavorite = (id) => {
    setFavorites(old =>
      old.includes(id) ? old.filter(x => x !== id) : [...old, id]
    );
  };

  const addAlert = () => {
    const price = Number(alertPrice);
    if (!alertCoin || !Number.isFinite(price) || price <= 0) return;

    setAlerts(old => [
      ...old,
      { id: `${Date.now()}`, coin: alertCoin, price }
    ]);

    setAlertPrice('');
  };

  const selectedCoin = selected
    ? coins.find(c => c.id === selected)
    : null;

  const t = language === 'fa' ? {
    title: 'کاوشگر ارز دیجیتال',
    subtitle: 'قیمت ارزها، بررسی بازار و کیف پول',
    market: 'بازار',
    favorites: 'علاقه‌مندی‌ها',
    wallet: 'کیف پول',
    smart: 'SmartGlobal',
    search: 'جستجوی نام یا نماد ارز...',
    refresh: 'تازه‌سازی',
    auto: 'تازه‌سازی خودکار هر ۶۰ ثانیه',
    coin: 'ارز',
    price: 'قیمت',
    change: 'تغییر ۲۴ ساعته',
    marketCap: 'ارزش بازار',
    connect: 'اتصال کیف پول',
    disconnect: 'کیف پول متصل است',
    notConnected: 'کیف پول وصل نیست',
    network: 'شبکه',
    address: 'آدرس',
    bnb: 'موجودی BNB',
    usdt: 'موجودی USDT',
    sgt: 'موجودی SGT',
    account: 'اطلاعات حساب',
    gift: 'اطلاعات Gift',
    pay: 'اطلاعات Pay Reward',
    accountId: 'شناسه حساب',
    giftRound: 'دور Gift',
    giftSize: 'تعداد فهرست Gift',
    global: 'موجودی توکن عمومی',
    bankUsdt: 'موجودی USDT بانک',
    left: 'شاخه چپ',
    right: 'شاخه راست',
    directs: 'معرفی مستقیم',
    giftReceived: 'Gift دریافت‌شده',
    rewardStatus: 'وضعیت ثبت Pay Reward',
    points: 'امتیازها',
    hours: 'ساعت از آخرین Reward',
    payBalance: 'موجودی قرارداد Pay',
    alerts: 'هشدار قیمت',
    target: 'قیمت هدف به دالر',
    add: 'افزودن هشدار',
    noAlerts: 'هنوز هشداری ثبت نشده است',
    detail: 'جزئیات ارز',
    back: 'بازگشت',
    safe: 'این برنامه فقط اطلاعات را می‌خواند. هیچ انتقال، خرید یا تأیید تراکنش انجام نمی‌دهد.',
    warning: 'اطلاعات قرارداد به معنی تضمین درآمد یا تأیید امنیت پروژه نیست.',
    loading: 'در حال دریافت اطلاعات...',
    noData: 'اطلاعات موجود نیست'
  } : {
    title: 'Crypto Explorer',
    subtitle: 'Prices, market research and wallet dashboard',
    market: 'Market',
    favorites: 'Favorites',
    wallet: 'Wallet',
    smart: 'SmartGlobal',
    search: 'Search coin name or symbol...',
    refresh: 'Refresh',
    auto: 'Auto-refresh every 60 seconds',
    coin: 'Coin',
    price: 'Price',
    change: '24h change',
    marketCap: 'Market cap',
    connect: 'Connect wallet',
    disconnect: 'Wallet connected',
    notConnected: 'Wallet not connected',
    network: 'Network',
    address: 'Address',
    bnb: 'BNB balance',
    usdt: 'USDT balance',
    sgt: 'SGT balance',
    account: 'Account information',
    gift: 'Gift information',
    pay: 'Pay Reward information',
    accountId: 'Account ID',
    giftRound: 'Gift Round',
    giftSize: 'Gift List Size',
    global: 'Global Token Balance',
    bankUsdt: 'Bank USDT Balance',
    left: 'Left side',
    right: 'Right side',
    directs: 'Direct referrals',
    giftReceived: 'Gift received',
    rewardStatus: 'Pay Reward registered',
    points: 'Points',
    hours: 'Hours since last Reward',
    payBalance: 'Pay contract balance',
    alerts: 'Price alerts',
    target: 'Target price in USD',
    add: 'Add alert',
    noAlerts: 'No alerts saved yet',
    detail: 'Coin details',
    back: 'Back',
    safe: 'Read-only app. It does not send transfers, purchases or transaction approvals.',
    warning: 'Contract data does not guarantee income or prove project security.',
    loading: 'Loading information...',
    noData: 'No information available'
  };

  return (
    <div className="app" dir={language === 'fa' ? 'rtl' : 'ltr'}>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#0b1020;color:#eef2ff;font-family:Tahoma,Arial,sans-serif}
        .app{max-width:1120px;margin:auto;padding:20px;min-height:100vh;color:#eef2ff}
        .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        h1{font-size:25px;margin:0 0 7px}
        .sub{color:#9aa8c7;font-size:13px}
        button,input,select{font:inherit}
        button{border:1px solid #33415f;background:#18233d;color:#eef2ff;border-radius:10px;padding:10px 13px;cursor:pointer}
        button:hover{background:#253557}
        .primary{background:#2563eb;border-color:#2563eb}
        .nav{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
        .nav button.active{background:#2563eb;border-color:#2563eb}
        .panel{background:#121b30;border:1px solid #263653;border-radius:16px;padding:17px;margin:14px 0}
        .panel-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        .panel h2{font-size:17px;margin:0 0 14px}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
        .stat{background:#192640;border:1px solid #2b3b5b;border-radius:12px;padding:13px;min-width:0}
        .stat span{display:block;color:#9eacc8;font-size:12px;margin-bottom:8px}
        .stat strong{font-size:18px;overflow-wrap:anywhere}
        .stat small{display:block;color:#91a1c2;margin-top:5px}
        .controls{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
        .controls input,.controls select{background:#0d1629;border:1px solid #33415f;color:white;border-radius:10px;padding:11px;min-width:0}
        .controls input{flex:1;min-width:170px}
        .table-wrap{overflow:auto}
        table{width:100%;border-collapse:collapse;min-width:620px}
        th,td{text-align:start;padding:12px 9px;border-bottom:1px solid #273653;font-size:13px}
        th{color:#9eacc8;font-weight:normal}
        td strong{display:block}
        .coin{display:flex;align-items:center;gap:9px}
        .coin img{width:27px;height:27px}
        .green{color:#35d39a}
        .red{color:#ff7185}
        .star{font-size:19px;padding:3px 8px;background:transparent;border:0}
        .notice{color:#aab8d4;background:#192640;border-radius:10px;padding:12px;font-size:12px;line-height:1.8;margin-top:12px}
        .error{color:#ff9aa9}
        .muted{color:#91a1c2;font-size:13px}
        .rowline{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #263653;overflow-wrap:anywhere}
        .chart{width:100%;height:100px;margin-top:10px}
        .back{margin-bottom:12px}
        .empty{padding:25px;text-align:center;color:#9eacc8}
        @media(max-width:600px){
          .app{padding:13px}
          h1{font-size:21px}
          .panel{padding:13px}
          .top{align-items:flex-start}
        }
      `}</style>

      <header className="top">
        <div>
          <h1>🌐 {t.title}</h1>
          <div className="sub">{t.subtitle}</div>
        </div>

        <div className="controls" style={{ margin: 0 }}>
          <button onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}>
            {language === 'fa' ? 'English' : 'دری'}
          </button>

          <button className="primary" onClick={() => open({ view: 'Connect' })}>
            {isConnected ? t.disconnect : t.connect}
          </button>
        </div>
      </header>

      <nav className="nav">
        {[
          ['market', t.market],
          ['favorites', t.favorites],
          ['wallet', t.wallet],
          ['smart', t.smart]
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => { setTab(id); setSelected(null); }}
          >
            {label}
          </button>
        ))}
      </nav>

      {selectedCoin ? (
        <Panel
          title={t.detail}
          right={<button className="back" onClick={() => setSelected(null)}>{t.back}</button>}
        >
          <div className="coin">
            <img src={selectedCoin.image} alt="" />
            <div>
              <strong>{selectedCoin.name} ({selectedCoin.symbol?.toUpperCase()})</strong>
              <div className="muted">Rank #{selectedCoin.market_cap_rank || '—'}</div>
            </div>
          </div>

          <div className="stats" style={{ marginTop: 14 }}>
            <Stat label={t.price} value={usd(selectedCoin.current_price)} />
            <Stat label={t.change} value={`${money(selectedCoin.price_change_percentage_24h)}%`} />
            <Stat label={t.marketCap} value={usd(selectedCoin.market_cap)} />
            <Stat label="24h High / Low" value={`${usd(selectedCoin.high_24h)} / ${usd(selectedCoin.low_24h)}`} />
          </div>

          {selectedCoin.sparkline_in_7d?.price?.length > 1 && (
            <svg className="chart" viewBox="0 0 700 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                points={selectedCoin.sparkline_in_7d.price.map((p, i, a) =>
                  `${i * 700 / (a.length - 1)},${95 - (p - Math.min(...a)) / (Math.max(...a) - Math.min(...a) || 1) * 85}`
                ).join(' ')}
              />
            </svg>
          )}
        </Panel>
      ) : null}

      {(tab === 'market' || tab === 'favorites') && !selectedCoin && (
        <>
          <Panel
            title={tab === 'market' ? t.market : t.favorites}
            right={<button onClick={loadMarket}>{t.refresh}</button>}
          >
            <div className="controls">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.search}
              />

              <label className="muted">
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={e => setAuto(e.target.checked)}
                />
                {' '}{t.auto}
              </label>
            </div>

            {loading && <div className="empty">{t.loading}</div>}

            {error && (
              <div className="empty error">
                {error} <button onClick={loadMarket}>{t.refresh}</button>
              </div>
            )}

            {!loading && !error && shownCoins.length === 0 && (
              <div className="empty">{t.noData}</div>
            )}

            {!loading && !error && shownCoins.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t.coin}</th>
                      <th>{t.price}</th>
                      <th>{t.change}</th>
                      <th>{t.marketCap}</th>
                      <th>★</th>
                    </tr>
                  </thead>

                  <tbody>
                    {shownCoins.map(c => (
                      <tr key={c.id}>
                        <td>{c.market_cap_rank || '—'}</td>
                        <td>
                          <button
                            onClick={() => setSelected(c.id)}
                            style={{ padding: 0, border: 0, background: 'transparent', textAlign: 'start' }}
                          >
                            <span className="coin">
                              <img src={c.image} alt="" />
                              <span>
                                <strong>{c.name}</strong>
                                <small className="muted">{c.symbol?.toUpperCase()}</small>
                              </span>
                            </span>
                          </button>
                        </td>
                        <td>{usd(c.current_price)}</td>
                        <td className={Number(c.price_change_percentage_24h) >= 0 ? 'green' : 'red'}>
                          {money(c.price_change_percentage_24h)}%
                        </td>
                        <td>{usd(c.market_cap)}</td>
                        <td>
                          <button
                            className="star"
                            onClick={() => toggleFavorite(c.id)}
                            aria-label="favorite"
                          >
                            {favorites.includes(c.id) ? '★' : '☆'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={t.alerts}>
            <div className="controls">
              <select value={alertCoin} onChange={e => setAlertCoin(e.target.value)}>
                {coins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <input
                type="number"
                value={alertPrice}
                onChange={e => setAlertPrice(e.target.value)}
                placeholder={t.target}
              />

              <button className="primary" onClick={addAlert}>{t.add}</button>
            </div>

            {alerts.length === 0 ? (
              <div className="muted">{t.noAlerts}</div>
            ) : (
              alerts.map(a => (
                <div className="rowline" key={a.id}>
                  <span>{coins.find(c => c.id === a.coin)?.name || a.coin}</span>
                  <strong>{usd(a.price)}</strong>
                  <button onClick={() => setAlerts(old => old.filter(x => x.id !== a.id))}>✕</button>
                </div>
              ))
            )}

            <div className="muted" style={{ marginTop: 9 }}>
              هشدارها فقط هنگام باز بودن برنامه و تازه‌شدن قیمت‌ها قابل بررسی‌اند.
            </div>
          </Panel>
        </>
      )}

      {tab === 'wallet' && (
        <Panel title={t.wallet}>
          {!isConnected ? (
            <div className="empty">
              <p>{t.notConnected}</p>
              <button className="primary" onClick={() => open({ view: 'Connect' })}>
                {t.connect}
              </button>
            </div>
          ) : (
            <>
              <div className="rowline">
                <span>{t.network}</span>
                <strong>BNB Smart Chain (56)</strong>
              </div>

              <div className="rowline">
                <span>{t.address}</span>
                <strong>{short(address)}</strong>
              </div>

              <div className="stats" style={{ marginTop: 14 }}>
                <Stat label={t.bnb} value={bnbBalance ? `${money(bnbBalance.formatted)} BNB` : '—'} />
                <Stat label={t.usdt} value={val(usdtBalance, 18)} />
                <Stat label={t.sgt} value={val(sgtBalance, 18)} />
              </div>
            </>
          )}

          <div className="notice">{t.safe}</div>
        </Panel>
      )}

      {tab === 'smart' && (
        <React.Fragment>
          <Panel title={t.smart}>
            <div className="stats">
              <Stat label={t.giftRound} value={giftRound?.toString()} />
              <Stat label={t.giftSize} value={giftListSize?.toString()} />
              <Stat label={t.global} value={val(globalTokenBalance, 18)} />
              <Stat label={t.bankUsdt} value={val(bankUsdt, 18)} />
            </div>
          </Panel>

          <Panel title={t.account}>
            {!isConnected ? (
              <div className="empty">
                <button className="primary" onClick={() => open({ view: 'Connect' })}>
                  {t.connect}
                </button>
              </div>
            ) : (
              <>
                <div className="rowline">
                  <span>{t.accountId}</span>
                  <strong>{ownerId?.toString() || '—'}</strong>
                </div>

                <div className="stats">
                  <Stat label={t.left} value={ownerInfo?.[1]?.toString()} />
                  <Stat label={t.right} value={ownerInfo?.[2]?.toString()} />
                  <Stat label={t.directs} value={ownerInfo?.[5]?.toString()} />
                </div>
              </>
            )}
          </Panel>

          <Panel title={t.gift}>
            <div className="stats">
              <Stat
                label={t.giftReceived}
                value={bankInfo?.[0]?.toString() ?? giftInfo?.[0]?.toString()}
              />
              <Stat
                label="Free Token"
                value={bankInfo?.[2] === undefined ? '—' : bankInfo[2] ? 'Yes' : 'No'}
              />
              <Stat label="Caller Reward" value={bankInfo?.[3]?.toString()} />
              <Stat label="Days since Gift" value={bankInfo?.[1]?.toString()} />
            </div>
          </Panel>

          <Panel title={t.pay}>
            <div className="stats">
              <Stat
                label={t.rewardStatus}
                value={payStatus === undefined ? '—' : payStatus ? 'Yes' : 'No'}
              />
              <Stat label={t.points} value={payPoints?.toString()} />
              <Stat label={t.hours} value={rewardHours?.toString()} />
              <Stat label={t.payBalance} value={val(payBalance, 18)} />
            </div>

            <div className="notice">{t.warning}</div>
          </Panel>

          <div className="notice">{t.safe}</div>
        </React.Fragment>
      )}

      <footer className="muted" style={{ textAlign: 'center', padding: '18px 0' }}>
        Crypto Explorer · BNB Smart Chain · Read-only
      </footer>
    </div>
  );
        }
