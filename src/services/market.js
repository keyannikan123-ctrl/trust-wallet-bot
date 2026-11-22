
const API = 'https://api.coingecko.com/api/v3';
const DEX_API = 'https://api.dexscreener.com/latest/dex';
const COINCAP_API = 'https://api.coincap.io/v2';
const BINANCE_API = 'https://api.binance.com/api/v3';

const PEPE_ETH_ADDRESS =
  '0x6982508145454Ce325dDbE47a25d4ec3d2311933';

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

async function getJSON(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
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

async function fetchCoinGeckoMarket() {
  const data = await getJSON(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  );

  if (!Array.isArray(data) || !data.length) {
    throw new Error('CoinGecko اطلاعاتی برنگرداند');
  }

  return data.map(coin => ({
    ...coin,
    dataSource: 'CoinGecko',
  }));
}

async function fetchCoinCapMarket() {
  const result = await getJSON(`${COINCAP_API}/assets?limit=50`);
  const assets = result?.data;

  if (!Array.isArray(assets) || !assets.length) {
    throw new Error('CoinCap اطلاعاتی برنگرداند');
  }

  return assets.map(coin => ({
    id: `coincap:${coin.id}`,
    name: coin.name,
    symbol: coin.symbol,
    image: '',
    current_price: Number(coin.priceUsd) || 0,
    market_cap: Number(coin.marketCapUsd) || 0,
    total_volume: Number(coin.volumeUsd24Hr) || 0,
    price_change_percentage_24h:
      Number(coin.changePercent24Hr) || 0,
    market_cap_rank: Number(coin.rank) || null,
    sparkline_in_7d: null,
    dataSource: 'CoinCap',
  }));
}

async function fetchBinanceMarket() {
  const data = await getJSON(`${BINANCE_API}/ticker/24hr`);

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
    .slice(0, 50);

  return rows.map((item, index) => {
    const symbol = item.symbol.replace(/USDT$/, '');

    return {
      id: `binance:${item.symbol}`,
      name: symbol,
      symbol,
      image: '',
      current_price: Number(item.lastPrice) || 0,
      market_cap: 0,
      total_volume: Number(item.quoteVolume) || 0,
      price_change_percentage_24h:
        Number(item.priceChangePercent) || 0,
      market_cap_rank: index + 1,
      sparkline_in_7d: null,
      dataSource: 'Binance',
    };
  });
}

export async function fetchMarketCoins() {
  const sources = [
    fetchCoinGeckoMarket,
    fetchCoinCapMarket,
    fetchBinanceMarket,
  ];

  const errors = [];

  for (const fetcher of sources) {
    try {
      return await fetcher();
    } catch (error) {
      errors.push(error?.message || 'خطای شبکه');
    }
  }

  throw new Error(
    'هیچ منبع قیمت در دسترس نیست. ' + errors.join(' | ')
  );
}

async function searchCoinGecko(query) {
  if (isAddress(query)) return [];

  const data = await getJSON(
    `${API}/search?query=${encodeURIComponent(query)}`
  );

  const coins = data.coins || [];

  if (!coins.length) return [];

  const ids = coins
    .map(coin => coin.id)
    .filter(Boolean);

  let marketMap = new Map();

  try {
    const marketData = await getJSON(
      `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(','))}&sparkline=true&price_change_percentage=24h`
    );

    if (Array.isArray(marketData)) {
      marketMap = new Map(
        marketData.map(coin => [coin.id, coin])
      );
    }
  } catch (error) {
    // تلاش جداگانه برای دریافت قیمت انجام می‌شود.
  }

  const missingPriceCoins = coins
    .filter(coin => {
      const price = marketMap.get(coin.id)?.current_price;
      return price == null || !Number.isFinite(Number(price));
    })
    .slice(0, 8);

  const individualResults = await Promise.allSettled(
    missingPriceCoins.map(async coin => {
      const rows = await getJSON(
        `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coin.id)}&sparkline=true&price_change_percentage=24h`
      );

      return {
        id: coin.id,
        market: Array.isArray(rows) ? rows[0] : null,
      };
    })
  );

  for (const result of individualResults) {
    if (
      result.status === 'fulfilled' &&
      result.value.market
    ) {
      marketMap.set(
        result.value.id,
        result.value.market
      );
    }
  }

  return coins.map(coin => {
    const market = marketMap.get(coin.id) || {};

    return {
      ...market,
      id: `cg:${coin.id}`,
      kind: 'coingecko',
      source: 'CoinGecko',
      name: coin.name,
      symbol: coin.symbol,
      image: market.image || coin.thumb,
      coinId: coin.id,
      market_cap_rank:
        market.market_cap_rank || coin.market_cap_rank,
      current_price: market.current_price ?? null,
      price_change_percentage_24h:
        market.price_change_percentage_24h ?? null,
      market_cap: market.market_cap ?? null,
      total_volume: market.total_volume ?? null,
      sparkline_in_7d: market.sparkline_in_7d || null,
      chainId: null,
      network: 'CoinGecko',
    };
  });
}

async function searchDexScreener(query) {
  const cleanQuery = String(query || '').trim();

  const endpoint = isAddress(cleanQuery)
    ? `${DEX_API}/tokens/${encodeURIComponent(cleanQuery)}`
    : `${DEX_API}/search?q=${encodeURIComponent(cleanQuery)}`;

  const data = await getJSON(endpoint);
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
      pairAddress: pair.pairAddress || '',
      dexUrl: pair.url || '',
    }));
}

function removeDuplicates(items, query) {
  const unique = new Map();
  const q = String(query || '').trim().toLowerCase();

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

    if (
      (Number(item.liquidity) || 0) >
      (Number(previous.liquidity) || 0)
    ) {
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

    // PEPE شناخته‌شده در CoinGecko در جستجوی PEPE اولویت دارد.
    if (q === 'pepe') {
      if (a.coinId === 'pepe' && b.coinId !== 'pepe') return -1;
      if (b.coinId === 'pepe' && a.coinId !== 'pepe') return 1;
    }

    // برای آدرس قرارداد PEPE اتریوم، همان قرارداد در اولویت است.
    if (q === PEPE_ETH_ADDRESS.toLowerCase()) {
      if (aAddress === q && bAddress !== q) return -1;
      if (bAddress === q && aAddress !== q) return 1;
    }

    const aRank = Number(a.market_cap_rank) || Infinity;
    const bRank = Number(b.market_cap_rank) || Infinity;

    if (aRank !== bRank) return aRank - bRank;

    return (Number(b.liquidity) || 0) -
      (Number(a.liquidity) || 0);
  });
}

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
    throw new Error('سرویس‌های جستجو در دسترس نیستند');
  }

  return removeDuplicates(
    [...coins, ...tokens],
    q
  ).slice(0, 50);
}

export async function fetchCoinMarket(asset) {
  if (!asset) {
    throw new Error('No asset selected');
  }

  if (asset.kind === 'coingecko') {
    const data = await getJSON(
      `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(asset.coinId)}&sparkline=true&price_change_percentage=24h`
    );

    if (!Array.isArray(data) || !data.length) {
      return asset;
    }

    return {
      ...asset,
      ...data[0],
      kind: 'coingecko',
      coinId: asset.coinId,
    };
  }

  if (asset.kind === 'dex') {
    if (!asset.tokenAddress) {
      return asset;
    }

    try {
      const data = await getJSON(
        `${DEX_API}/tokens/${encodeURIComponent(asset.tokenAddress)}`
      );

      const pairs = Array.isArray(data.pairs)
        ? data.pairs
        : [];

      const address = asset.tokenAddress.toLowerCase();

      const matchingPairs = pairs
        .filter(pair =>
          pair.baseToken?.address?.toLowerCase() === address
        )
        .sort((a, b) =>
          (Number(b.liquidity?.usd) || 0) -
          (Number(a.liquidity?.usd) || 0)
        );

      if (!matchingPairs.length) {
        return asset;
      }

      const pair = matchingPairs[0];

      return {
        ...asset,
        name: pair.baseToken?.name || asset.name,
        symbol: pair.baseToken?.symbol || asset.symbol,
        image: pair.info?.imageUrl || asset.image,
        current_price: Number(pair.priceUsd) || asset.current_price,
        price_change_percentage_24h:
          Number(pair.priceChange?.h24) || 0,
        market_cap: Number(pair.marketCap || 0),
        fully_diluted_valuation: Number(pair.fdv || 0),
        total_volume: Number(pair.volume?.h24) || 0,
        liquidity: Number(pair.liquidity?.usd) || 0,
        chainId: pair.chainId || asset.chainId,
        network: pair.chainId || asset.network,
        tokenAddress: pair.baseToken.address,
        pairAddress: pair.pairAddress || asset.pairAddress,
        dexUrl: pair.url || asset.dexUrl || '',
        source: 'DexScreener',
      };
    } catch (error) {
      return asset;
    }
  }

  throw new Error('Unsupported asset type');
}
