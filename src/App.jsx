import React, { useEffect, useMemo, useState } from 'react';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useBalance, useReadContract, useSimulateContract } from 'wagmi';
import { formatUnits } from 'viem';

const API = 'https://api.coingecko.com/api/v3';
const BANK = '0x7a4f5d605e88831e3eb3f9630029ff008d00e4d0';
const PAY = '0x6bd7671ec2b11dc32f204641d67084977e5c81f9';
const SGT = '0x227c706300ad4df617358e51de443c6dc466353e';
const USDT = '0x55d398326f99059ff775485246999027b3197955';

const erc20Abi = [{
  type: 'function', name: 'balanceOf', stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }]
}];

const bankAbi = [
  { type: 'function', name: '_currentGiftRound', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'giftListSize', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'globalTokenBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'usdtBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function', name: 'ownerInfo', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ID', type: 'uint64' }, { name: 'Total_Left', type: 'uint32' },
      { name: 'Total_Right', type: 'uint32' }, { name: 'Current_Left', type: 'uint32' },
      { name: 'Current_Right', type: 'uint32' }, { name: 'Directs_Count', type: 'uint8' },
      { name: 'Is_Right_Side', type: 'bool' }, { name: 'UpLine_Address', type: 'address' },
      { name: 'Left_Address', type: 'address' }, { name: 'Right_Address', type: 'address' }
    ]
  },
  {
    type: 'function', name: 'ownerBankInfo', stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint64' }],
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
    ]
  },
  {
    type: 'function', name: 'currentProposalStatus', stateMutability: 'view', inputs: [],
    outputs: [
      { name: 'target', type: 'address' }, { name: 'pType', type: 'uint8' },
      { name: 'votes300', type: 'uint256' }, { name: 'votes100', type: 'uint256' },
      { name: 'stage', type: 'uint8' }
    ]
  },
  { type: 'function', name: 'distributeBank', stateMutability: 'nonpayable', inputs: [], outputs: [] }
];

const payAbi = [
  { type: 'function', name: 'payReward', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'ownerStatus', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'ownerAllPoint', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastRewardTimePassed', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'justContractBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'newOwnerStatus', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastTotalPoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint32' }] },
  { type: 'function', name: 'lastValuePoint', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
];

const money = (n, max = 2) => Number.isFinite(Number(n))
  ? Number(n).toLocaleString('en-US', { maximumFractionDigits: max }) : 'â€”';
const usd = n => Number.isFinite(Number(n)) ? '$' + money(n, Number(n) < 1 ? 6 : 2) : 'â€”';
const short = a => a ? `${a.slice(0, 6)}â€¦${a.slice(-4)}` : 'â€”';
const tokenValue = (v, decimals = 18) => {
  if (v === undefined || v === null) return 'â€”';
  try { return money(Number(formatUnits(BigInt(v), decimals)), 6); } catch { return 'â€”'; }
};
const getField = (obj, name, i) => obj?.[name] ?? obj?.[i];
const errorText = e => e?.shortMessage || e?.cause?.shortMessage || e?.message || 'Ø®Ø·Ø§ÛŒ Ù†Ø§Ù…Ø´Ø®Øµ';

function Panel({ title, children, action }) {
  return <section className="panel"><div className="panelHead"><h2>{title}</h2>{action}</div>{children}</section>;
}
function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value ?? 'â€”'}</strong></div>;
}
function Row({ label, value }) {
  return <div className="rowline"><span>{label}</span><strong>{value ?? 'â€”'}</strong></div>;
}

export default function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const walletEnabled = Boolean(isConnected && address && Number(chainId) === 56);

  const [tab, setTab] = useState('market');
  const [language, setLanguage] = useState('fa');
  const [coins, setCoins] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [autoMarket, setAutoMarket] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ce-favorites') || '[]'); } catch { return []; }
  });
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ce-alerts') || '[]'); } catch { return []; }
  });
  const [alertCoin, setAlertCoin] = useState('bitcoin');
  const [alertPrice, setAlertPrice] = useState('');
  const [modes, setModes] = useState(() => {
    try {
      const x = JSON.parse(localStorage.getItem('smartglobal-modes') || '{}');
      const valid = v => ['OFF', 'MANUAL', 'AUTO'].includes(v) ? v : 'MANUAL';
      return { gift: valid(x.gift), distribute: valid(x.distribute), pay: valid(x.pay) };
    } catch { return { gift: 'MANUAL', distribute: 'MANUAL', pay: 'MANUAL' }; }
  });
  const [lastRefresh, setLastRefresh] = useState('â€”');
  const [notice, setNotice] = useState('');
  const autoSmart = Object.values(modes).includes('AUTO');

  const bnb = useBalance({
    address, chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: 30000, retry: 1 }
  });
  const usdt = useReadContract({
    address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: 30000, retry: 1 }
  });
  const sgt = useReadContract({
    address: SGT, abi: erc20Abi, functionName: 'balanceOf', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: 30000, retry: 1 }
  });

  const giftRound = useReadContract({
    address: BANK, abi: bankAbi, functionName: '_currentGiftRound', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });
  const giftSize = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'giftListSize', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });
  const globalBalance = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'globalTokenBalance', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });
  const bankUsdt = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'usdtBalance', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });
  const owner = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'ownerInfo', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: autoSmart ? 30000 : false, retry: 1 }
  });
  const ownerId = getField(owner.data, 'ID', 0);
  const bankInfo = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'ownerBankInfo',
    args: ownerId !== undefined ? [ownerId] : undefined, chainId: 56,
    query: { enabled: walletEnabled && ownerId !== undefined && BigInt(ownerId) > 0n, refetchInterval: autoSmart ? 30000 : false }
  });
  const payStatus = useReadContract({
    address: PAY, abi: payAbi, functionName: 'ownerStatus', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: autoSmart ? 30000 : false, retry: 1 }
  });
  const payPoints = useReadContract({
    address: PAY, abi: payAbi, functionName: 'ownerAllPoint', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: autoSmart ? 30000 : false, retry: 1 }
  });
  const rewardHours = useReadContract({
    address: PAY, abi: payAbi, functionName: 'lastRewardTimePassed', args: [address], chainId: 56,
    query: { enabled: walletEnabled, refetchInterval: autoSmart ? 30000 : false, retry: 1 }
  });
  const payBalance = useReadContract({
    address: PAY, abi: payAbi, functionName: 'justContractBalance', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });
  const proposal = useReadContract({
    address: BANK, abi: bankAbi, functionName: 'currentProposalStatus', chainId: 56,
    query: { refetchInterval: autoSmart ? 30000 : false }
  });

  // Simulations are read-only eth_call checks; no transaction is sent from this app.
  const distributeCheck = useSimulateContract({
    address: BANK, abi: bankAbi, functionName: 'distributeBank', account: address, chainId: 56,
    query: { enabled: walletEnabled && modes.distribute === 'MANUAL', retry: 0 }
  });
  const payCheck = useSimulateContract({
    address: PAY, abi: payAbi, functionName: 'payReward', account: address, chainId: 56,
    query: { enabled: walletEnabled && modes.pay === 'MANUAL', retry: 0 }
  });

  async function loadMarket() {
    setMarketLoading(true);
    setMarketError('');
    try {
      const response = await fetch(`${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Ù¾Ø§Ø³Ø® Ø¨Ø§Ø²Ø§Ø± Ù…Ø¹ØªØ¨Ø± Ù†ÛŒØ³Øª');
      setCoins(data);
    } catch (e) {
      setMarketError(`Ø¯Ø±ÛŒØ§ÙØª Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§ Ù†Ø§Ù…ÙˆÙÙ‚ Ø´Ø¯: ${errorText(e)}`);
    } finally { setMarketLoading(false); }
  }

  useEffect(() => { loadMarket(); }, []);
  useEffect(() => {
    if (!autoMarket) return;
    const timer = setInterval(loadMarket, 60000);
    return () => clearInterval(timer);
  }, [autoMarket]);
  useEffect(() => { localStorage.setItem('ce-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('ce-alerts', JSON.stringify(alerts)); }, [alerts]);
  useEffect(() => { localStorage.setItem('smartglobal-modes', JSON.stringify(modes)); }, [modes]);
  useEffect(() => {
    if (!autoSmart) return;
    const timer = setInterval(() => setLastRefresh(new Date().toLocaleTimeString()), 30000);
    return () => clearInterval(timer);
  }, [autoSmart]);

  const shownCoins = useMemo(() => {
    let list = tab === 'favorites' ? coins.filter(c => favorites.includes(c.id)) : coins;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(c => c.name?.toLowerCase().includes(q) || c.symbol?.toLowerCase().includes(q));
    return list;
  }, [coins, favorites, search, tab]);

  function setMode(key, value) { setModes(old => ({ ...old, [key]: value })); }
  function toggleFavorite(id) {
    setFavorites(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  }
  function addAlert() {
    const p = Number(alertPrice);
    if (!Number.isFinite(p) || p <= 0) return;
    setAlerts(old => [...old, { id: String(Date.now()), coin: alertCoin, price: p }]);
    setAlertPrice('');
  }
  async function refreshAll() {
    const refs = [giftRound, giftSize, globalBalance, bankUsdt, owner, bankInfo, payStatus, payPoints, rewardHours, payBalance, proposal, bnb, usdt, sgt];
    setNotice('');
    await Promise.allSettled(refs.map(q => q.refetch?.()));
    setLastRefresh(new Date().toLocaleString());
    setNotice('Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ Ø§Ù†Ø¬Ø§Ù… Ø´Ø¯. Ø§Ú¯Ø± Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒ Ù†Ù…Ø§ÛŒØ´ Ø¯Ø§Ø¯Ù‡ Ù†Ø´Ø¯ØŒ Ø®Ø·Ø§ÛŒ Ù‡Ù…Ø§Ù† Ø®ÙˆØ§Ù†Ø¯Ù† Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.');
  }

  const fa = language === 'fa';
  const t = fa ? {
    title: 'Ú©Ø§ÙˆØ´Ú¯Ø± Ø§Ø±Ø² Ø¯ÛŒØ¬ÛŒØªØ§Ù„', subtitle: 'Ù‚ÛŒÙ…Øª Ø§Ø±Ø²Ù‡Ø§ØŒ Ø¨Ø±Ø±Ø³ÛŒ Ø¨Ø§Ø²Ø§Ø± Ùˆ Ú©ÛŒÙ Ù¾ÙˆÙ„',
    market: 'Ø¨Ø§Ø²Ø§Ø±', favorites: 'Ø¹Ù„Ø§Ù‚Ù‡â€ŒÙ…Ù†Ø¯ÛŒâ€ŒÙ‡Ø§', wallet: 'Ú©ÛŒÙ Ù¾ÙˆÙ„', smart: 'SmartGlobal',
    search: 'Ø¬Ø³ØªØ¬ÙˆÛŒ Ù†Ø§Ù… ÛŒØ§ Ù†Ù…Ø§Ø¯ Ø§Ø±Ø²...', refresh: 'ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ', coin: 'Ø§Ø±Ø²', price: 'Ù‚ÛŒÙ…Øª',
    change: 'ØªØºÛŒÛŒØ± Û²Û´ Ø³Ø§Ø¹ØªÙ‡', cap: 'Ø§Ø±Ø²Ø´ Ø¨Ø§Ø²Ø§Ø±', alerts: 'Ù‡Ø´Ø¯Ø§Ø± Ù‚ÛŒÙ…Øª', target: 'Ù‚ÛŒÙ…Øª Ù‡Ø¯Ù Ø¨Ù‡ Ø¯Ø§Ù„Ø±',
    add: 'Ø§ÙØ²ÙˆØ¯Ù†', connect: 'Ø§ØªØµØ§Ù„ Ú©ÛŒÙ Ù¾ÙˆÙ„', connected: 'Ú©ÛŒÙ Ù¾ÙˆÙ„ Ù…ØªØµÙ„ Ø§Ø³Øª',
    notConnected: 'Ú©ÛŒÙ Ù¾ÙˆÙ„ ÙˆØµÙ„ Ù†ÛŒØ³Øª', network: 'Ø´Ø¨Ú©Ù‡', address: 'Ø¢Ø¯Ø±Ø³',
    account: 'Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø­Ø³Ø§Ø¨', gift: 'Ø§Ø·Ù„Ø§Ø¹Ø§Øª Gift', pay: 'Ø§Ø·Ù„Ø§Ø¹Ø§Øª Pay Reward',
    giftRound: 'Ø¯ÙˆØ± Gift', giftSize: 'ØªØ¹Ø¯Ø§Ø¯ ÙÙ‡Ø±Ø³Øª Gift', global: 'Ù…ÙˆØ¬ÙˆØ¯ÛŒ ØªÙˆÚ©Ù† Ø¹Ù…ÙˆÙ…ÛŒ',
    bankUsdt: 'Ù…ÙˆØ¬ÙˆØ¯ÛŒ USDT Ø¨Ø§Ù†Ú©', accountId: 'Ø´Ù†Ø§Ø³Ù‡ Ø­Ø³Ø§Ø¨', left: 'Ù…Ø¬Ù…ÙˆØ¹ Ø³Ù…Øª Ú†Ù¾',
    right: 'Ù…Ø¬Ù…ÙˆØ¹ Ø³Ù…Øª Ø±Ø§Ø³Øª', currentLeft: 'Ú†Ù¾ ÙØ¹Ù„ÛŒ', currentRight: 'Ø±Ø§Ø³Øª ÙØ¹Ù„ÛŒ',
    directs: 'Ù…Ø¹Ø±ÙÛŒ Ù…Ø³ØªÙ‚ÛŒÙ…', received: 'Gift Ø¯Ø±ÛŒØ§ÙØªâ€ŒØ´Ø¯Ù‡ (USDT)', days: 'Ø±ÙˆØ² Ø§Ø² Ø¢Ø®Ø±ÛŒÙ† Gift',
    free: 'ØªÙˆÚ©Ù† Ø±Ø§ÛŒÚ¯Ø§Ù† Ø¯Ø±ÛŒØ§ÙØª Ø´Ø¯Ù‡', caller: 'Ù…Ø¬Ù…ÙˆØ¹ Ù¾Ø§Ø¯Ø§Ø´ Caller (USDT)',
    callerHours: 'Ø³Ø§Ø¹Øª Ø§Ø² Ø¢Ø®Ø±ÛŒÙ† Caller', buyHours: 'Ø³Ø§Ø¹Øª Ø§Ø² Ø¢Ø®Ø±ÛŒÙ† Ø®Ø±ÛŒØ¯',
    payStatus: 'ÙˆØ¶Ø¹ÛŒØª Ø­Ø³Ø§Ø¨ Pay', points: 'Ø§Ù…ØªÛŒØ§Ø²Ù‡Ø§', rewardHours: 'Ø³Ø§Ø¹Øª Ø§Ø² Ø¢Ø®Ø±ÛŒÙ† Reward',
    payBalance: 'Ù…ÙˆØ¬ÙˆØ¯ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Pay', safe: 'Ø§Ù…Ù†ÛŒØª: Ø§ÛŒÙ† Ù†Ø³Ø®Ù‡ ÙÙ‚Ø· Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯ Ùˆ Ù‡ÛŒÚ† ØªØ±Ø§Ú©Ù†Ø´ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯.',
    modes: 'Ø­Ø§Ù„Øªâ€ŒÙ‡Ø§ÛŒ SmartGlobal', autoInfo: 'AUTO ÙÙ‚Ø· Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø±Ø§ Ù‡Ø± Û³Û° Ø«Ø§Ù†ÛŒÙ‡ ØªØ§Ø²Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ù‡ÛŒÚ† ØªØ±Ø§Ú©Ù†Ø´ÛŒ Ø®ÙˆØ¯Ú©Ø§Ø± Ø§Ù†Ø¬Ø§Ù… Ù†Ù…ÛŒâ€ŒØ´ÙˆØ¯.',
    manualInfo: 'MANUAL ÙÙ‚Ø· Ø´Ø¨ÛŒÙ‡â€ŒØ³Ø§Ø²ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù†ÛŒ Ø§Ù†Ø¬Ø§Ù… Ù…ÛŒâ€ŒØ¯Ù‡Ø¯. Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù†Ø³Ø®Ù‡ Ù‡ÛŒÚ† Ø¯Ú©Ù…Ù‡ Ø§Ø±Ø³Ø§Ù„ ØªØ±Ø§Ú©Ù†Ø´ ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯.',
    loading: 'Ø¯Ø± Ø­Ø§Ù„ Ø¯Ø±ÛŒØ§ÙØª...', noAlerts: 'Ù‡Ø´Ø¯Ø§Ø±ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª', error: 'Ø®Ø·Ø§'
  } : {
    title: 'Crypto Explorer', subtitle: 'Prices, market research and wallet dashboard',
    market: 'Market', favorites: 'Favorites', wallet: 'Wallet', smart: 'SmartGlobal',
    search: 'Search coin name or symbol...', refresh: 'Refresh', coin: 'Coin', price: 'Price',
    change: '24h change', cap: 'Market cap', alerts: 'Price alerts', target: 'Target price USD',
    add: 'Add', connect: 'Connect wallet', connected: 'Wallet connected',
    notConnected: 'Wallet not connected', network: 'Network', address: 'Address',
    account: 'Account information', gift: 'Gift information', pay: 'Pay Reward information',
    giftRound: 'Gift Round', giftSize: 'Gift List Size', global: 'Global token balance',
    bankUsdt: 'Bank USDT balance', accountId: 'Account ID', left: 'Total left',
    right: 'Total right', currentLeft: 'Current left', currentRight: 'Current right',
    directs: 'Direct referrals', received: 'Gift received (USDT)', days: 'Days since Gift',
    free: 'Free token received', caller: 'Caller reward total (USDT)',
    callerHours: 'Hours since Caller', buyHours: 'Hours since buy',
    payStatus: 'Pay account status', points: 'Points', rewardHours: 'Hours since Reward',
    payBalance: 'Pay contract balance', safe: 'Safety: read-only dashboard. It does not send transactions.',
    modes: 'SmartGlobal modes', autoInfo: 'AUTO refreshes read-only data every 30 seconds; it never sends transactions.',
    manualInfo: 'MANUAL performs read-only simulations only. This version has no transaction-send button.',
    loading: 'Loading...', noAlerts: 'No alerts saved', error: 'Error'
  };

  const ownerData = owner.data;
  const bankData = bankInfo.data;
  const proposalData = proposal.data;
  const pct = v => v === undefined ? 'â€”' : v ? 'Yes' : 'No';

  return (
    <main className="app" dir={fa ? 'rtl' : 'ltr'}>
      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#0b1020;color:#eef2ff;font-family:Tahoma,Arial,sans-serif}
        .app{max-width:1120px;margin:auto;padding:16px;min-height:100vh}
        .top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
        h1{font-size:24px;margin:0 0 6px}.sub,.muted{color:#9aa8c7;font-size:13px}
        button,input,select{font:inherit}button{border:1px solid #33415f;background:#18233d;color:#eef2ff;border-radius:10px;padding:10px 13px;cursor:pointer}
        button.primary,.active{background:#2563eb;border-color:#2563eb}
        .nav,.controls{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
        .panel{background:#121b30;border:1px solid #263653;border-radius:15px;padding:16px;margin:14px 0}
        .panelHead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        h2{font-size:17px;margin:0 0 14px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px}
        .stat{background:#192640;border:1px solid #2b3b5b;border-radius:11px;padding:12px;min-width:0}
        .stat span{display:block;color:#9eacc8;font-size:12px;margin-bottom:8px}.stat strong{font-size:17px;overflow-wrap:anywhere}
        .rowline{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #263653;overflow-wrap:anywhere}
        .controls input,.controls select{background:#0d1629;border:1px solid #33415f;color:white;border-radius:10px;padding:11px;min-width:0}
        .controls input{flex:1;min-width:150px}.tableWrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:580px}
        th,td{text-align:start;padding:11px 8px;border-bottom:1px solid #273653;font-size:13px}th{color:#9eacc8;font-weight:normal}
        .coin{display:flex;align-items:center;gap:9px}.coin img{width:26px;height:26px}.green{color:#35d39a}.red{color:#ff7185}
        .notice{color:#b7c6e2;background:#192640;border-radius:10px;padding:12px;font-size:12px;line-height:1.8;margin-top:12px}
        .error{color:#ff9aa9}.modeRow{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #263653}
        .modeButtons{display:flex;gap:6px}.modeButtons button{padding:8px 11px}.empty{text-align:center;padding:20px;color:#9aa8c7}
        footer{text-align:center;color:#91a1c2;font-size:12px;padding:20px}
        @media(max-width:600px){.app{padding:11px}h1{font-size:21px}.panel{padding:12px}.modeButtons button{padding:7px 9px}}
      `}</style>

      <header className="top">
        <div><h1>ðŸŒ {t.title}</h1><div className="sub">{t.subtitle} Â· BNB Smart Chain</div></div>
        <div className="controls" style={{margin:0}}>
          <button onClick={() => setLanguage(fa ? 'en' : 'fa')}>{fa ? 'English' : 'Ø¯Ø±ÛŒ'}</button>
          <button className="primary" onClick={() => open({ view: 'Connect' })}>{isConnected ? t.connected : t.connect}</button>
        </div>
      </header>

      <nav className="nav">
        {[['market',t.market],['favorites',t.favorites],['wallet',t.wallet],['smart',t.smart]].map(([id,label]) =>
          <button key={id} className={tab===id?'active':''} onClick={()=>{setTab(id);setSelectedCoin(null);}}>{label}</button>
        )}
      </nav>

      {(tab==='market' || tab==='favorites') && (
        <>
          <Panel title={t.market} action={<button onClick={loadMarket}>{t.refresh}</button>}>
            <div className="controls">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}/>
              <label className="muted"><input type="checkbox" checked={autoMarket} onChange={e=>setAutoMarket(e.target.checked)}/> Auto 60s</label>
            </div>
            {marketLoading && <p className="muted">{t.loading}</p>}
            {marketError && <p className="error">{marketError}</p>}
            {selectedCoin && <div className="notice">{selectedCoin.name} ({selectedCoin.symbol?.toUpperCase()}) Â· {usd(selectedCoin.current_price)} Â· Market cap {usd(selectedCoin.market_cap)}</div>}
            <div className="tableWrap"><table><thead><tr><th>#</th><th>{t.coin}</th><th>{t.price}</th><th>{t.change}</th><th>{t.cap}</th><th>â˜…</th></tr></thead>
              <tbody>{shownCoins.map(c=><tr key={c.id}>
                <td>{c.market_cap_rank||'â€”'}</td>
                <td><button style={{padding:0,border:0,background:'transparent'}} onClick={()=>setSelectedCoin(c)}><span className="coin"><img src={c.image} alt=""/><span>{c.name}<small className="muted"> {c.symbol?.toUpperCase()}</small></span></span></button></td>
                <td>{usd(c.current_price)}</td><td className={Number(c.price_change_percentage_24h)>=0?'green':'red'}>{money(c.price_change_percentage_24h)}%</td>
                <td>{usd(c.market_cap)}</td><td><button onClick={()=>toggleFavorite(c.id)}>{favorites.includes(c.id)?'â˜…':'â˜†'}</button></td>
              </tr>)}</tbody></table></div>
          </Panel>
          <Panel title={t.alerts}>
            <div className="controls">
              <select value={alertCoin} onChange={e=>setAlertCoin(e.target.value)}>{coins.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input type="number" value={alertPrice} onChange={e=>setAlertPrice(e.target.value)} placeholder={t.target}/>
              <button className="primary" onClick={addAlert}>{t.add}</button>
            </div>
            {alerts.length===0?<p className="muted">{t.noAlerts}</p>:alerts.map(a=><Row key={a.id} label={coins.find(c=>c.id===a.coin)?.name||a.coin} value={<>{usd(a.price)} <button onClick={()=>setAlerts(old=>old.filter(x=>x.id!==a.id))}>Ã—</button></>}/>)}
            <p className="muted">Ù‡Ø´Ø¯Ø§Ø±Ù‡Ø§ ÙÙ‚Ø· Ù‡Ù†Ú¯Ø§Ù… Ø¨Ø§Ø² Ø¨ÙˆØ¯Ù† Ø¨Ø±Ù†Ø§Ù…Ù‡ Ùˆ ØªØ§Ø²Ù‡â€ŒØ´Ø¯Ù† Ù‚ÛŒÙ…Øªâ€ŒÙ‡Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.</p>
          </Panel>
        </>
      )}

      {tab==='wallet' && <Panel title={t.wallet}>
        {!isConnected?<div className="empty"><p>{t.notConnected}</p><button className="primary" onClick={()=>open({view:'Connect'})}>{t.connect}</button></div>:<>
          <Row label={t.network} value={`${chainId===56?'BNB Smart Chain':'Ø´Ø¨Ú©Ù‡ Ø¯ÛŒÚ¯Ø±'} (${chainId??'â€”'})`}/>
          <Row label={t.address} value={short(address)}/>
          {chainId!==56&&<p className="error">Ø¨Ø±Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù† Ù…ÙˆØ¬ÙˆØ¯ÛŒØŒ Ø´Ø¨Ú©Ù‡ Ú©ÛŒÙ Ù¾ÙˆÙ„ Ø±Ø§ Ø±ÙˆÛŒ BNB Smart Chain Ù‚Ø±Ø§Ø± Ø¯Ù‡ÛŒØ¯.</p>}
          <div className="stats">
            <Stat label="BNB" value={bnb.data?`${tokenValue(bnb.data.value,bnb.data.decimals)} BNB`:bnb.isError?'Ø®Ø·Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù†':'â€”'}/>
            <Stat label="USDT" value={usdt.data!==undefined?tokenValue(usdt.data):usdt.isError?'Ø®Ø·Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù†':'â€”'}/>
            <Stat label="SGT" value={sgt.data!==undefined?tokenValue(sgt.data):sgt.isError?'Ø®Ø·Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù†':'â€”'}/>
          </div>
        </>}
        <div className="notice">{t.safe}</div>
      </Panel>}

      {tab==='smart' && <>
        <Panel title={t.smart}>
          <div className="stats">
            <Stat label={t.giftRound} value={giftRound.data?.toString()??(giftRound.isError?'Ø®Ø·Ø§':'â€”')}/>
            <Stat label={t.giftSize} value={giftSize.data?.toString()??(giftSize.isError?'Ø®Ø·Ø§':'â€”')}/>
            <Stat label={t.global} value={globalBalance.data!==undefined?tokenValue(globalBalance.data):globalBalance.isError?'Ø®Ø·Ø§':'â€”'}/>
            <Stat label={t.bankUsdt} value={bankUsdt.data!==undefined?tokenValue(bankUsdt.data):bankUsdt.isError?'Ø®Ø·Ø§':'â€”'}/>
          </div>
        </Panel>
        <Panel title={t.account}>
          {!isConnected?<div className="empty"><button className="primary" onClick={()=>open({view:'Connect'})}>{t.connect}</button></div>:<>
            <Row label={t.accountId} value={ownerId?.toString()??(owner.isError?'Ø®Ø·Ø§ÛŒ Ø®ÙˆØ§Ù†Ø¯Ù†':'â€”')}/>
            <div className="stats">
              <Stat label={t.left} value={getField(ownerData,'Total_Left',1)?.toString()}/>
              <Stat label={t.right} value={getField(ownerData,'Total_Right',2)?.toString()}/>
              <Stat label={t.currentLeft} value={getField(ownerData,'Current_Left',3)?.toString()}/>
              <Stat label={t.currentRight} value={getField(ownerData,'Current_Right',4)?.toString()}/>
              <Stat label={t.directs} value={getField(ownerData,'Directs_Count',5)?.toString()}/>
            </div>
          </>}
        </Panel>
        <Panel title={t.gift}>
          <div className="stats">
            <Stat label={t.received} value={bankData?.[0]!==undefined?tokenValue(bankData[0]):'â€”'}/>
            <Stat label={t.days} value={bankData?.[1]?.toString()}/>
            <Stat label={t.free} value={pct(bankData?.[2])}/>
            <Stat label={t.caller} value={bankData?.[3]!==undefined?tokenValue(bankData[3]):'â€”'}/>
            <Stat label={t.callerHours} value={bankData?.[4]?.toString()}/>
            <Stat label={t.buyHours} value={bankData?.[5]?.toString()}/>
            <Stat label="Tier 1" value={pct(bankData?.[6])}/>
            <Stat label="Tier 2" value={pct(bankData?.[7])}/>
            <Stat label="Tier 3" value={pct(bankData?.[8])}/>
            <Stat label="Tier 4" value={pct(bankData?.[9])}/>
          </div>
        </Panel>
        <Panel title={t.pay}>
          <div className="stats">
            <Stat label={t.payStatus} value={payStatus.data===undefined?(payStatus.isError?'Ø®Ø·Ø§':'â€”'):pct(payStatus.data)}/>
            <Stat label={t.points} value={payPoints.data?.toString()??(payPoints.isError?'Ø®Ø·Ø§':'â€”')}/>
            <Stat label={t.rewardHours} value={rewardHours.data?.toString()??(rewardHours.isError?'Ø®Ø·Ø§':'â€”')}/>
            <Stat label={t.payBalance} value={payBalance.data!==undefined?tokenValue(payBalance.data):payBalance.isError?'Ø®Ø·Ø§':'â€”'}/>
          </div>
        </Panel>
        <Panel title={t.modes}>
          {[
            ['gift','Gift'],['distribute','Distribute'],['pay','Pay Reward']
          ].map(([key,label])=><div className="modeRow" key={key}><strong>{label}</strong><div className="modeButtons">
            {['OFF','MANUAL','AUTO'].map(m=><button key={m} className={modes[key]===m?'primary':''} onClick={()=>setMode(key,m)}>{m}</button>)}
          </div></div>)}
          <div className="notice">{t.autoInfo}<br/>{t.manualInfo}</div>
          <Row label="Distribute simulation" value={!walletEnabled?'Ø§ØªØµØ§Ù„ Ø¨Ù‡ BNB Ù„Ø§Ø²Ù… Ø§Ø³Øª':distributeCheck.isLoading?'Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ':distributeCheck.error?'Ø´Ø±Ø§ÛŒØ· Ø§Ø¬Ø±Ø§ ÙØ±Ø§Ù‡Ù… Ù†ÛŒØ³Øª':distributeCheck.data?'Ø¨Ø±Ø±Ø³ÛŒ Ù…ÙˆÙÙ‚':'Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±'}/>
          <Row label="Pay Reward simulation" value={!walletEnabled?'Ø§ØªØµØ§Ù„ Ø¨Ù‡ BNB Ù„Ø§Ø²Ù… Ø§Ø³Øª':payCheck.isLoading?'Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø±Ø±Ø³ÛŒ':payCheck.error?'Ø´Ø±Ø§ÛŒØ· Ø§Ø¬Ø±Ø§ ÙØ±Ø§Ù‡Ù… Ù†ÛŒØ³Øª':payCheck.data?'Ø¨Ø±Ø±Ø³ÛŒ Ù…ÙˆÙÙ‚':'Ø¯Ø± Ø§Ù†ØªØ¸Ø§Ø±'}/>
          <Row label="Proposal target" value={getField(proposalData,'target',0)}/>
          <Row label="Proposal type / stage" value={`${getField(proposalData,'pType',1)??'â€”'} / ${getField(proposalData,'stage',4)??'â€”'}`}/>
          <button className="primary" onClick={refreshAll}>{t.refresh}</button>
          <p className="muted">Ø¢Ø®Ø±ÛŒÙ† ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ: {lastRefresh}</p>
          {notice&&<p className="notice">{notice}</p>}
        </Panel>
        <div className="notice">{t.safe} {t.autoInfo}</div>
      </>}

      <footer>Crypto Explorer Â· SmartGlobal Â· BNB Smart Chain Â· Read-only</footer>
    </main>
  );
}
