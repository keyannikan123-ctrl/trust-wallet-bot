
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

// جستجوی ارزهای ثبت‌شده در CoinGecko
async function searchCoinGecko(query) {
  const data = await getJSON(
    `${API}/search?query=${encodeURIComponent(query)}`
  );

  return (data.coins || []).map(coin => ({
    id: `cg:${coin.id}`,
    kind: 'coingecko',
    coinId: coin.id,
    name: coin.name,
    symbol: coin.symbol,
    image: coin.thumb,
    market_cap_rank: coin.market_cap_rank,
  }));
}

// جستجوی توکن‌ها و جفت‌های معاملاتی
async function searchDexScreener(query) {
  const data = await getJSON(
    `${DEX_API}/search?q=${encodeURIComponent(query)}`
  );

  const pairs = data.pairs || [];

  return pairs.map(pair => ({
    id: `dex:${pair.chainId}:${pair.pairAddress}`,
    kind: 'dex',
    name: pair.baseToken?.name || 'Unknown',
    symbol: pair.baseToken?.symbol || '',
    image: pair.info?.imageUrl || '',
    current_price: Number(pair.priceUsd) || 0,
    price_change_percentage_24h:
      Number(pair.priceChange?.h24) || 0,
    market_cap: Number(pair.marketCap || pair.fdv) || 0,
    total_volume: Number(pair.volume?.h24) || 0,
    liquidity: Number(pair.liquidity?.usd) || 0,
    chainId: pair.chainId,
    tokenAddress: pair.baseToken?.address,
    pairAddress: pair.pairAddress,
    dexUrl: pair.url,
  }));
}

// جستجوی عمومی با نام، نماد یا آدرس قرارداد
export async function searchMarketAssets(query) {
  const q = query.trim();

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

  if (
    results.every(result => result.status === 'rejected')
  ) {
    throw new Error('Search services are unavailable');
  }

  const unique = new Map();

  [...coins, ...tokens].forEach(item => {
    const key = item.tokenAddress
      ? item.tokenAddress.toLowerCase()
      : item.coinId || item.id;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });

  return [...unique.values()].slice(0, 30);
}

// دریافت اطلاعات کامل ارز انتخاب‌شده
export async function fetchCoinMarket(asset) {
  if (asset.kind === 'coingecko') {
    const data = await getJSON(
      `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(asset.coinId)}&sparkline=true&price_change_percentage=24h`
    );

    return data[0] || null;
  }

  return asset;
}
