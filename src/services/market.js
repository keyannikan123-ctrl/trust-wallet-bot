Ø§ØµÙ„Ø§Ø­Ø§Øª ÙØ§ÛŒÙ„ src/App.jsx
======================

Ø§ÛŒÙ† Ù…ØªÙ† Ø´Ø§Ù…Ù„ Ø¯Ùˆ Ø¨Ø®Ø´ Ø§ØµÙ„Ø§Ø­ÛŒ Ø§Ø³Øª. Ú†ÙˆÙ† ÙØ§ÛŒÙ„ Ú©Ø§Ù…Ù„ App.jsx Ø·ÙˆÙ„Ø§Ù†ÛŒ Ø§Ø³ØªØŒ Ø§ÛŒÙ† Ø¯Ùˆ Ø¨Ø®Ø´ Ø±Ø§ Ø¯Ø± ÙØ§ÛŒÙ„ Ø§ØµÙ„ÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ú©Ù†ÛŒØ¯.
ÙØ¹Ù„Ø§Ù‹ Ù‡ÛŒÚ† Ø¨Ø®Ø´ Ø¯ÛŒÚ¯Ø±ÛŒ Ø±Ø§ Ù¾Ø§Ú© Ù†Ú©Ù†ÛŒØ¯.

Ø¨Ø®Ø´ Ø§ÙˆÙ„: Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ useEffect Ù…Ø±Ø¨ÙˆØ· Ø¨Ù‡ ØªØ§Ø²Ù‡â€ŒØ³Ø§Ø²ÛŒ Ø¨Ø§Ø²Ø§Ø±
---------------------------------------------------

Ø¯Ø± App.jsx Ø§ÛŒÙ† Ù‚Ø³Ù…Øª Ø±Ø§ Ù¾ÛŒØ¯Ø§ Ú©Ù†ÛŒØ¯:
  useEffect(() => {
    loadMarket();

    const timer = setInterval(loadMarket, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadMarket();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

Ø¢Ù† Ø±Ø§ Ø¨Ø§ Ú©Ø¯ Ø²ÛŒØ± Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ú©Ù†ÛŒØ¯:

  useEffect(() => {
    loadMarket();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        loadMarket();
      }
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        loadMarket();
      }
    };

    const onOnline = () => {
      if (document.visibilityState === 'visible') {
        loadMarket();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

Ø¨Ø®Ø´ Ø¯ÙˆÙ…: Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†ÛŒ Ú©Ø§Ù…Ù„ ØªØ§Ø¨Ø¹ selectAsset
---------------------------------------

Ø¯Ø± App.jsx ØªØ§Ø¨Ø¹ÛŒ Ø±Ø§ Ù¾ÛŒØ¯Ø§ Ú©Ù†ÛŒØ¯ Ú©Ù‡ Ø¨Ø§ Ø§ÛŒÙ† Ø®Ø· Ø´Ø±ÙˆØ¹ Ù…ÛŒâ€ŒØ´ÙˆØ¯:
  async function selectAsset(asset) {

Ú©Ù„ ØªØ§Ø¨Ø¹ ÙØ¹Ù„ÛŒ Ø±Ø§ ØªØ§ Ø¢Ú©ÙˆÙ„Ø§Ø¯ Ù¾Ø§ÛŒØ§Ù†ÛŒ Ø¢Ù† Ù¾Ø§Ú© Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ Ø§ÛŒÙ† ØªØ§Ø¨Ø¹ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ú©Ù†ÛŒØ¯:

  async function selectAsset(asset) {
    try {
      setPicked(null);
      setSearchError('');

      const details = await fetchCoinMarket(asset);

      if (details) {
        const updatedDetails = {
          ...asset,
          ...details,
          id: asset.id,
          kind: asset.kind,
          source: asset.source,
          coinId: asset.coinId,
          network: asset.network,
          chainId: asset.chainId,
          tokenAddress: asset.tokenAddress,
        };

        setPicked(updatedDetails);

        setSearchResults((old) =>
          old.map((item) =>
            item.id === asset.id
              ? {
                  ...item,
                  ...details,
                  id: item.id,
                  kind: item.kind,
                  source: item.source,
                  coinId: item.coinId,
                  network: item.network,
                  chainId: item.chainId,
                  tokenAddress: item.tokenAddress,
                }
              : item
          )
        );
      }
    } catch (error) {
      setSearchError(
        'Ø¯Ø±ÛŒØ§ÙØª Ø¬Ø²Ø¦ÛŒØ§Øª Ø§Ø±Ø² Ù†Ø§Ù…ÙˆÙÙ‚ Ø´Ø¯: ' +
          (error?.message || 'Ø®Ø·Ø§')
      );
    }
  }

Ù†Ú©ØªÙ‡ Ù…Ù‡Ù…
--------
Ø§ÛŒÙ† Ø¯Ùˆ Ø§ØµÙ„Ø§Ø­ Ø¨Ø§Ø¹Ø« Ù…ÛŒâ€ŒØ´ÙˆØ¯:
- Ø¨Ø§ Ø¨Ø§Ø²Ú¯Ø´Øª Ø§ÛŒÙ†ØªØ±Ù†ØªØŒ Ø¨Ø§Ø²Ø§Ø± Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø´ÙˆØ¯.
- Ø¨Ø§ Ø¨Ø±Ú¯Ø´ØªÙ† Ø¨Ù‡ Ø¨Ø±Ù†Ø§Ù…Ù‡ØŒ Ø¨Ø§Ø²Ø§Ø± ØªØ§Ø²Ù‡ Ø´ÙˆØ¯.
- Ù¾Ø³ Ø§Ø² Ø§Ù†ØªØ®Ø§Ø¨ ÛŒÚ© Ø§Ø±Ø²ØŒ Ø§Ø·Ù„Ø§Ø¹Ø§Øª Ø¯Ø±ÛŒØ§ÙØªâ€ŒØ´Ø¯Ù‡ Ø¯Ø± Ø±Ø¯ÛŒÙ Ù‡Ù…Ø§Ù† Ø§Ø±Ø² Ø¯Ø± Ø¬Ø¯ÙˆÙ„ Ù†ÛŒØ² Ø¨Ù‡â€ŒØ±ÙˆØ² Ø´ÙˆØ¯.

Ø§ÛŒÙ† ÙØ§ÛŒÙ„ØŒ Ø¯Ùˆ Ø¨Ø®Ø´ Ø§ØµÙ„Ø§Ø­ÛŒ Ø§Ø³Øª Ùˆ Ù†Ø³Ø®Ù‡ Ú©Ø§Ù…Ù„ App.jsx Ù†ÛŒØ³Øª.
Ù‡Ù†ÙˆØ² Ù‡ÛŒÚ† ØªØºÛŒÛŒØ±ÛŒ Ø¯Ø± GitHub Ø«Ø¨Øª ÛŒØ§ Ù…Ù†ØªØ´Ø± Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª.
