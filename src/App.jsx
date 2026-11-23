
import React, { useEffect, useMemo, useState } from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useBalance, useReadContract } from 'wagmi';

import { CHAIN_ID, CONTRACTS } from './contracts/addresses';
import { erc20Abi, bankAbi, payAbi } from './contracts/abi';
import { num, usd, tok, field, pct } from './utils/format';
import {
  fetchMarketCoins,
  searchMarketAssets,
  fetchCoinMarket,
} from './services/market';

const REFRESH_MS = 30000;

const Panel = ({ title, children }) => (
  <section className="panel">
    <h2>{title}</h2>
    {children}
  </section>
);

const Stat = ({ label, value }) => (
  <div className="stat">
    <small>{label}</small>
    <b>{value ?? '—'}</b>
  </div>
);

const Row = ({ label, value }) => (
  <div className="row">
    <span>{label}</span>
    <b>{value ?? '—'}</b>
  </div>
);

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const enabled = Boolean(
    isConnected && address && Number(chainId) === CHAIN_ID
  );

  const [tab, setTab] = useState('market');
  const [lang, setLang] = useState('fa');

  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [picked, setPicked] = useState(null);
  const [loading, setLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [lastMarketUpdate, setLastMarketUpdate] = useState('');

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ce-favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ce-alerts') || '[]');
    } catch {
      return [];
    }
  });

  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [alertCoin, setAlertCoin] = useState('bitcoin');
  const [alertPrice, setAlertPrice] = useState('');

  const [modes, setModes] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('smartglobal-modes') || '{}'
      );
      const valid = (key) =>
        ['OFF', 'MANUAL', 'AUTO'].includes(saved[key])
          ? saved[key]
          : 'OFF';

      return {
        gift: valid('gift'),
        distribute: valid('distribute'),
        pay: valid('pay'),
      };
    } catch {
      return { gift: 'OFF', distribute: 'OFF', pay: 'OFF' };
    }
  });

  const [lastRefresh, setLastRefresh] = useState('');
  const [notice, setNotice] = useState('');

  const fa = lang === 'fa';

  const t = fa
    ? {
        title: 'کاوشگر ارز دیجیتال',
        subtitle: 'قیمت ارزها، بررسی بازار و کیف پول',
        market: 'بازار',
        favorites: 'علاقه‌مندی‌ها',
        wallet: 'کیف پول',
        smart: 'SmartGlobal',
        search: 'جستجوی نام، نماد یا آدرس قرارداد ارز...',
        refresh: 'تازه‌سازی',
        price: 'قیمت',
        change: 'تغییر ۲۴ ساعته',
        cap: 'ارزش بازار',
        alerts: 'هشدار قیمت',
        target: 'قیمت هدف به دالر',
        add: 'افزودن',
        connect: 'اتصال کیف پول',
        account: 'اطلاعات حساب',
        gift: 'اطلاعات Gift',
        pay: 'اطلاعات Pay Reward',
        modes: 'حالت‌های SmartGlobal',
        safe: 'این برنامه اطلاعات را می‌خواند و هیچ تراکنشی را خودکار ارسال نمی‌کند.',
        loading: 'در حال دریافت اطلاعات...',
        noResults: 'نتیجه‌ای پیدا نشد.',
        network: 'شبکه',
        address: 'آدرس کیف پول',
        close: 'بستن جزئیات',
        source: 'منبع',
        liquidity: 'نقدینگی',
        rank: 'رتبه بازار',
        update: 'آخرین به‌روزرسانی',
        alertNote: 'هشدارها در داخل برنامه بررسی می‌شوند؛ اعلان بیرونی در این نسخه فعال نیست.',
      }
    : {
        title: 'Crypto Explorer',
        subtitle: 'Prices, market research and wallet',
        market: 'Market',
        favorites: 'Favorites',
        wallet: 'Wallet',
        smart: 'SmartGlobal',
        search: 'Search by name, symbol or contract address...',
        refresh: 'Refresh',
        price: 'Price',
        change: '24h change',
        cap: 'Market cap',
        alerts: 'Price alerts',
        target: 'Target price USD',
        add: 'Add',
        connect: 'Connect wallet',
        account: 'Account information',
        gift: 'Gift information',
        pay: 'Pay Reward information',
        modes: 'SmartGlobal modes',
        safe: 'This app reads information and does not automatically send transactions.',
        loading: 'Loading information...',
        noResults: 'No results found.',
        network: 'Network',
        address: 'Wallet address',
        close: 'Close details',
        source: 'Source',
        liquidity: 'Liquidity',
        rank: 'Market rank',
        update: 'Last update',
        alertNote: 'Alerts are checked inside the app; external notifications are not enabled in this version.',
      };

  // کیف پول و موجودی‌ها
  const bnb = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: REFRESH_MS },
  });

  const usdt = useReadContract({
    address: CONTRACTS.USDT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: REFRESH_MS },
  });

  const sgt = useReadContract({
    address: CONTRACTS.SGT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled, refetchInterval: REFRESH_MS },
  });

  // اطلاعات عمومی SmartGlobal
  const readOptions = {
    refetchInterval: REFRESH_MS,
    retry: 1,
  };

  const round = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: '_currentGiftRound',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  const size = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'giftListSize',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  const global = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'globalTokenBalance',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  const bankUSD = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'usdtBalance',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  const owner = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'ownerInfo',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { ...readOptions, enabled },
  });

  const accountId = field(owner.data, 'ID', 0);

  const gift = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'ownerBankInfo',
    args: accountId !== undefined ? [accountId] : undefined,
    chainId: CHAIN_ID,
    query: {
      ...readOptions,
      enabled: enabled && accountId !== undefined && BigInt(accountId) > 0n,
    },
  });

  const status = useReadContract({
    address: CONTRACTS.PAY,
    abi: payAbi,
    functionName: 'ownerStatus',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { ...readOptions, enabled },
  });

  const points = useReadContract({
    address: CONTRACTS.PAY,
    abi: payAbi,
    functionName: 'ownerAllPoint',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { ...readOptions, enabled },
  });

  const hours = useReadContract({
    address: CONTRACTS.PAY,
    abi: payAbi,
    functionName: 'lastRewardTimePassed',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { ...readOptions, enabled },
  });

  const payUSD = useReadContract({
    address: CONTRACTS.PAY,
    abi: payAbi,
    functionName: 'justContractBalance',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  const proposal = useReadContract({
    address: CONTRACTS.BANK,
    abi: bankAbi,
    functionName: 'currentProposalStatus',
    chainId: CHAIN_ID,
    query: readOptions,
  });

  // دریافت بازار در شروع و هر ۳۰ ثانیه
  async function loadMarket() {
    setLoading(true);
    setMarketError('');

    try {
      const data = await fetchMarketCoins();
      setCoins(data);
      setLastMarketUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      setMarketError(
        'دریافت اطلاعات بازار ناموفق شد: ' +
          (error?.message || 'خطای شبکه')
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarket();

    const timer = setInterval(loadMarket, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setSearch('');
        setSearchResults([]);
        setSearchError('');
        setPicked(null);
        loadMarket();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // جستجوی خودکار پس از مکث کوتاه در تایپ
  useEffect(() => {
    const query = search.trim();
    let active = true;

    if (!query) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      return () => {
        active = false;
      };
    }

    setSearchLoading(true);
    setSearchError('');

    const timer = setTimeout(async () => {
      try {
        const results = await searchMarketAssets(query);
        if (active) setSearchResults(results);
      } catch (error) {
        if (active) {
          setSearchResults([]);
          setSearchError(
            'جستجو ناموفق شد: ' + (error?.message || 'خطای شبکه')
          );
        }
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  useEffect(() => {
    localStorage.setItem('ce-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('ce-alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('smartglobal-modes', JSON.stringify(modes));
  }, [modes]);

  // بررسی خودکار هشدارهای قیمت
  useEffect(() => {
    if (!coins.length || !alerts.length) return;

    const newlyTriggered = alerts.filter((alert) => {
      const coin = coins.find((item) => item.id === alert.coin);
      if (!coin) return false;

      const crossed =
        Number(coin.current_price) >= Number(alert.price);

      return crossed && !triggeredAlerts.includes(alert.id);
    });

    if (newlyTriggered.length) {
      setTriggeredAlerts((old) => [
        ...old,
        ...newlyTriggered.map((item) => item.id),
      ]);
    }
  }, [coins, alerts, triggeredAlerts]);

  const shown = useMemo(() => {
    if (search.trim()) return searchResults;

    if (tab === 'favorites') {
      return coins.filter((coin) => favorites.includes(coin.id));
    }

    return coins;
  }, [coins, favorites, search, searchResults, tab]);

  async function selectAsset(asset) {
    try {
      setPicked(null);

      const details = await fetchCoinMarket(asset);

      if (details) {
        setPicked(details);
        setSearch('');
        setSearchResults([]);
        setSearchError('');
      }
    } catch (error) {
      setSearchError(
        'دریافت جزئیات ارز ناموفق شد: ' +
          (error?.message || 'خطا')
      );
    }
  }

  function changeMode(key, value) {
    setModes((old) => ({ ...old, [key]: value }));
  }

  async function refreshAll() {
    await loadMarket();

    const queries = [
      round, size, global, bankUSD, owner, gift,
      status, points, hours, payUSD, proposal,
      bnb, usdt, sgt,
    ];

    await Promise.allSettled(
      queries.map((item) => item.refetch?.())
    );

    setLastRefresh(new Date().toLocaleString());
    setNotice('به‌روزرسانی انجام شد.');
  }

  const isDex = picked?.kind === 'dex';

  return (
    <main className="app" dir={fa ? 'rtl' : 'ltr'}>
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#0b1020;color:#eef2ff;font-family:Tahoma,Arial}
        .app{max-width:1100px;margin:auto;padding:14px;min-height:100vh}
        .top,.row,.mode{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        h1{font-size:23px}
        h2{font-size:17px;margin:0 0 12px}
        button,input,select{font:inherit}
        button{background:#18233d;color:white;border:1px solid #33415f;border-radius:9px;padding:9px 12px;cursor:pointer}
        button:hover{opacity:.85}
        .primary,.active{background:#2563eb}
        .nav,.controls,.modes{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}
        .panel{background:#121b30;border:1px solid #263653;border-radius:14px;padding:14px;margin:13px 0}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px}
        .stat{background:#192640;border:1px solid #2b3b5b;border-radius:10px;padding:11px;overflow-wrap:anywhere}
        .stat small{display:block;color:#9eacc8;margin-bottom:7px}
        .stat b{font-size:15px}
        .row{padding:10px 0;border-bottom:1px solid #263653}
        .controls input,.controls select{background:#0d1629;color:white;border:1px solid #33415f;border-radius:9px;padding:10px;min-width:120px}
        .controls input{flex:1}
        .tableWrap{overflow:auto}
        table{width:100%;min-width:590px;border-collapse:collapse}
        td,th{text-align:start;padding:10px 7px;border-bottom:1px solid #263653;font-size:13px}
        .coin{display:flex;gap:8px;align-items:center}
        .coin img{width:25px;height:25px;object-fit:contain}
        .green{color:#35d39a}.red,.error{color:#ff899d}
        .notice{background:#192640;padding:12px;border-radius:10px;font-size:12px;line-height:1.8;margin-top:10px}
        .chart{width:100%;height:110px;display:block}
        .mode{padding:10px 0;border-bottom:1px solid #263653}
        .muted{color:#9aa8c7;font-size:13px}
        .empty{text-align:center;padding:20px}
        footer{text-align:center;padding:20px;color:#91a1c2;font-size:12px}
        .assetButton{border:0;background:transparent;padding:4px;text-align:start}
        @media(max-width:600px){.app{padding:9px}.panel{padding:11px}.mode button{padding:7px}}
      `}</style>

      <header className="top">
        <div>
          <h1>🌐 {t.title}</h1>
          <div className="muted">
            {t.subtitle} · BNB Smart Chain
          </div>
        </div>

        <div className="controls">
          <button onClick={() => setLang(fa ? 'en' : 'fa')}>
            {fa ? 'English' : 'دری'}
          </button>

          <button
            className="primary"
            onClick={() => open({ view: 'Connect' })}
          >
            {isConnected ? 'Wallet connected' : t.connect}
          </button>
        </div>
      </header>

      <nav className="nav">
        {[
          ['market', t.market],
          ['favorites', t.favorites],
          ['wallet', t.wallet],
          ['smart', t.smart],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => {
              setTab(key);
              setPicked(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {(tab === 'market' || tab === 'favorites') && (
        <>
          <Panel title={t.market}>
            <div className="controls">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.search}
              />

              <button onClick={loadMarket}>{t.refresh}</button>
            </div>

            {loading && <p className="muted">{t.loading}</p>}
            {marketError && <p className="error">{marketError}</p>}
            {searchLoading && <p className="muted">{t.loading}</p>}
            {searchError && <p className="error">{searchError}</p>}

            {picked && (
              <div className="notice">
                <b>
                  {picked.name} ({picked.symbol?.toUpperCase()})
                </b>

                <div className="stats">
                  <Stat
                    label={t.price}
                    value={usd(picked.current_price)}
                  />
                  <Stat
                    label={t.change}
                    value={num(picked.price_change_percentage_24h) + '%'}
                  />
                  <Stat
                    label={t.cap}
                    value={usd(picked.market_cap)}
                  />
                  <Stat
                    label="24h High / Low"
                    value={`${usd(picked.high_24h)} / ${usd(picked.low_24h)}`}
                  />
                  {isDex && (
                    <Stat
                      label={t.liquidity}
                      value={usd(picked.liquidity)}
                    />
                  )}
                  {isDex && (
                    <Stat
                      label={t.network}
                      value={picked.network || picked.chainId}
                    />
                  )}
                </div>

                {picked.sparkline_in_7d?.price?.length > 1 && (
                  <svg
                    className="chart"
                    viewBox="0 0 700 100"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      points={picked.sparkline_in_7d.price
                        .map((price, index, array) => {
                          const min = Math.min(...array);
                          const max = Math.max(...array);
                          const y = 95 - ((price - min) / (max - min || 1)) * 85;
                          return `${index * 700 / (array.length - 1)},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                )}

                {isDex && picked.dexUrl && (
                  <p>
                    <a href={picked.dexUrl} target="_blank" rel="noreferrer">
                      مشاهده جفت معاملاتی در DexScreener
                    </a>
                  </p>
                )}

                <button onClick={() => setPicked(null)}>
                  {t.close}
                </button>
              </div>
            )}

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Coin / Token</th>
                    <th>{t.price}</th>
                    <th>{t.change}</th>
                    <th>{t.cap}</th>
                    <th>★</th>
                  </tr>
                </thead>

                <tbody>
                  {shown.map((coin, index) => (
                    <tr key={coin.id}>
                      <td>{coin.market_cap_rank || index + 1}</td>

                      <td>
                        <button
                          className="assetButton"
                          onClick={() => selectAsset(coin)}
                        >
                          <span className="coin">
                            {coin.image && (
                              <img src={coin.image} alt="" />
                            )}
                            {coin.name} {coin.symbol?.toUpperCase()}
                          </span>
                          <small className="muted">
                            {coin.network || coin.source || ''}
                          </small>
                        </button>
                      </td>

                      <td>
                        {coin.current_price
                          ? usd(coin.current_price)
                          : '—'}
                      </td>

                      <td
                        className={
                          Number(coin.price_change_percentage_24h) >= 0
                            ? 'green'
                            : 'red'
                        }
                      >
                        {coin.price_change_percentage_24h == null
                          ? '—'
                          : num(coin.price_change_percentage_24h) + '%'}
                      </td>

                      <td>
                        {coin.market_cap ? usd(coin.market_cap) : '—'}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            setFavorites((old) =>
                              old.includes(coin.id)
                                ? old.filter((item) => item !== coin.id)
                                : [...old, coin.id]
                            )
                          }
                        >
                          {favorites.includes(coin.id) ? '★' : '☆'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!shown.length && !loading && !searchLoading && (
                <p className="empty">{t.noResults}</p>
              )}
            </div>

            <p className="muted">
              {t.update}: {lastMarketUpdate || '—'}
            </p>
          </Panel>

          <Panel title={t.alerts}>
            <div className="controls">
              <select
                value={alertCoin}
                onChange={(event) => setAlertCoin(event.target.value)}
              >
                {coins.map((coin) => (
                  <option key={coin.id} value={coin.id}>
                    {coin.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={alertPrice}
                onChange={(event) => setAlertPrice(event.target.value)}
                placeholder={t.target}
              />

              <button
                className="primary"
                onClick={() => {
                  const price = Number(alertPrice);
                  if (price > 0) {
                    setAlerts((old) => [
                      ...old,
                      {
                        id: String(Date.now()),
                        coin: alertCoin,
                        price,
                      },
                    ]);
                    setAlertPrice('');
                  }
                }}
              >
                {t.add}
              </button>
            </div>

            {alerts.map((alert) => (
              <Row
                key={alert.id}
                label={
                  coins.find((coin) => coin.id === alert.coin)?.name ||
                  alert.coin
                }
                value={
                  <>
                    {usd(alert.price)}
                    {triggeredAlerts.includes(alert.id) && (
                      <span className="green"> · Reached</span>
                    )}
                    <button
                      onClick={() => {
                        setAlerts((old) =>
                          old.filter((item) => item.id !== alert.id)
                        );
                        setTriggeredAlerts((old) =>
                          old.filter((id) => id !== alert.id)
                        );
                      }}
                    >
                      ×
                    </button>
                  </>
                }
              />
            ))}

            <p className="muted">{t.alertNote}</p>
          </Panel>
        </>
      )}

      {tab === 'wallet' && (
        <Panel title={t.wallet}>
          {!isConnected ? (
            <button
              className="primary"
              onClick={() => open({ view: 'Connect' })}
            >
              {t.connect}
            </button>
          ) : (
            <>
              <Row
                label={t.network}
                value={`${Number(chainId) === CHAIN_ID ? 'BNB Smart Chain' : 'Other'} (${chainId})`}
              />

              <Row label={t.address} value={address} />

              <div className="stats">
                <Stat
                  label="BNB"
                  value={bnb.data ? bnb.data.formatted : '—'}
                />
                <Stat label="USDT" value={tok(usdt.data)} />
                <Stat label="SGT" value={tok(sgt.data)} />
              </div>
            </>
          )}

          <div className="notice">{t.safe}</div>
        </Panel>
      )}

      {tab === 'smart' && (
        <>
          <Panel title={t.smart}>
            <div className="stats">
              <Stat label="Gift Round" value={round.data?.toString()} />
              <Stat label="Gift List Size" value={size.data?.toString()} />
              <Stat
                label="Global Token Balance"
                value={tok(global.data)}
              />
              <Stat label="Bank USDT" value={tok(bankUSD.data)} />
            </div>
          </Panel>

          <Panel title={t.account}>
            {!isConnected ? (
              <button
                className="primary"
                onClick={() => open({ view: 'Connect' })}
              >
                {t.connect}
              </button>
            ) : (
              <>
                <Row label="Account ID" value={accountId?.toString()} />

                <div className="stats">
                  <Stat
                    label="Total Left"
                    value={field(owner.data, 'Total_Left', 1)?.toString()}
                  />
                  <Stat
                    label="Total Right"
                    value={field(owner.data, 'Total_Right', 2)?.toString()}
                  />
                  <Stat
                    label="Current Left"
                    value={field(owner.data, 'Current_Left', 3)?.toString()}
                  />
                  <Stat
                    label="Current Right"
                    value={field(owner.data, 'Current_Right', 4)?.toString()}
                  />
                  <Stat
                    label="Directs"
                    value={field(owner.data, 'Directs_Count', 5)?.toString()}
                  />
                </div>
              </>
            )}
          </Panel>

          <Panel title={t.gift}>
            <div className="stats">
              <Stat label="Gift received USDT" value={tok(gift.data?.[0])} />
              <Stat label="Days since Gift" value={gift.data?.[1]?.toString()} />
              <Stat label="Free Token" value={pct(gift.data?.[2])} />
              <Stat label="Caller reward USDT" value={tok(gift.data?.[3])} />
              <Stat label="Hours since Caller" value={gift.data?.[4]?.toString()} />
              <Stat label="Hours since buy" value={gift.data?.[5]?.toString()} />
              {[6, 7, 8, 9].map((index) => (
                <Stat
                  key={index}
                  label={`Tier ${index - 5}`}
                  value={pct(gift.data?.[index])}
                />
              ))}
            </div>
          </Panel>

          <Panel title={t.pay}>
            <div className="stats">
              <Stat label="Pay status" value={pct(status.data)} />
              <Stat label="Points" value={points.data?.toString()} />
              <Stat label="Hours since Reward" value={hours.data?.toString()} />
              <Stat label="Pay contract balance" value={tok(payUSD.data)} />
            </div>

            <p className="notice">
              ABI و داده‌های قرارداد Pay هنوز مستقل تأیید نشده‌اند؛
              ارقام این بخش را قطعی در نظر نگیرید.
            </p>
          </Panel>

          <Panel title={t.modes}>
            {[
              ['gift', 'Gift'],
              ['distribute', 'Distribute'],
              ['pay', 'Pay Reward'],
            ].map(([key, label]) => (
              <div className="mode" key={key}>
                <b>{label}</b>
                <div className="modes">
                  {['OFF', 'MANUAL', 'AUTO'].map((mode) => (
                    <button
                      key={mode}
                      className={modes[key] === mode ? 'primary' : ''}
                      onClick={() => changeMode(key, mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <p className="notice">
              اطلاعات SmartGlobal به‌صورت خودکار هر ۳۰ ثانیه تازه می‌شود.
              حالت AUTO فقط حالت نمایش و بررسی اطلاعات است.
              هیچ تراکنشی خودکار ارسال نمی‌شود.
            </p>

            <Row
              label="Proposal target"
              value={field(proposal.data, 'target', 0)}
            />

            <Row
              label="Proposal type / stage"
              value={`${field(proposal.data, 'pType', 1) ?? '—'} / ${field(proposal.data, 'stage', 4) ?? '—'}`}
            />

            <button className="primary" onClick={refreshAll}>
              {t.refresh}
            </button>

            <p className="muted">
              Last refresh: {lastRefresh || 'Automatic'}
            </p>

            {notice && <p className="notice">{notice}</p>}
          </Panel>

          <p className="notice">{t.safe}</p>
        </>
      )}

      <footer>
        Crypto Explorer · SmartGlobal · BNB Smart Chain · Read-only
      </footer>
    </main>
  );
}
