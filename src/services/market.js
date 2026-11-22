
const API = 'https://api.coingecko.com/api/v3';
const DEX_API = 'https://api.dexscreener.com/latest/dex';

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

// دریافت ۵۰ ارز برتر بازار
export async function fetchMarketCoins() {
  const data = await getJSON(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  );

  if (!Array.isArray(data)) {
    throw new Error('Invalid market response');
  }

  return data;
}

// جستجوی ارزهای CoinGecko
async function searchCoinGecko(query) {
  const data = await getJSON(
    `${API}/search?query=${encodeURIComponent(query)}`
  );

  return (data.coins || []).map(coin => ({
    id: `cg:${coin.id}`,
    kind: 'coingecko',
    source: 'CoinGecko',
    name: coin.name,
    symbol: coin.symbol,
    image: coin.thumb,
    coinId: coin.id,
    market_cap_rank: coin.market_cap_rank,
    chainId: null,
    network: 'CoinGecko',
  }));
}

// جستجوی توکن‌ها در DexScreener
async function searchDexScreener(query) {
  const data = await getJSON(
    `${DEX_API}/search?q=${encodeURIComponent(query)}`
  );

  const pairs = Array.isArray(data.pairs) ? data.pairs : [];

  return pairs
    .filter(pair => pair.baseToken?.address)
    .map(pair => ({
      id: `dex:${pair.chainId}:${pair.baseToken.address.toLowerCase()}`,
      kind: 'dex',
      source: 'DexScreener',

      name: pair.baseToken?.name || 'Unknown',
      symbol: pair.baseToken?.symbol || '',
      image: pair.info?.imageUrl || '',

      current_price: Number(pair.priceUsd) || 0,
      price_change_percentage_24h:
        Number(pair.priceChange?.h24) || 0,

      market_cap: Number(pair.marketCap || 0),
      fully_diluted_valuation: Number(pair.fdv || 0),
      total_volume: Number(pair.volume?.h24) || 0,
      liquidity: Number(pair.liquidity?.usd) || 0,

      chainId: pair.chainId,
      network: pair.chainId || 'Unknown',

      tokenAddress: pair.baseToken.address,
      pairAddress: pair.pairAddress,
      dexUrl: pair.url,
    }));
}

// حذف نتایج تکراری و نگهداری جفت با نقدینگی بهتر
function removeDuplicates(items, query) {
  const unique = new Map();
  const q = query.trim().toLowerCase();

  for (const item of items) {
    const address = item.tokenAddress?.toLowerCase();

    const key = address
      ? `${item.chainId}:${address}`
      : item.coinId
        ? `cg:${item.coinId}`
        : item.id;

    const previous = unique.get(key);

    if (!previous) {
      unique.set(key, item);
      continue;
    }

    const oldLiquidity = Number(previous.liquidity) || 0;
    const newLiquidity = Number(item.liquidity) || 0;

    if (newLiquidity > oldLiquidity) {
      unique.set(key, item);
    }
  }

  return [...unique.values()].sort((a, b) => {
    const aAddress = a.tokenAddress?.toLowerCase();
    const bAddress = b.tokenAddress?.toLowerCase();

    // اولویت با آدرس قرارداد دقیق
    if (aAddress === q && bAddress !== q) return -1;
    if (bAddress === q && aAddress !== q) return 1;

    // سپس ارزهای CoinGecko دارای رتبه بازار
    const aRank = Number(a.market_cap_rank) || Infinity;
    const bRank = Number(b.market_cap_rank) || Infinity;

    if (aRank !== bRank) return aRank - bRank;

    // سپس نقدینگی بیشتر
    return (Number(b.liquidity) || 0) -
      (Number(a.liquidity) || 0);
  });
}

// جستجوی عمومی ارزها و توکن‌ها
export async function searchMarketAssets(query) {
  const q = String(query || '').trim();

  if (!q) return [];

  const results = await Promise.allSettled([
    searchCoinGecko(q),
    searchDexScreener(q),
  ]);

  const coins =
    results[0].status === 'fulfilled'
      ? results[0].value
      : [];

  const tokens =
    results[1].status === 'fulfilled'
      ? results[1].value
      : [];

  if (results.every(result => result.status === 'rejected')) {
    throw new Error('Search services are unavailable');
  }

  return removeDuplicates(
    [...coins, ...tokens],
    q
  ).slice(0, 50);
}

// دریافت اطلاعات کامل ارز انتخاب‌شده
export async function fetchCoinMarket(asset) {
  if (!asset) {
    throw new Error('No asset selected');
  }

  if (asset.kind === 'coingecko') {
    const data = await getJSON(
      `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(asset.coinId)}&sparkline=true&price_change_percentage=24h`
    );

    return data[0] || null;
  }

  if (asset.kind === 'dex') {
    return asset;
  }

  throw new Error('Unsupported asset type');
}
