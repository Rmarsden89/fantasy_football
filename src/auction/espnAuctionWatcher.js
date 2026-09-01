function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function findPrice(text) {
  const matches = [...text.matchAll(/\$(\d{1,3})\b/g)];
  if (!matches.length) return null;
  return Number(matches.at(-1)[1]);
}

function findPlayerId(el) {
  const img = el.querySelector?.('img[src*="/headshots/nfl/players/"]');
  if (!img?.src) return null;
  const match = img.src.match(/\/players\/(?:full\/)?(\d+)\.(?:png|jpg|jpeg)/i);
  return match ? Number(match[1]) : null;
}

function parsePlayer(text) {
  const match = text.match(/^(.+?)\s*\/\s*([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i);
  if (!match) return null;

  return {
    playerName: match[1].trim(),
    nflTeam: match[2].toUpperCase(),
    position: match[3].toUpperCase().replace('D/ST', 'DST'),
  };
}

function parseWinningTeam(text, price) {
  const escapedPrice = String(price).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`(?:to|by|won by)\\s+(.+?)\\s+(?:for\\s+)?\\$${escapedPrice}\\b`, 'i'),
    new RegExp(`\\$${escapedPrice}\\s*[-–—:]?\\s*(.+)$`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function parseAuctionEventElement(el) {
  const rawText = normalizeText(el?.innerText || el?.textContent || '');
  if (!rawText || !rawText.includes('$')) return null;

  const player = parsePlayer(rawText);
  const price = findPrice(rawText);
  if (!player || !Number.isFinite(price)) return null;

  const fantasyTeam = parseWinningTeam(rawText, price);
  return {
    ...player,
    playerId: findPlayerId(el),
    price,
    fantasyTeam,
    rawText,
  };
}

export function canonicalSaleKey(sale) {
  return [
    normalizeText(sale?.playerName || '').toLowerCase(),
    Number(sale?.price),
    normalizeText(sale?.fantasyTeam || '').toLowerCase(),
  ].join('|');
}

export function createEspnAuctionWatcher({ onSale = null } = {}) {
  const seen = new Set();
  const sales = [];
  let observer = null;

  function candidateElements() {
    const selectors = [
      '[class*="pick-message"]',
      '[class*="draft-message"]',
      '[class*="activity"]',
      '[class*="event"]',
      '[class*="message"]',
    ];

    return [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
  }

  function scan({ announce = false } = {}) {
    for (const el of candidateElements()) {
      const sale = parseAuctionEventElement(el);
      if (!sale) continue;

      // ESPN currently renders the same completed sale twice: one copy includes
      // the headshot/player id and another text-only copy does not. Deduplicate
      // by the sale facts rather than playerId so both DOM variants collapse.
      const key = canonicalSaleKey(sale);
      if (seen.has(key)) continue;
      seen.add(key);

      const numbered = { saleNumber: sales.length + 1, ...sale };
      sales.push(numbered);

      if (announce) {
        console.log(`💰 SALE ${numbered.saleNumber}: ${sale.playerName} for $${sale.price}`);
        console.table([numbered]);
        onSale?.(numbered, [...sales]);
      }
    }

    return [...sales];
  }

  function start() {
    observer?.disconnect();
    const existing = scan({ announce: false });

    observer = new MutationObserver(() => scan({ announce: true }));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    console.log(`ESPN salary-cap watcher running. ${existing.length} completed sales loaded.`);
    return [...sales];
  }

  function stop() {
    observer?.disconnect();
    observer = null;
  }

  function getSales() {
    return [...sales];
  }

  return { start, stop, scan, getSales };
}
