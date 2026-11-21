import React, { useEffect, useMemo, useState } from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import {
  useBalance, useReadContract, useSimulateContract, useWriteContract,
  useWaitForTransactionReceipt
} from 'wagmi';
import { formatUnits } from 'viem';

const API = 'https://crypto-explorer-api.keyannikan123.workers.dev/api/v3';
const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const CHAIN = 56;

const erc20ABI = [{
  type: 'function', name: 'balanceOf', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }]
}];

const bankABI = [
  { type: 'function', name: '_currentGiftRound', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'giftListSize', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'globalTokenBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdtBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'ownerInfo', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ID', type: 'uint64' }, { name: 'Total_Left', type: 'uint32' },
      { name: 'Total_Right', type: 'uint32' }, { name: 'Current_Left', type: 'uint32' },
      { name: 'Current_Right', type: 'uint32' }, { name: 'Directs_Count', type: 'uint8' },
      { name: 'Is_Right_Side', type: 'bool' }, { name: 'UpLine_Address', type: 'address' },
      { name: 'Left_Address', type: 'address' }, { name: 'Right_Address', type: 'address' }
    ] },
  { type: 'function', name: 'ownerBankInfo', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint64' }],
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
    ] },
  { type: 'function', name: 'giftInfo', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'registerForGift', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'distributeBank', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

const payABI = [
  { type: 'function', name: 'ownerStatus', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'ownerAllPoint', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastRewardTimePassed', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'payReward', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

const fmt = (v, decimals = 18, max = 4) => {
  if (v === undefined || v === null) return 'â€”';
  try { return Number(formatUnits(BigInt(v), decimals)).toLocaleString('en-US', { maximumFractionDigits: max }); }
  catch { return String(v); }
};
const usd = v => v == null ? 'â€”' : '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });
const readLS = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};

function Metric({ label, value, note }) {
  return <div className="metric"><small>{label}</small><strong>{value ?? 'â€”'}</strong>{note && <small>{note}</small>}</div>;
}
function PriceChart({ points }) {
  if (!points?.length) return <div className="muted">Ù†Ù…ÙˆØ¯Ø§Ø± Ù…ÙˆØ¬ÙˆØ¯ Ù†ÛŒØ³Øª / Chart unavailable</div>;
  const vals = points.map(p => p[1]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const coords = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * 100},${90 - ((v - min) / (max - min || 1)) * 78}`).join(' ');
  return <svg viewBox="0 0 100 100" className="chart" role="img" aria-label="7 day price chart"><polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg>;
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const connected = Boolean(isConnected && address);
  const correctNetwork = Number(chainId) === CHAIN;

  const [lang, setLang] = useState('fa');
  const fa = lang === 'fa';
  const t = (d, e) => fa ? d : e;
  const [tab, setTab] = useState('market');
  const [coins, setCoins] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [autoMarket, setAutoMarket] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [chart, setChart] = useState([]);
  const [chartBusy, setChartBusy] = useState(false);
  const [chartError, setChartError] = useState('');
  const [favorites, setFavorites] = useState(() => readLS('ce_favorites_v3', []));
  const [alerts, setAlerts] = useState(() => readLS('ce_alerts_v3', []));
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState('above');
  const [notice, setNotice] = useState('');
  const [modes, setModes] = useState({ gift: 'OFF', distribute: 'OFF', reward: 'OFF' });
  const [txMessage, setTxMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  const bnb = useBalance({ address, query: { enabled: connected && correctNetwork, refetchInterval: 30000 } });
  const usdt = useReadContract({ address: USDT, abi: erc20ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: 30000 } });
  const sgt = useReadContract({ address: SGT, abi: erc20ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: 30000 } });

  const refreshMs = Object.values(modes).includes('AUTO') ? 30000 : false;
  const giftRound = useReadContract({ address: BANK, abi: bankABI, functionName: '_currentGiftRound', query: { refetchInterval: refreshMs } });
  const giftSize = useReadContract({ address: BANK, abi: bankABI, functionName: 'giftListSize', query: { refetchInterval: refreshMs } });
  const globalTokens = useReadContract({ address: BANK, abi: bankABI, functionName: 'globalTokenBalance', query: { refetchInterval: refreshMs } });
  const bankUsdt = useReadContract({ address: BANK, abi: bankABI, functionName: 'usdtBalance', query: { refetchInterval: refreshMs } });
  const owner = useReadContract({ address: BANK, abi: bankABI, functionName: 'ownerInfo', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: refreshMs } });
  const accountId = owner.data?.ID ?? owner.data?.[0];
  const bankInfo = useReadContract({ address: BANK, abi: bankABI, functionName: 'ownerBankInfo', args: accountId != null && BigInt(accountId) > 0n ? [BigInt(accountId)] : undefined, query: { enabled: connected && correctNetwork && accountId != null && BigInt(accountId) > 0n, refetchInterval: refreshMs } });
  const giftInfo = useReadContract({ address: BANK, abi: bankABI, functionName: 'giftInfo', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: refreshMs } });
  const rewardStatus = useReadContract({ address: PAY, abi: payABI, functionName: 'ownerStatus', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: refreshMs } });
  const rewardPoints = useReadContract({ address: PAY, abi: payABI, functionName: 'ownerAllPoint', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: refreshMs } });
  const rewardTime = useReadContract({ address: PAY, abi: payABI, functionName: 'lastRewardTimePassed', args: address ? [address] : undefined, query: { enabled: connected && correctNetwork, refetchInterval: refreshMs } });
  const payBalance = useReadContract({ address: PAY, abi: payABI, functionName: 'justContractBalance', query: { refetchInterval: refreshMs } });

  const giftSim = useSimulateContract({ chainId: CHAIN, address: BANK, abi: bankABI, functionName: 'registerForGift', query: { enabled: connected && correctNetwork && modes.gift === 'MANUAL' } });
  const distributeSim = useSimulateContract({ chainId: CHAIN, address: BANK, abi: bankABI, functionName: 'distributeBank', query: { enabled: connected && correctNetwork && modes.distribute === 'MANUAL' } });
  const rewardSim = useSimulateContract({ chainId: CHAIN, address: PAY, abi: payABI, functionName: 'payReward', query: { enabled: connected && correctNetwork && modes.reward === 'MANUAL' } });
  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash || undefined });

  async function loadMarket() {
    setLoading(true); setMarketError('');
    try {
      const r = await fetch(`${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`);
      if (!r.ok) throw new Error(r.status === 429 ? 'Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ø²ÛŒØ§Ø¯ Ø§Ø³ØªØ› Ú©Ù…ÛŒ Ø¨Ø¹Ø¯ Ø¯ÙˆØ¨Ø§Ø±Ù‡ ØªÙ„Ø§Ø´ Ú©Ù†.' : `Market API error (${r.status})`);
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error('Invalid market response');
      setCoins(data); setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) { setMarketError(e.message || 'Connection error'); }
    finally { setLoading(false); }
  }
  async function openCoin(coin) {
    setSelectedCoin(coin); setChart([]); setChartError(''); setAlertPrice('');
    setTab('detail'); setChartBusy(true);
    try {
      const r = await fetch(`${API}/coins/${coin.id}/market_chart?vs_currency=usd&days=7`);
      if (!r.ok) throw new Error(`Chart API error (${r.status})`);
      const data = await r.json(); setChart(data.prices || []);
    } catch (e) { setChartError(e.message); }
    finally { setChartBusy(false); }
  }

  useEffect(() => { loadMarket(); }, []);
  useEffect(() => {
    if (!autoMarket) return;
    const id = window.setInterval(loadMarket, 60000);
    return () => window.clearInterval(id);
  }, [autoMarket]);
  useEffect(() => { localStorage.setItem('ce_favorites_v3', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('ce_alerts_v3', JSON.stringify(alerts)); }, [alerts]);

  useEffect(() => {
    if (!coins.length || !alerts.length) return;
    const remaining = [];
    for (const a of alerts) {
      const c = coins.find(x => x.id === a.coinId);
      if (!c) { remaining.push(a); continue; }
      const hit = a.direction === 'above' ? c.current_price >= a.price : c.current_price <= a.price;
      if (hit) {
        const msg = `${c.name}: ${usd(c.current_price)} (alert ${a.direction} ${usd(a.price)})`;
        setNotice(msg);
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Crypto Explorer price alert', { body: msg });
      } else remaining.push(a);
    }
    if (remaining.length !== alerts.length) setAlerts(remaining);
  }, [coins]);

  const visibleCoins = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = coins.filter(c => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    if (tab === 'favorites') list = list.filter(c => favorites.includes(c.id));
    return list;
  }, [coins, search, tab, favorites]);

  function toggleFavorite(id) {
    setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  }
  async function addAlert() {
    const p = Number(alertPrice);
    if (!selectedCoin || !Number.isFinite(p) || p <= 0) return;
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    setAlerts(old => [...old, { id: `${selectedCoin.id}-${Date.now()}`, coinId: selectedCoin.id, price: p, direction: alertDirection }]);
    setAlertPrice('');
    setNotice(t('Ù‡Ø´Ø¯Ø§Ø± Ù‚ÛŒÙ…Øª Ø°Ø®ÛŒØ±Ù‡ Ø´Ø¯.', 'Price alert saved.'));
  }

  function setMode(key, value) {
    setModes(old => ({ ...old, [key]: value }));
    setTxMessage('');
  }
  async function sendTx(label, simulation) {
    if (!connected || !correctNetwork) { setTxMessage(t('Ø§ÙˆÙ„ Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø±Ø§ Ø¨Ù‡ BNB Chain ÙˆØµÙ„ Ú©Ù†.', 'Connect wallet to BNB Chain first.')); return; }
    if (!simulation?.data?.request) { setTxMessage(t('Ø´Ø¨ÛŒÙ‡â€ŒØ³Ø§Ø²ÛŒ Ù…ÙˆÙÙ‚ Ù†ÛŒØ³Øª ÛŒØ§ Ø­Ø³Ø§Ø¨ ÙˆØ§Ø¬Ø¯ Ø´Ø±Ø§ÛŒØ· Ù†ÛŒØ³Øª. ØªØ±Ø§Ú©Ù†Ø´ Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯.', 'Simulation failed or account is not eligible. No transaction sent.')); return; }
    const ok = window.confirm(t(`Ø¯Ø±Ø®ÙˆØ§Ø³Øª ${label} Ø±Ø§ Ø¯Ø± Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø¨Ø§Ø² Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ…. Ù‚Ø¨Ù„ Ø§Ø² ØªØ£ÛŒÛŒØ¯ØŒ Ù…Ù‚Ø¯Ø§Ø± Ú¯Ø³ Ùˆ Ø¬Ø²Ø¦ÛŒØ§Øª Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†. Ø§Ø¯Ø§Ù…Ù‡ØŸ`, `Open ${label} transaction in your wallet? Review gas and details before approving.`));
    if (!ok) return;
    try {
      setTxMessage(t('Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø± ØªØ£ÛŒÛŒØ¯ Ø¯Ø± Ú©ÛŒÙ Ù¾ÙˆÙ„â€¦', 'Waiting for wallet confirmationâ€¦'));
      const hash = await writeContractAsync(simulation.data.request);
      setTxHash(hash); setTxMessage(`${t('ØªØ±Ø§Ú©Ù†Ø´ ÙØ±Ø³ØªØ§Ø¯Ù‡ Ø´Ø¯: ', 'Transaction submitted: ')}${hash}`);
    } catch (e) { setTxMessage(e.shortMessage || e.message || 'Transaction cancelled/failed'); }
  }

  const actions = [
    { key: 'gift', title: 'Gift Â· registerForGift', sim: giftSim, desc: t('Ø«Ø¨Øª Ø¯Ø±Ø®ÙˆØ§Ø³Øª Gift Ø¯Ø± Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø¨Ø§Ù†Ú©Ø› Ø¯Ø±ÛŒØ§ÙØª Ù¾ÙˆÙ„ ØªØ¶Ù…ÛŒÙ† Ù†ÛŒØ³Øª.', 'Register a Gift request; payout is not guaranteed.') },
    { key: 'distribute', title: 'Distribute Â· distributeBank', sim: distributeSim, desc: t('Ø§Ø¬Ø±Ø§ÛŒ ØªÙˆØ²ÛŒØ¹ Ø·Ø¨Ù‚ Ø´Ø±Ø§ÛŒØ· Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯Ø› Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø­Ø³Ø§Ø¨ ÙˆØ§Ø¬Ø¯ Ø´Ø±Ø§ÛŒØ· Ù†Ø¨Ø§Ø´Ø¯.', 'Run distribution subject to contract rules and eligibility.') },
    { key: 'reward', title: 'Pay Reward Â· payReward', sim: rewardSim, desc: t('Ø¯Ø±Ø®ÙˆØ§Ø³Øª Ù¾Ø§Ø¯Ø§Ø´Ø› Ù…Ù‚Ø¯Ø§Ø± Ùˆ Ø¯Ø±ÛŒØ§ÙØª Ø¢Ù† ØªØ¶Ù…ÛŒÙ† Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.', 'Request reward; amount and payout are not guaranteed.') }
  ];

  return (
    <main className="app" dir={fa ? 'rtl' : 'ltr'}>
      <header className="top">
        <div><h1>Crypto Explorer</h1><p>SmartGlobal Â· BNB Smart Chain</p></div>
        <button className="soft" onClick={() => setLang(fa ? 'en' : 'fa')}>{fa ? 'English' : 'Ø¯Ø±ÛŒ'}</button>
      </header>

      <section className="hero">
        <h2>{t('Ø¨Ø§Ø²Ø§Ø± Ø§Ø±Ø²Ù‡Ø§ÛŒ Ø¯ÛŒØ¬ÛŒØªØ§Ù„', 'Crypto Market')}</h2>
        <p>{t('Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§ØŒ Ø¨Ø±Ø±Ø³ÛŒ Ø§Ø±Ø²Ù‡Ø§ Ùˆ Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ú©ÛŒÙ Ù¾ÙˆÙ„', 'Prices, coin research and wallet dashboard')}</p>
        <nav className="tabs">
          {[
            ['market', t('Ø¨Ø§Ø²Ø§Ø±', 'Market')], ['favorites', t('Ø¹Ù„Ø§Ù‚Ù‡â€ŒÙ…Ù†Ø¯ÛŒâ€ŒÙ‡Ø§', 'Favorites')],
            ['wallet', t('Ú©ÛŒÙ Ù¾ÙˆÙ„', 'Wallet')], ['smart', 'SmartGlobal']
          ].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
      </section>

      {(tab === 'market' || tab === 'favorites') && <section className="panel">
        <div className="heading"><h2>{tab === 'favorites' ? t('Ø§Ø±Ø²Ù‡Ø§ÛŒ Ù…ÙˆØ±Ø¯ Ø¹Ù„Ø§Ù‚Ù‡', 'Watchlist') : t('Ù‚ÛŒÙ…Øª Ø§Ø±Ø²Ù‡Ø§', 'Market prices')}</h2><button onClick={loadMarket} disabled={loading}>{loading ? 'â€¦' : t('ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ', 'Refresh')}</button></div>
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Ù†Ø§Ù… ÛŒØ§ Ù†Ù…Ø§Ø¯ Ø§Ø±Ø² Ø±Ø§ Ø¬Ø³ØªØ¬Ùˆ Ú©Ù†', 'Search coin name or symbol')} />
        <label className="check"><input type="checkbox" checked={autoMarket} onChange={e => setAutoMarket(e.target.checked)} />{t('ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ù‡Ø± Û¶Û° Ø«Ø§Ù†ÛŒÙ‡', 'Auto refresh every 60 seconds')}</label>
        {marketError && <p className="error">{marketError}</p>}
        {loading && !coins.length && <p>{t('Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§â€¦', 'Loading market dataâ€¦')}</p>}
        <div className="coin-list">{visibleCoins.map(c => <div className="coin" key={c.id}>
          <button className="star" onClick={() => toggleFavorite(c.id)} aria-label="Favorite">{favorites.includes(c.id) ? 'â˜…' : 'â˜†'}</button>
          <img src={c.image} alt="" />
          <button className="coin-open" onClick={() => openCoin(c)}><b>{c.name}</b><small>{c.symbol.toUpperCase()}</small></button>
          <div className="price"><b>{usd(c.current_price)}</b><small className={c.price_change_percentage_24h >= 0 ? 'up' : 'down'}>{c.price_change_percentage_24h == null ? 'â€”' : `${c.price_change_percentage_24h.toFixed(2)}%`}</small></div>
        </div>)}</div>
        {!visibleCoins.length && !loading && <p>{t('Ø§Ø±Ø²ÛŒ Ù¾ÛŒØ¯Ø§ Ù†Ø´Ø¯.', 'No coins found.')}</p>}
        <small className="muted">{t('Ø¢Ø®Ø±ÛŒÙ† Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ: ', 'Last update: ')}{lastUpdate || 'â€”'}</small>
      </section>}

      {tab === 'detail' && selectedCoin && <section className="panel">
        <button className="soft" onClick={() => setTab('market')}>â† {t('Ø¨Ø§Ø²Ú¯Ø´Øª Ø¨Ù‡ Ø¨Ø§Ø²Ø§Ø±', 'Back to market')}</button>
        <div className="coin-detail"><img src={selectedCoin.image} alt="" /><div><h2>{selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</h2><strong className="big">{usd(selectedCoin.current_price)}</strong></div><button className="star" onClick={() => toggleFavorite(selectedCoin.id)}>{favorites.includes(selectedCoin.id) ? 'â˜…' : 'â˜†'}</button></div>
        <div className="metrics">
          <Metric label={t('ØªØºÛŒÛŒØ± Û²Û´ Ø³Ø§Ø¹Øª', '24h change')} value={`${Number(selectedCoin.price_change_percentage_24h || 0).toFixed(2)}%`} />
          <Metric label={t('Ø§Ø±Ø²Ø´ Ø¨Ø§Ø²Ø§Ø±', 'Market cap')} value={usd(selectedCoin.market_cap)} />
          <Metric label={t('Ø­Ø¬Ù… Û²Û´ Ø³Ø§Ø¹Øª', '24h volume')} value={usd(selectedCoin.total_volume)} />
          <Metric label={t('Ø¨Ø§Ù„Ø§ØªØ±ÛŒÙ† Û²Û´ Ø³Ø§Ø¹Øª', '24h high')} value={usd(selectedCoin.high_24h)} />
          <Metric label={t('Ù¾Ø§ÛŒÛŒÙ†â€ŒØªØ±ÛŒÙ† Û²Û´ Ø³Ø§Ø¹Øª', '24h low')} value={usd(selectedCoin.low_24h)} />
        </div>
        <h3>{t('Ù†Ù…ÙˆØ¯Ø§Ø± Û· Ø±ÙˆØ²Ù‡', '7-day chart')}</h3>
        {chartBusy ? <p>{t('Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª Ù†Ù…ÙˆØ¯Ø§Ø±â€¦', 'Loading chartâ€¦')}</p> : chartError ? <p className="error">{chartError}</p> : <PriceChart points={chart} />}
        <h3>{t('Ù‡Ø´Ø¯Ø§Ø± Ù‚ÛŒÙ…Øª', 'Price alert')}</h3>
        <div className="alert-form"><select value={alertDirection} onChange={e => setAlertDirection(e.target.value)}><option value="above">{t('ÙˆÙ‚ØªÛŒ Ù‚ÛŒÙ…Øª Ø¨Ø§Ù„Ø§ØªØ± Ø´ÙˆØ¯', 'Price goes above')}</option><option value="below">{t('ÙˆÙ‚ØªÛŒ Ù‚ÛŒÙ…Øª Ù¾Ø§ÛŒÛŒÙ†â€ŒØªØ± Ø´ÙˆØ¯', 'Price goes below')}</option></select><input type="number" min="0" step="any" value={alertPrice} onChange={e => setAlertPrice(e.target.value)} placeholder={t('Ù‚ÛŒÙ…Øª Ø¨Ù‡ Ø¯Ø§Ù„Ø±', 'Price in USD')} /><button onClick={addAlert}>{t('Ø«Ø¨Øª Ù‡Ø´Ø¯Ø§Ø±', 'Save alert')}</button></div>
        <div className="alerts">{alerts.filter(a => a.coinId === selectedCoin.id).map(a => <div key={a.id}>{a.direction === 'above' ? 'â†‘' : 'â†“'} {usd(a.price)} <button className="danger" onClick={() => setAlerts(old => old.filter(x => x.id !== a.id))}>Ã—</button></div>)}</div>
        <small className="muted">{t('Ù‡Ø´Ø¯Ø§Ø±Ù‡Ø§ ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ Ø§ÛŒÙ† Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø¨Ø§Ø² Ø§Ø³Øª Ùˆ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¨Ø§Ø²Ø§Ø± ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ø¨Ø±Ø±Ø³ÛŒ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.', 'Alerts are checked only while this app is open and market data refreshes.')}</small>
      </section>}

      {tab === 'wallet' && <section className="panel">
        <h2>{t('Ú©ÛŒÙ Ù¾ÙˆÙ„', 'Wallet')}</h2>
        <button className="primary wide" onClick={() => open()}>{connected ? t('Ù…Ø¯ÛŒØ±ÛŒØª Ø§ØªØµØ§Ù„', 'Manage connection') : t('Ø§ØªØµØ§Ù„ Ú©ÛŒÙ Ù¾ÙˆÙ„', 'Connect wallet')}</button>
        <div className="metrics">
          <Metric label={t('ÙˆØ¶Ø¹ÛŒØª Ø§ØªØµØ§Ù„', 'Connection')} value={connected ? t('Ù…ØªØµÙ„ Ø§Ø³Øª', 'Connected') : t('Ù…ØªØµÙ„ Ù†ÛŒØ³Øª', 'Not connected')} />
          <Metric label="Network" value={chainId ?? 'â€”'} note={correctNetwork ? 'BNB Smart Chain' : 'Select chain 56'} />
        </div>
        <Metric label="Address" value={address || 'â€”'} />
        {connected && !correctNetwork && <p className="error">{t('Ø´Ø¨Ú©Ù‡ Ø±Ø§ Ø±ÙˆÛŒ BNB Smart Chain (56) ØªÙ†Ø¸ÛŒÙ… Ú©Ù†.', 'Switch wallet to BNB Smart Chain (56).')}</p>}
        <div className="metrics"><Metric label="BNB" value={bnb.data ? fmt(bnb.data.value, bnb.data.decimals) : 'â€”'} /><Metric label="USDT" value={usdt.data !== undefined ? fmt(usdt.data, 18) : 'â€”'} /><Metric label="SGT" value={sgt.data !== undefined ? fmt(sgt.data, 18) : 'â€”'} /></div>
        <p className="muted">{t('Ø§ÛŒÙ† Ù‚Ø³Ù…Øª ÙÙ‚Ø· Ù…ÙˆØ¬ÙˆØ¯ÛŒ Ø±Ø§ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯Ø› Ø§Ù†ØªÙ‚Ø§Ù„ ÛŒØ§ Ø¨Ø±Ø¯Ø§Ø´Øª Ø§Ù†Ø¬Ø§Ù… Ù†Ù…ÛŒâ€ŒØ¯Ù‡Ø¯.', 'This section only reads balances. It does not transfer or withdraw funds.')}</p>
      </section>}

      {tab === 'smart' && <section className="panel">
        <h2>SmartGlobal Dashboard</h2>
        {!connected && <p className="warning">{t('Ø¨Ø±Ø§ÛŒ Ø¯ÛŒØ¯Ù† Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø´Ø®ØµÛŒØŒ Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø±Ø§ ÙˆØµÙ„ Ú©Ù†.', 'Connect your wallet to view personal data.')}</p>}
        {connected && !correctNetwork && <p className="error">{t('Ù„Ø·ÙØ§Ù‹ Ø´Ø¨Ú©Ù‡ BNB Smart Chain Ø±Ø§ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†.', 'Please select BNB Smart Chain.')}</p>}
        <div className="metrics">
          <Metric label="Account ID" value={accountId?.toString()} />
          <Metric label="Gift Round" value={giftRound.data?.toString()} />
          <Metric label="Gift List Size" value={giftSize.data?.toString()} />
          <Metric label="Global Token Balance" value={globalTokens.data !== undefined ? fmt(globalTokens.data) : 'â€”'} />
          <Metric label="Bank USDT Balance" value={bankUsdt.data !== undefined ? fmt(bankUsdt.data, 18) : 'â€”'} />
          <Metric label="Pay Contract USDT/Token Balance" value={payBalance.data !== undefined ? fmt(payBalance.data) : 'â€”'} />
        </div>
        <h3>{t('Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø­Ø³Ø§Ø¨', 'Account information')}</h3>
        <div className="metrics">
          <Metric label="Total Left" value={owner.data?.Total_Left?.toString?.() ?? owner.data?.[1]?.toString()} />
          <Metric label="Total Right" value={owner.data?.Total_Right?.toString?.() ?? owner.data?.[2]?.toString()} />
          <Metric label="Current Left" value={owner.data?.Current_Left?.toString?.() ?? owner.data?.[3]?.toString()} />
          <Metric label="Current Right" value={owner.data?.Current_Right?.toString?.() ?? owner.data?.[4]?.toString()} />
          <Metric label="Directs" value={owner.data?.Directs_Count?.toString?.() ?? owner.data?.[5]?.toString()} />
        </div>
        <h3>{t('Ø§Ø·Ù„Ø§Ø¹Ø§Øª Gift', 'Gift information')}</h3>
        <div className="metrics">
          <Metric label="Gift received (USDT)" value={bankInfo.data ? fmt(bankInfo.data.Total_Gift_Received_USDT ?? bankInfo.data[0], 18) : giftInfo.data ? fmt(giftInfo.data[0], 18) : 'â€”'} />
          <Metric label="Days since last Gift" value={bankInfo.data?.Days_Passed_Since_Last_Gift?.toString?.() ?? bankInfo.data?.[1]?.toString() ?? 'â€”'} />
          <Metric label="Free token claimed" value={String(bankInfo.data?.Has_Received_Free_Token ?? bankInfo.data?.[2] ?? 'â€”')} />
          <Metric label="Caller reward total" value={bankInfo.data ? fmt(bankInfo.data.Caller_Reward_Total_USDT ?? bankInfo.data[3], 18) : 'â€”'} />
          <Metric label="Hours since last caller" value={bankInfo.data?.Hours_Passed_Since_Last_Caller?.toString?.() ?? bankInfo.data?.[4]?.toString() ?? 'â€”'} />
          <Metric label="Hours since buy" value={bankInfo.data?.Hours_Passed_Since_Last_Buy?.toString?.() ?? bankInfo.data?.[5]?.toString() ?? 'â€”'} />
        </div>
        <h3>{t('Pay Reward', 'Pay Reward')}</h3>
        <div className="metrics">
          <Metric label="Registered status" value={rewardStatus.data === undefined ? 'â€”' : String(rewardStatus.data)} />
          <Metric label="Points" value={rewardPoints.data?.toString()} />
          <Metric label="Hours since reward" value={rewardTime.data?.toString()} />
        </div>
        <p className="warning">{t('Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø¨Ù‡ Ù…Ø¹Ù†ÛŒ ØªØ¶Ù…ÛŒÙ† Ø¯Ø±ÛŒØ§ÙØª Ù¾ÙˆÙ„ Ù†ÛŒØ³Øª. Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ SmartGlobal Ø¯Ø± BscScan Ø­Ø³Ø§Ø¨Ø±Ø³ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ Ø«Ø¨Øªâ€ŒØ´Ø¯Ù‡ Ù†Ø¯Ø§Ø±Ø¯. Ù‚Ø¨Ù„ Ø§Ø² Ù‡Ø± ØªØ±Ø§Ú©Ù†Ø´ØŒ Ú©Ø§Ø±Ù…Ø²Ø¯ Ùˆ Ø¬Ø²Ø¦ÛŒØ§Øª Ø±Ø§ Ø¯Ø± Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†.', 'Contract data does not guarantee a payout. BscScan shows no submitted security audit for this contract. Review fees and transaction details in your wallet.')}</p>
        <h3>{t('Ù…Ø¯ÛŒØ±ÛŒØª GiftØŒ Distribute Ùˆ Reward', 'Gift, Distribute and Reward controls')}</h3>
        {actions.map(a => {
          const simOK = Boolean(a.sim.data?.request);
          const simErr = a.sim.error?.shortMessage || a.sim.error?.message;
          return <div className="action" key={a.key}>
            <div className="heading"><b>{a.title}</b><select value={modes[a.key]} onChange={e => setMode(a.key, e.target.value)}><option>OFF</option><option>MANUAL</option><option>AUTO</option></select></div>
            <p>{a.desc}</p>
            <small className={modes[a.key] === 'AUTO' ? 'up' : 'muted'}>{modes[a.key] === 'AUTO' ? t('AUTO Ø±ÙˆØ´Ù† Ø§Ø³Øª: ÙÙ‚Ø· Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù‡Ø± Û³Û° Ø«Ø§Ù†ÛŒÙ‡ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯Ø› Ù‡ÛŒÚ† ØªØ±Ø§Ú©Ù†Ø´ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ø±Ø³Ø§Ù„ Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.', 'AUTO on: reads refresh every 30 seconds; no transaction is sent automatically.') : modes[a.key] === 'MANUAL' ? (simOK ? t('Ø´Ø¨ÛŒÙ‡â€ŒØ³Ø§Ø²ÛŒ Ù…ÙˆÙÙ‚Ø› Ù‡Ù†ÙˆØ² Ù‡ÛŒÚ† ØªØ±Ø§Ú©Ù†Ø´ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.', 'Simulation succeeded; no transaction has been sent yet.') : (simErr || t('Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ Ø´Ø±Ø§ÛŒØ· Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯â€¦', 'Checking contract conditionsâ€¦'))) : t('Ø®Ø§Ù…ÙˆØ´', 'Off')}</small>
            {modes[a.key] === 'MANUAL' && <button className="primary wide" disabled={!simOK || isPending || !connected || !correctNetwork} onClick={() => sendTx(a.title, a.sim)}>{isPending ? t('Ø¯Ø± Ø­Ø§Ù„ Ø§Ø±Ø³Ø§Ù„â€¦', 'Submittingâ€¦') : t('Ø¨Ø±Ø±Ø³ÛŒ Ùˆ Ø¨Ø§Ø²Ú©Ø±Ø¯Ù† Ø¯Ø± Ú©ÛŒÙ Ù¾ÙˆÙ„', 'Review and open wallet')}</button>}
          </div>;
        })}
        {txMessage && <p className="info">{txMessage}</p>}
        {receipt.isSuccess && <p className="up">{t('ØªØ±Ø§Ú©Ù†Ø´ Ø¯Ø± Ø´Ø¨Ú©Ù‡ ØªØ£ÛŒÛŒØ¯ Ø´Ø¯.', 'Transaction confirmed on-chain.')}</p>}
      </section>}

      {notice && <div className="notice" onClick={() => setNotice('')}>{notice} Ã—</div>}
      <section className="panel">
        <h3>{t('ÛŒØ§Ø¯Ø¯Ø§Ø´Øª Ù…Ù‡Ù…', 'Important note')}</h3>
        <p className="muted">{t('Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§ Ø§Ø² CoinGecko Ù…ÛŒâ€ŒØ¢ÛŒÙ†Ø¯ Ùˆ Ù…Ù…Ú©Ù† Ø§Ø³Øª Ø¨Ø§ ØªØ£Ø®ÛŒØ± Ø¨Ø§Ø´Ù†Ø¯. Ø§ÛŒÙ† Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø³ÙˆØ¯ ÛŒØ§ Ø¯Ø±Ø¢Ù…Ø¯ ØªØ¶Ù…ÛŒÙ† Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯. Ù‡Ø±Ú¯Ø² Ø¹Ø¨Ø§Ø±Øª Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒØŒ Ú©Ù„ÛŒØ¯ Ø®ØµÙˆØµÛŒ ÛŒØ§ Ø±Ù…Ø² Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø±Ø§ Ø¯Ø± Ø§ÛŒÙ† Ø¨Ø±Ù†Ø§Ù…Ù‡ ÙˆØ§Ø±Ø¯ Ù†Ú©Ù†.', 'Prices come from CoinGecko and may be delayed. This app does not guarantee profit or income. Never enter your recovery phrase, private key or wallet password here.')}</p>
      </section>
      <footer>Crypto Explorer Â· Version 3 Â· CoinGecko Â· BNB Smart Chain Â· Manual wallet confirmation only</footer>

      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#f1f5f9;color:#172033;font-family:Arial,sans-serif}
        .app{max-width:960px;margin:auto;padding:14px}.top,.heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .top h1{margin:0 0 4px;font-size:25px}.top p,.muted{color:#64748b;font-size:13px;line-height:1.7}
        button,select{border:0;border-radius:9px;padding:10px 13px;background:#1769aa;color:#fff;font-weight:700;cursor:pointer}
        button:disabled{opacity:.45;cursor:not-allowed}.soft{background:#e7eef7;color:#17436d}.primary{background:#1769aa}.wide{width:100%;margin:10px 0}
        .hero{background:linear-gradient(130deg,#123b69,#1769aa);color:white;padding:20px;border-radius:15px;margin:18px 0}
        .hero h2{margin:0 0 7px}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin-top:17px}.tabs button{background:#ffffff25;border:1px solid #ffffff65}.tabs button.active{background:#fff;color:#17436d}
        .panel{background:white;border-radius:14px;padding:17px;margin-bottom:15px;box-shadow:0 2px 8px #0000000c;overflow-wrap:anywhere}
        .panel h2{font-size:19px}.panel h3{font-size:16px;margin:20px 0 10px}.search{width:100%;padding:13px;border:1px solid #cbd5e1;border-radius:9px;font-size:15px;margin:12px 0}
        .check{display:flex;align-items:center;gap:8px;font-size:13px;margin:12px 0}.coin{display:flex;align-items:center;gap:9px;padding:12px 0;border-bottom:1px solid #edf0f4}
        .coin img,.coin-detail img{width:32px;height:32px}.coin-open{display:flex;flex-direction:column;align-items:flex-start;flex:1;background:transparent;color:#172033;padding:4px;min-width:0}.coin-open small{color:#64748b;margin-top:3px}
        .price{display:flex;flex-direction:column;text-align:end;gap:4px;font-size:13px}.price small{color:#64748b}.star{background:transparent;color:#d49a00;font-size:23px;padding:3px 7px}
        .up{color:#12834a!important}.down,.error{color:#c52e36!important}.error{background:#fff0ef;padding:10px;border-radius:8px}
        .metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0}.metric{background:#f5f8fc;padding:12px;border-radius:10px;min-width:0;overflow-wrap:anywhere}
        .metric small{display:block;color:#64748b;font-size:12px}.metric strong{display:block;font-size:17px;margin:7px 0;word-break:break-word}
        .coin-detail{display:flex;align-items:center;gap:10px;margin:15px 0}.coin-detail h2{margin:0 0 6px}.big{font-size:20px}
        .chart{width:100%;height:190px;color:#1769aa;background:#f7faff;border-radius:10px;padding:12px;overflow:visible}
        .alert-form{display:flex;gap:8px;flex-wrap:wrap}.alert-form select,.alert-form input{flex:1;min-width:120px;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#172033}
        .alerts div{padding:8px 0}.danger{background:#fee2e2;color:#991b1b;padding:4px 9px}.action{border:1px solid #e3eaf2;border-radius:10px;padding:13px;margin:12px 0}.action p{font-size:13px;line-height:1.7;color:#64748b}.action select{min-width:110px}
        .warning{background:#fff7e6;color:#805500;padding:12px;border-radius:9px;line-height:1.8;font-size:13px}.info,.notice{background:#eaf3ff;color:#17436d;padding:12px;border-radius:9px;overflow-wrap:anywhere}
        .notice{position:sticky;bottom:8px;margin:8px 0;cursor:pointer}footer{text-align:center;color:#64748b;font-size:12px;line-height:1.9;padding:18px 5px}
        @media(max-width:520px){.app{padding:10px}.panel{padding:13px}.metrics{grid-template-columns:1fr 1fr}.coin{gap:6px}.price{font-size:12px}.alert-form{flex-direction:column}}
      `}</style>
    </main>
  );
}
