
const API = 'https://api.coingecko.com/api/v3';
const DEX_API = 'https://api.dexscreener.com/latest/dex';
const COINCAP_API = 'https://api.coincap.io/v2';
const BINANCE_API = 'https://api.binance.com/api/v3';

const PEPE_ETH_ADDRESS =
  '0x6982508145454Ce325dDbE47a25d4ec3d2311933';

const PAGE_SIZE = 100;
const DETAILS_CACHE_TTL_MS = 60 * 1000;
const detailsCache = new Map();
const detailsRequests = new Map();
const EXPLORERS = {
  ethereum: 'https://etherscan.io/token/',
  bsc: 'https://bscscan.com/token/',
  'binance-smart-chain': 'https://bscscan.com/token/',
  polygon: 'https://polygonscan.com/token/',
  arbitrum: 'https://arbiscan.io/token/',
  optimism: 'https://optimistic.etherscan.io/token/',
  base: 'https://basescan.org/token/',
  avalanche: 'https://snowtrace.io/token/',
  solana: 'https://solscan.io/token/',
  fantom: 'https://ftmscan.com/token/',
  tron: 'https://tronscan.org/#/token20/'
};

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(value || '').trim()
  );
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function explorerUrl(chainId, address) {
  if (!address) return '';

  const chain = String(chainId || '').toLowerCase();
  const base = EXPLORERS[chain];

  if (!base) return '';

  return base + encodeURIComponent(address);
}

async function getJSON(url, timeoutMs = 18000) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('زمان پاسخ‌گویی منبع اطلاعات تمام شد');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// تبدیل اطلاعات CoinGecko به ساختار مشترک
function normalizeCoinGecko(coin) {
  return {
    ...coin,

    id: coin.id,
    kind: 'coingecko',
    source: 'CoinGecko',
    dataSource: 'CoinGecko',

    name: coin.name,
    symbol: coin.symbol,
    image: coin.image || '',

    current_price: toNumber(coin.current_price),

    market_cap: toNumber(coin.market_cap),
    fully_diluted_valuation:
      toNumber(coin.fully_diluted_valuation),

    total_volume: toNumber(coin.total_volume),

    price_change_percentage_24h:
      toNumber(coin.price_change_percentage_24h),

    high_24h: toNumber(coin.high_24h),
    low_24h: toNumber(coin.low_24h),

    circulating_supply:
      toNumber(coin.circulating_supply),

    total_supply: toNumber(coin.total_supply),
    max_supply: toNumber(coin.max_supply),

    ath: toNumber(coin.ath),
    atl: toNumber(coin.atl),

    market_cap_rank:
      toNumber(coin.market_cap_rank),

    sparkline_in_7d:
      coin.sparkline_in_7d || null,

    network: 'CoinGecko',
    coinId: coin.id
  };
}

// دریافت بازار از CoinGecko
async function fetchCoinGeckoMarket(page = 1) {
  const safePage = Math.max(1, Number(page) || 1);

  const url =
    `${API}/coins/markets` +
    `?vs_currency=usd` +
    `&order=market_cap_desc` +
    `&per_page=${PAGE_SIZE}` +
    `&page=${safePage}` +
    `&sparkline=true` +
    `&price_change_percentage=24h`;

  const data = await getJSON(url);

  if (!Array.isArray(data) || !data.length) {
    throw new Error('CoinGecko اطلاعاتی برنگرداند');
  }

  return data.map(normalizeCoinGecko);
}

// منبع جایگزین CoinCap
async function fetchCoinCapMarket() {
  const result = await getJSON(
    `${COINCAP_API}/assets?limit=200`
  );

  const assets = result?.data;

  if (!Array.isArray(assets) || !assets.length) {
    throw new Error('CoinCap اطلاعاتی برنگرداند');
  }

  return assets.map((coin, index) => ({
    id: `coincap:${coin.id}`,
    kind: 'coincap',
    name: coin.name,
    symbol: coin.symbol,
    image: '',

    current_price: toNumber(coin.priceUsd),
    market_cap: toNumber(coin.marketCapUsd),
    fully_diluted_valuation: null,

    total_volume: toNumber(coin.volumeUsd24Hr),

    price_change_percentage_24h:
      toNumber(coin.changePercent24Hr),

    market_cap_rank: Number(coin.rank) || index + 1,

    high_24h: null,
    low_24h: null,

    circulating_supply: toNumber(coin.supply),
    total_supply: null,
    max_supply: toNumber(coin.maxSupply),

    sparkline_in_7d: null,

    dataSource: 'CoinCap',
    source: 'CoinCap',
    network: 'CoinCap'
  }));
}

// منبع جایگزین Binance
async function fetchBinanceMarket() {
  const data = await getJSON(
    `${BINANCE_API}/ticker/24hr`
  );

  if (!Array.isArray(data)) {
    throw new Error('Binance اطلاعاتی برنگرداند');
  }

  const rows = data
    .filter(item =>
      item.symbol.endsWith('USDT') &&
      Number(item.lastPrice) > 0
    )
    .sort((a, b) =>
      Number(b.quoteVolume) - Number(a.quoteVolume)
    )
    .slice(0, 100);

  return rows.map((item, index) => {
    const symbol = item.symbol.replace(/USDT$/, '');

    return {
      id: `binance:${item.symbol}`,
      kind: 'binance',

      name: symbol,
      symbol,
      image: '',

      current_price: toNumber(item.lastPrice),

      market_cap: null,
      fully_diluted_valuation: null,

      total_volume: toNumber(item.quoteVolume),

      price_change_percentage_24h:
        toNumber(item.priceChangePercent),

      high_24h: toNumber(item.highPrice),
      low_24h: toNumber(item.lowPrice),

      market_cap_rank: index + 1,

      circulating_supply: null,
      total_supply: null,
      max_supply: null,

      sparkline_in_7d: null,

      dataSource: 'Binance',
      source: 'Binance',
      network: 'Binance'
    };
  });
}

// حذف تکرار بازار
function removeMarketDuplicates(items) {
  const unique = new Map();

  for (const item of items) {
    const key = item.coinId
      ? `cg:${item.coinId}`
      : item.id;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()];
}

// دریافت بازار
export async function fetchMarketCoins(page = 1) {
  try {
    return await fetchCoinGeckoMarket(page);
  } catch (coinGeckoError) {
    if (Number(page) !== 1) {
      throw coinGeckoError;
    }

    const errors = [
      coinGeckoError?.message || 'CoinGecko unavailable'
    ];

    try {
      return await fetchCoinCapMarket();
    } catch (error) {
      errors.push(error?.message || 'CoinCap unavailable');
    }

    try {
      return await fetchBinanceMarket();
    } catch (error) {
      errors.push(error?.message || 'Binance unavailable');
    }

    throw new Error(
      'هیچ منبع قیمت در دسترس نیست. ' +
      errors.join(' | ')
    );
  }
}

// دریافت صفحه بعدی بازار
export async function fetchMoreMarketCoins(page = 2) {
  return fetchCoinGeckoMarket(page);
}

// جستجوی CoinGecko
async function searchCoinGecko(query) {
  if (isAddress(query)) return [];

  const data = await getJSON(
    `${API}/search?query=${encodeURIComponent(query)}`
  );

  const coins = Array.isArray(data.coins)
    ? data.coins
    : [];

  if (!coins.length) return [];

  const ids = coins
    .map(coin => coin.id)
    .filter(Boolean);

  let marketMap = new Map();

  try {
    const marketData = await getJSON(
      `${API}/coins/markets` +
      `?vs_currency=usd` +
      `&ids=${encodeURIComponent(ids.slice(0, 100).join(','))}` +
      `&sparkline=true` +
      `&price_change_percentage=24h`
    );

    if (Array.isArray(marketData)) {
      marketMap = new Map(
        marketData.map(coin => [coin.id, coin])
      );
    }
  } catch (error) {
    // نتایج جستجو بدون قیمت نیز قابل نمایش هستند.
  }

  return coins.map(coin => {
    const market = marketMap.get(coin.id) || {};

    return {
      ...normalizeCoinGecko({
        ...market,

        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,

        image: market.image || coin.thumb || '',

        market_cap_rank:
          market.market_cap_rank ||
          coin.market_cap_rank ||
          null
      }),

      id: `cg:${coin.id}`,
      kind: 'coingecko',
      coinId: coin.id,

      source: 'CoinGecko',
      network: 'CoinGecko'
    };
  });
}

// جستجوی توکن و قرارداد در DexScreener
async function searchDexScreener(query) {
  const cleanQuery = String(query || '').trim();

  const endpoint = isAddress(cleanQuery)
    ? `${DEX_API}/tokens/${encodeURIComponent(cleanQuery)}`
    : `${DEX_API}/search?q=${encodeURIComponent(cleanQuery)}`;

  const data = await getJSON(endpoint);

  const pairs = Array.isArray(data.pairs)
    ? data.pairs
    : [];

  return pairs
    .filter(pair => pair.baseToken?.address)
    .map(pair => {
      const address = pair.baseToken.address;
      const chain = pair.chainId || 'unknown';

      return {
        id: `dex:${chain}:${address.toLowerCase()}`,

        kind: 'dex',
        source: 'DexScreener',
        dataSource: 'DexScreener',

        name: pair.baseToken?.name || 'Unknown',
        symbol: pair.baseToken?.symbol || '',

        image: pair.info?.imageUrl || '',

        current_price: toNumber(pair.priceUsd),

        price_change_percentage_24h:
          toNumber(pair.priceChange?.h24),

        market_cap: toNumber(pair.marketCap),

        fully_diluted_valuation:
          toNumber(pair.fdv),

        total_volume:
          toNumber(pair.volume?.h24),

        liquidity:
          toNumber(pair.liquidity?.usd),

        high_24h: null,
        low_24h: null,

        circulating_supply: null,
        total_supply: null,
        max_supply: null,

        chainId: chain,
        network: chain,

        tokenAddress: address,
        pairAddress: pair.pairAddress || '',

        dexUrl: pair.url || '',

        explorerUrl: explorerUrl(chain, address),

        pairCreatedAt:
          toNumber(pair.pairCreatedAt),

        sparkline_in_7d: null
      };
    });
}

// حذف تکرار توکن‌ها
function removeDuplicates(items, query = '') {
  const unique = new Map();

  const q = String(query || '')
    .trim()
    .toLowerCase();

  for (const item of items) {
    const address = item.tokenAddress?.toLowerCase();

    const key = address
      ? `${String(item.chainId).toLowerCase()}:${address}`
      : item.coinId
        ? `cg:${item.coinId}`
        : item.id;

    const previous = unique.get(key);

    if (!previous) {
      unique.set(key, item);
      continue;
    }

    const newLiquidity = Number(item.liquidity) || 0;
    const oldLiquidity = Number(previous.liquidity) || 0;

    if (newLiquidity > oldLiquidity) {
      unique.set(key, item);
    }
  }

  return [...unique.values()].sort((a, b) => {
    const aAddress = a.tokenAddress?.toLowerCase();
    const bAddress = b.tokenAddress?.toLowerCase();

    if (aAddress === q && bAddress !== q) return -1;
    if (bAddress === q && aAddress !== q) return 1;

    const aExact =
      a.name?.toLowerCase() === q ||
      a.symbol?.toLowerCase() === q;

    const bExact =
      b.name?.toLowerCase() === q ||
      b.symbol?.toLowerCase() === q;

    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    if (q === 'pepe') {
      if (a.coinId === 'pepe' && b.coinId !== 'pepe') return -1;
      if (b.coinId === 'pepe' && a.coinId !== 'pepe') return 1;
    }

    const aRank = Number(a.market_cap_rank) || Infinity;
    const bRank = Number(b.market_cap_rank) || Infinity;

    if (aRank !== bRank) return aRank - bRank;

    return (
      (Number(b.liquidity) || 0) -
      (Number(a.liquidity) || 0)
    );
  });
}

// جستجوی هم‌زمان در CoinGecko و DexScreener
export async function searchMarketAssets(query) {
  const q = String(query || '').trim();

  if (!q) return [];

  const results = await Promise.allSettled([
    searchCoinGecko(q),
    searchDexScreener(q)
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
    throw new Error('سرویس‌های جستجو در دسترس نیستند');
  }

  return removeDuplicates(
    [...coins, ...tokens],
    q
  ).slice(0, 100);
}

// دریافت جزئیات CoinGecko
async function fetchCoinGeckoDetails(asset) {
  const data = await getJSON(
    `${API}/coins/${encodeURIComponent(asset.coinId)}` +
    `?localization=false` +
    `&tickers=false` +
    `&market_data=true` +
    `&community_data=false` +
    `&developer_data=false` +
    `&sparkline=true`
  );

  const market = data.market_data || {};
  const links = data.links || {};
const platforms = data.platforms || {};

const contractEntry = Object.entries(platforms).find(
  ([, address]) => typeof address === 'string' && address.trim()
);

const contractChain = contractEntry?.[0] || '';
const contractAddress = contractEntry?.[1] || '';
  const sparkline = market.sparkline_7d?.price;

  return {
    ...asset,

    name: data.name || asset.name,
    symbol: data.symbol || asset.symbol,

    image:
      data.image?.large ||
      data.image?.small ||
      asset.image,

    current_price:
      toNumber(market.current_price?.usd) ??
      asset.current_price ?? null,

    market_cap:
      toNumber(market.market_cap?.usd) ??
      asset.market_cap ?? null,

    fully_diluted_valuation:
      toNumber(market.fully_diluted_valuation?.usd) ??
      asset.fully_diluted_valuation ?? null,

    total_volume:
      toNumber(market.total_volume?.usd) ??
      asset.total_volume ?? null,

    price_change_percentage_24h:
      toNumber(market.price_change_percentage_24h) ??
      asset.price_change_percentage_24h ?? null,

    high_24h:
      toNumber(market.high_24h?.usd) ??
      asset.high_24h ?? null,

    low_24h:
      toNumber(market.low_24h?.usd) ??
      asset.low_24h ?? null,

    ath:
      toNumber(market.ath?.usd) ??
      asset.ath ?? null,

    atl:
      toNumber(market.atl?.usd) ??
      asset.atl ?? null,

    circulating_supply:
      toNumber(market.circulating_supply) ??
      asset.circulating_supply ?? null,

    total_supply:
      toNumber(market.total_supply) ??
      asset.total_supply ?? null,

    max_supply:
      toNumber(market.max_supply) ??
      asset.max_supply ?? null,

    sparkline_in_7d:
      Array.isArray(sparkline)
        ? { price: sparkline }
        : asset.sparkline_in_7d,

    market_cap_rank:
      toNumber(data.market_cap_rank) ??
      asset.market_cap_rank ?? null,

    homepage:
      Array.isArray(links.homepage)
        ? links.homepage.find(Boolean) || ''
        : '',

    whitepaper: links.whitepaper || '',
chainId: contractChain || asset.chainId || '',

network: contractChain
  ? getNetworkName(contractChain)
  : asset.network || '',

tokenAddress: contractAddress || asset.tokenAddress || '',

explorerUrl:
  links.blockchain_site?.find(Boolean) ||
  explorerUrl(contractChain, contractAddress) ||
  asset.explorerUrl ||
  '',


    source: 'CoinGecko',
    dataSource: 'CoinGecko'
  };
}

// دریافت جزئیات DexScreener
async function fetchDexDetails(asset) {
  if (!asset.tokenAddress) return asset;

  const data = await getJSON(
    `${DEX_API}/tokens/${encodeURIComponent(asset.tokenAddress)}`
  );

  const pairs = Array.isArray(data.pairs)
    ? data.pairs
    : [];

  const address = asset.tokenAddress.toLowerCase();

  const matchingPairs = pairs
    .filter(pair =>
      pair.baseToken?.address?.toLowerCase() === address &&
      (!asset.chainId || pair.chainId === asset.chainId)
    )
    .sort((a, b) =>
      (Number(b.liquidity?.usd) || 0) -
      (Number(a.liquidity?.usd) || 0)
    );

  if (!matchingPairs.length) return asset;

  const pair = matchingPairs[0];

  const updated = {
    ...asset,

    name: pair.baseToken?.name || asset.name,
    symbol: pair.baseToken?.symbol || asset.symbol,

    image: pair.info?.imageUrl || asset.image,

    current_price:
      toNumber(pair.priceUsd) ?? asset.current_price,

    price_change_percentage_24h:
      toNumber(pair.priceChange?.h24) ??
      asset.price_change_percentage_24h,

    market_cap:
      toNumber(pair.marketCap) ?? asset.market_cap,

    fully_diluted_valuation:
      toNumber(pair.fdv) ??
      asset.fully_diluted_valuation,

    total_volume:
      toNumber(pair.volume?.h24) ??
      asset.total_volume,

    liquidity:
      toNumber(pair.liquidity?.usd) ??
      asset.liquidity,

    high_24h: asset.high_24h ?? null,
    low_24h: asset.low_24h ?? null,

    chainId: pair.chainId || asset.chainId,
    network: pair.chainId || asset.network,

    tokenAddress: pair.baseToken.address,

    pairAddress:
      pair.pairAddress || asset.pairAddress,

    dexUrl:
      pair.url || asset.dexUrl || '',

    explorerUrl:
      explorerUrl(pair.chainId, pair.baseToken.address),

    pairCreatedAt:
      toNumber(pair.pairCreatedAt),

    source: 'DexScreener',
    dataSource: 'DexScreener'
  };

  // اطلاعات ۲۴ ساعته قرارداد اصلی PEPE
  if (
    address === PEPE_ETH_ADDRESS.toLowerCase() &&
    String(pair.chainId).toLowerCase() === 'ethereum'
  ) {
    try {
      const pepe = await getJSON(
        `${API}/coins/markets?vs_currency=usd&ids=pepe&sparkline=false`
      );

      if (Array.isArray(pepe) && pepe.length) {
        updated.high_24h =
          toNumber(pepe[0].high_24h) ?? updated.high_24h;

        updated.low_24h =
          toNumber(pepe[0].low_24h) ?? updated.low_24h;
      }
    } catch (error) {
      // مقدار قبلی حفظ می‌شود.
    }

    if (
      updated.high_24h == null ||
      updated.low_24h == null
    ) {
      try {
        const ticker = await getJSON(
          `${BINANCE_API}/ticker/24hr?symbol=PEPEUSDT`
        );

        updated.high_24h =
          updated.high_24h ?? toNumber(ticker.highPrice);

        updated.low_24h =
          updated.low_24h ?? toNumber(ticker.lowPrice);
      } catch (error) {
        // اطلاعات ساختگی نمایش داده نمی‌شود.
      }
    }
  }

  return updated;
}

// دریافت جزئیات کامل ارز انتخاب‌شده
// دریافت جزئیات ارز بدون حافظه موقت
async function fetchCoinMarketUncached(asset) {
  if (asset.kind === 'coingecko') {
    return await fetchCoinGeckoDetails(asset);
  }

  if (asset.kind === 'dex') {
    return await fetchDexDetails(asset);
  }

  return asset;
}

// دریافت جزئیات ارز با حافظه موقت ۶۰ ثانیه‌ای
export async function fetchCoinMarket(asset) {
  if (!asset) {
    throw new Error('No asset selected');
  }

  const cacheKey = asset.kind === 'coingecko'
    ? `coingecko:${asset.coinId || asset.id || asset.symbol}`
    : `dex:${asset.chainId || ''}:${asset.tokenAddress || asset.pairAddress || asset.symbol}`;

  const cached = detailsCache.get(cacheKey);

  if (cached && Date.now() - cached.time < DETAILS_CACHE_TTL_MS) {
    return { ...cached.data };
  }

  if (detailsRequests.has(cacheKey)) {
    return detailsRequests.get(cacheKey);
  }

  const request = (async () => {
    try {
      const data = await fetchCoinMarketUncached(asset);
      detailsCache.set(cacheKey, {
        time: Date.now(),
        data
      });
      return data;
    } catch (error) {
      return asset;
    } finally {
      detailsRequests.delete(cacheKey);
    }
  })();

  detailsRequests.set(cacheKey, request);
  return request;

} 
//مرتب‌سازی بازار
export function sortMarketAssets(items, sortBy = 'market_cap') {
  const rows = [...(items || [])];

  const fields = {
    price: 'current_price',
    change: 'price_change_percentage_24h',
    market_cap: 'market_cap',
    volume: 'total_volume',
    liquidity: 'liquidity'
  };

  const field = fields[sortBy] || 'market_cap';

  return rows.sort((a, b) => {
    const av = toNumber(a[field]);
    const bv = toNumber(b[field]);

    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    return bv - av;
  });
}

// نام شبکه‌های شناخته‌شده
export function getNetworkName(chainId) {
  const names = {
    ethereum: 'Ethereum',
    bsc: 'BNB Smart Chain',
    'binance-smart-chain': 'BNB Smart Chain',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum',
    optimism: 'Optimism',
    base: 'Base',
    avalanche: 'Avalanche',
    solana: 'Solana',
    fantom: 'Fantom',
    tron: 'TRON'
  };

  const key = String(chainId || '').toLowerCase();

  return names[key] || chainId || 'Unknown';
}
