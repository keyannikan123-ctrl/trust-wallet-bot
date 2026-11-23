
const API = 'https://api.coingecko.com/api/v3';
const DEX_API = 'https://api.dexscreener.com/latest/dex';
const COINCAP_API = 'https://api.coincap.io/v2';
const BINANCE_API = 'https://api.binance.com/api/v3';

const PEPE_ETH_ADDRESS =
  '0x6982508145454Ce325dDbE47a25d4ec3d2311933';

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

// دریافت اطلاعات اصلی بازار از CoinGecko
async function fetchCoinGeckoMarket() {
  const data = await getJSON(
    `${API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h`
  );

  if (!Array.isArray(data) || !data.length) {
    throw new Error('CoinGecko اطلاعاتی برنگرداند');
  }

  return data.map(coin => ({
    ...coin,
    high_24h: toNumber(coin.high_24h),
    low_24h: toNumber(coin.low_24h),
    dataSource: 'CoinGecko',
  }));
}

// منبع جایگزین CoinCap
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
    current_price: toNumber(coin.priceUsd),
    market_cap: toNumber(coin.marketCapUsd),
    total_volume: toNumber(coin.volumeUsd24Hr),
    price_change_percentage_24h:
      toNumber(coin.changePercent24Hr),
    market_cap_rank: Number(coin.rank) || null,
    high_24h: null,
    low_24h: null,
    sparkline_in_7d: null,
    dataSource: 'CoinCap',
  }));
}

// منبع جایگزین Binance
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
      current_price: toNumber(item.lastPrice),
      market_cap: null,
      total_volume: toNumber(item.quoteVolume),
      price_change_percentage_24h:
        toNumber(item.priceChangePercent),
      high_24h: toNumber(item.highPrice),
      low_24h: toNumber(item.lowPrice),
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

// جستجوی CoinGecko
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
    // در صورت خطای CoinGecko، جستجوی DexScreener ادامه می‌یابد.
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
      high_24h: toNumber(market.high_24h),
      low_24h: toNumber(market.low_24h),
      sparkline_in_7d: market.sparkline_in_7d || null,
      chainId: null,
      network: 'CoinGecko',
    };
  });
}

// جستجوی قرارداد و توکن در DexScreener
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
      current_price: toNumber(pair.priceUsd),
      price_change_percentage_24h:
        toNumber(pair.priceChange?.h24),
      market_cap: toNumber(pair.marketCap),
      fully_diluted_valuation: toNumber(pair.fdv),
      total_volume: toNumber(pair.volume?.h24),
      liquidity: toNumber(pair.liquidity?.usd),
      high_24h: null,
      low_24h: null,
      chainId: pair.chainId,
      network: pair.chainId || 'Unknown',
      tokenAddress: pair.baseToken.address,
      pairAddress: pair.pairAddress || '',
      dexUrl: pair.url || '',
    }));
}

// حذف تکرار واقعی فقط بر اساس شبکه و آدرس قرارداد
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

    if (q === 'pepe') {
      if (a.coinId === 'pepe' && b.coinId !== 'pepe') return -1;
      if (b.coinId === 'pepe' && a.coinId !== 'pepe') return 1;
    }

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

// دریافت اطلاعات تکمیلی توکن انتخاب‌شده
export async function fetchCoinMarket(asset) {
  if (!asset) {
    throw new Error('No asset selected');
  }

  // اطلاعات CoinGecko
  if (asset.kind === 'coingecko') {
    const data = await getJSON(
      `${API}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(asset.coinId)}&sparkline=true&price_change_percentage=24h`
    );

    if (!Array.isArray(data) || !data.length) {
      return asset;
    }

    const market = data[0];

    return {
      ...asset,
      ...market,
      kind: 'coingecko',
      coinId: asset.coinId,
      high_24h: toNumber(market.high_24h),
      low_24h: toNumber(market.low_24h),
    };
  }

  // اطلاعات DexScreener
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
          pair.baseToken?.address?.toLowerCase() === address &&
          (!asset.chainId || pair.chainId === asset.chainId)
        )
        .sort((a, b) =>
          (Number(b.liquidity?.usd) || 0) -
          (Number(a.liquidity?.usd) || 0)
        );

      if (!matchingPairs.length) {
        return asset;
      }

      const pair = matchingPairs[0];

      const updatedAsset = {
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
          toNumber(pair.volume?.h24) ?? asset.total_volume,
        liquidity:
          toNumber(pair.liquidity?.usd) ?? asset.liquidity,
        high_24h: asset.high_24h ?? null,
        low_24h: asset.low_24h ?? null,
        chainId: pair.chainId || asset.chainId,
        network: pair.chainId || asset.network,
        tokenAddress: pair.baseToken.address,
        pairAddress: pair.pairAddress || asset.pairAddress,
        dexUrl: pair.url || asset.dexUrl || '',
        source: 'DexScreener',
      };

      // فقط برای قرارداد دقیق PEPE اصلی اتریوم
      // ابتدا CoinGecko و سپس Binance بررسی می‌شود.
      if (
        address === PEPE_ETH_ADDRESS.toLowerCase() &&
        String(pair.chainId).toLowerCase() === 'ethereum'
      ) {
        let high = null;
        let low = null;

        // منبع اول: CoinGecko
        try {
          const pepeMarket = await getJSON(
            `${API}/coins/markets?vs_currency=usd&ids=pepe&sparkline=false`
          );

          if (Array.isArray(pepeMarket) && pepeMarket.length) {
            high = toNumber(pepeMarket[0].high_24h);
            low = toNumber(pepeMarket[0].low_24h);
          }
        } catch (error) {
          // در صورت محدودیت CoinGecko، منبع جایگزین آزمایش می‌شود.
        }

        // منبع دوم: Binance؛ جفت PEPE/USDT
        if (high === null || low === null) {
          try {
            const ticker = await getJSON(
              `${BINANCE_API}/ticker/24hr?symbol=PEPEUSDT`
            );

            high = high ?? toNumber(ticker?.highPrice);
            low = low ?? toNumber(ticker?.lowPrice);
          } catch (error) {
            // اگر هیچ منبعی پاسخ ندهد، مقدار خالی باقی می‌ماند.
          }
        }

        updatedAsset.high_24h = high;
        updatedAsset.low_24h = low;
      }

      return updatedAsset;
    } catch (error) {
      return asset;
    }
  }

  throw new Error('Unsupported asset type');
}
