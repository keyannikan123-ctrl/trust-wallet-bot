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
        liquidity: 'نقدینگی',
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
        liquidity: 'Liquidity',
        update: 'Last update',
        alertNote: 'Alerts are checked inside the app; external notifications are not enabled in this version.',
      };

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

  const ownerError =
    owner.error?.shortMessage ||
    owner.error?.cause?.shortMessage ||
    owner.error?.message ||
    'خطایی گزارش نشده است';

  const ownerDataText = owner.data
    ? JSON.stringify(
        owner.data,
        (_, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        2
      )
    : 'داده‌ای دریافت نشده است';

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>🌐 کاوشگر ارز دیجیتال</h1>
          <p>قیمت ارزها، بررسی بازار و کیف پول · BNB Smart Chain</p>
        </div>

        <button onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}>
          {language === 'fa' ? 'English' : 'فارسی'}
        </button>
      </header>

      <nav className="tabs">
        {[
          ['market', t.market],
          ['favorites', t.favorites],
          ['wallet', t.wallet],
          ['smart', t.smart],
          ['alerts', t.alerts],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => {
              setTab(key);
              setSearch('');
              setSearchResults([]);
              setPicked(null);
              setSearchError('');
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'market' && (
        <Panel title={t.market}>
          <div className="search-row">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPicked(null);
              }}
              placeholder="جستجوی نام، نماد یا آدرس قرارداد ارز..."
            />

            <button onClick={loadMarket}>{t.refresh}</button>
          </div>

          {searchLoading && <p className="muted">در حال جستجو...</p>}
          {searchError && <p className="notice">{searchError}</p>}

          {picked && (
            <div className="detail">
              <h3>{picked.name || picked.symbol}</h3>
              <p>قیمت: ${Number(picked.current_price || 0).toLocaleString()}</p>
              <p>تغییر ۲۴ ساعته: {picked.price_change_percentage_24h ?? '—'}%</p>
              <p>ارزش بازار: ${Number(picked.market_cap || 0).toLocaleString()}</p>
              <button onClick={() => setPicked(null)}>بستن جزئیات</button>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Coin / Token</th>
                  <th>قیمت</th>
                  <th>تغییر ۲۴ ساعته</th>
                  <th>ارزش بازار</th>
                  <th>★</th>
                </tr>
              </thead>

              <tbody>
                {shown.map((coin, index) => (
                  <tr key={coin.id}>
                    <td>{index + 1}</td>
                    <td>
                      <button
                        className="coin-name"
                        onClick={() => selectAsset(coin)}
                      >
                        {coin.name} ({coin.symbol?.toUpperCase()})
                      </button>
                    </td>
                    <td>${Number(coin.current_price || 0).toLocaleString()}</td>
                    <td>
                      {coin.price_change_percentage_24h == null
                        ? '—'
                        : `${Number(coin.price_change_percentage_24h).toFixed(2)}%`}
                    </td>
                    <td>${Number(coin.market_cap || 0).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() =>
                          setFavorites((old) =>
                            old.includes(coin.id)
                              ? old.filter((id) => id !== coin.id)
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
          </div>

          {loading && <p className="muted">در حال دریافت اطلاعات...</p>}
          {marketError && <p className="notice">{marketError}</p>}
          {!loading && shown.length === 0 && (
            <p className="muted">نتیجه‌ای پیدا نشد.</p>
          )}
        </Panel>
      )}

      {tab === 'favorites' && (
        <Panel title={t.favorites}>
          {coins
            .filter((coin) => favorites.includes(coin.id))
            .map((coin) => (
              <Row
                key={coin.id}
                label={`${coin.name} (${coin.symbol?.toUpperCase()})`}
                value={`$${Number(coin.current_price || 0).toLocaleString()}`}
              />
            ))}

          {favorites.length === 0 && (
            <p className="muted">هنوز ارزی به علاقه‌مندی‌ها اضافه نشده است.</p>
          )}
        </Panel>
      )}

      {tab === 'alerts' && (
        <Panel title={t.alerts}>
          <select
            value={alertCoin}
            onChange={(event) => setAlertCoin(event.target.value)}
          >
            <option value="">انتخاب ارز</option>
            {coins.map((coin) => (
              <option key={coin.id} value={coin.id}>
                {coin.name} ({coin.symbol?.toUpperCase()})
              </option>
            ))}
          </select>

          <input
            type="number"
            value={alertPrice}
            onChange={(event) => setAlertPrice(event.target.value)}
            placeholder="قیمت هدف به دالر"
          />

          <button
            className="primary"
            onClick={() => {
              if (!alertCoin || !alertPrice || Number(alertPrice) <= 0) {
                setNotice('لطفاً ارز و قیمت معتبر انتخاب کنید.');
                return;
              }

              const newAlert = {
                id: Date.now(),
                coin: alertCoin,
                price: Number(alertPrice),
              };

              setAlerts((old) => [...old, newAlert]);
              setAlertPrice('');
              setNotice('هشدار قیمت اضافه شد.');
            }}
          >
            افزودن هشدار
          </button>

          {alerts.map((alert) => {
            const coin = coins.find((item) => item.id === alert.coin);

            return (
              <Row
                key={alert.id}
                label={`${coin?.name || alert.coin} — هدف $${alert.price}`}
                value={
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
                    حذف
                  </button>
                }
              />
            );
          })}

          <p className="muted">{t.alertNote}</p>
        </Panel>
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
                <Stat label="BNB" value={bnb.data ? bnb.data.formatted : '—'} />
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
              <Stat label="Global Token Balance" value={tok(global.data)} />
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
                  <Stat label="Total Left" value={field(owner.data, 'Total_Left', 1)?.toString()} />
                  <Stat label="Total Right" value={field(owner.data, 'Total_Right', 2)?.toString()} />
                  <Stat label="Current Left" value={field(owner.data, 'Current_Left', 3)?.toString()} />
                  <Stat label="Current Right" value={field(owner.data, 'Current_Right', 4)?.toString()} />
                  <Stat label="Directs" value={field(owner.data, 'Directs_Count', 5)?.toString()} />
                </div>
              </>
            )}
          </Panel>

          <Panel title="بررسی فنی اطلاعات حساب">
            <Row label="Wallet connected" value={isConnected ? 'Yes' : 'No'} />
            <Row label="BNB Smart Chain" value={Number(chainId) === CHAIN_ID ? 'Yes' : 'No'} />
            <Row label="Read enabled" value={enabled ? 'Yes' : 'No'} />
            <Row label="Owner loading" value={owner.isLoading ? 'Yes' : 'No'} />
            <Row label="Owner error" value={owner.isError ? 'Yes' : 'No'} />
            <p className="muted">پیام خطا:</p>
            <pre className="diagnostic">{ownerError}</pre>
            <p className="muted">داده خام برگشتی از قرارداد:</p>
            <pre className="diagnostic">{ownerDataText}</pre>
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
              اطلاعات SmartGlobal هر ۳۰ ثانیه تازه می‌شود.
              حالت AUTO فقط برای تازه‌سازی و بررسی اطلاعات است.
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
