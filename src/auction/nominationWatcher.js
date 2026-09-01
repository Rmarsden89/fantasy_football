function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseDollar(value = '') {
  const match = String(value).match(/\$(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
}

function parseDollarValues(value = '') {
  return [...String(value).matchAll(/\$(\d{1,3})\b/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
}

function findPlayerRowMarketValue(playerName) {
  if (!playerName) return null;
  const candidates = [...document.querySelectorAll('tr, [class*="player"], [class*="Table__TR"]')];
  const target = playerName.toLowerCase();

  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || !text.toLowerCase().includes(target)) continue;

    // Prefer table/list rows that begin with ESPN's displayed auction value.
    const leadingPrice = text.match(/^\$(\d{1,3})\b/);
    if (leadingPrice) return Number(leadingPrice[1]);
  }

  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || !text.toLowerCase().includes(target)) continue;
    const price = parseDollar(text);
    if (Number.isFinite(price)) return price;
  }
  return null;
}

export function parseNomineeFromText(text = '') {
  const cleaned = normalizeText(text);
  const match = cleaned.match(/^(.+?)\s+([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i);
  if (!match) return null;
  return {
    playerName: match[1].trim(),
    nflTeam: match[2].toUpperCase(),
    position: match[3].toUpperCase().replace('D/ST', 'DST'),
  };
}

function nominationCandidates() {
  const preferredSelectors = [
    '[class*="nominee"]',
    '[class*="player-card"]',
    '[class*="draftPlayer"]',
    '[class*="auction"]',
  ];
  const preferred = preferredSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);

  // ESPN's salary-cap draft card does not currently expose one of the obvious
  // class names above, so fall back to compact visible containers that contain
  // the stat labels shown on the active nominee card.
  const fallback = [...document.querySelectorAll('div, section, article')]
    .filter((el) => {
      const text = normalizeText(el.innerText || el.textContent || '');
      return text.length >= 15
        && text.length <= 1200
        && /2026 PROJECTED|2025 STATS|PREV/i.test(text);
    })
    .sort((a, b) => {
      const aLength = normalizeText(a.innerText || a.textContent || '').length;
      const bLength = normalizeText(b.innerText || b.textContent || '').length;
      return aLength - bLength;
    });

  return [...new Set([...preferred, ...fallback])];
}

function findCurrentBidFromCard(cardText = '') {
  const values = parseDollarValues(cardText);
  return values.length ? Math.min(...values) : null;
}

function findCurrentBidFromDocument(playerName) {
  const candidates = [...document.querySelectorAll('[class*="bid"], [class*="auction"], [class*="nominee"], [class*="draft"]')];
  const values = [];
  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || (playerName && !text.toLowerCase().includes(playerName.toLowerCase()))) continue;
    values.push(...parseDollarValues(text));
  }
  return values.length ? Math.min(...values) : null;
}

export function detectCurrentNomination() {
  for (const el of nominationCandidates()) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || !/2026 PROJECTED|2025 STATS|PREV/i.test(text)) continue;
    const player = parseNomineeFromText(text);
    if (!player) continue;

    const cardBid = findCurrentBidFromCard(text);
    const documentBid = findCurrentBidFromDocument(player.playerName);

    return {
      ...player,
      currentBid: Number.isFinite(cardBid) ? cardBid : documentBid,
      marketValue: findPlayerRowMarketValue(player.playerName),
      marketValueSource: 'espn-practice',
      rawText: text,
    };
  }

  return null;
}

export function createNominationWatcher({ onNomination = null, intervalMs = 500 } = {}) {
  let timer = null;
  let lastKey = null;

  function scan() {
    const nomination = detectCurrentNomination();
    if (!nomination) return null;
    const key = `${nomination.playerName}:${nomination.currentBid ?? ''}:${nomination.marketValue ?? ''}`;
    if (key !== lastKey) {
      lastKey = key;
      onNomination?.(nomination);
    }
    return nomination;
  }

  function start() {
    stop();
    const initial = scan();
    timer = setInterval(scan, intervalMs);
    return initial;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, stop, scan };
}
