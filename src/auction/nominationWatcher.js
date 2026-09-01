function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseDollar(value = '') {
  const match = String(value).match(/\$(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
}

function findPlayerRowMarketValue(playerName) {
  if (!playerName) return null;
  const candidates = [...document.querySelectorAll('tr, [class*="player"], [class*="Table__TR"]')];
  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || !text.toLowerCase().includes(playerName.toLowerCase())) continue;
    const price = parseDollar(text);
    if (Number.isFinite(price)) return price;
  }
  return null;
}

function parseNomineeFromText(text = '') {
  const cleaned = normalizeText(text);
  const match = cleaned.match(/^(.+?)\s+([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i);
  if (!match) return null;
  return {
    playerName: match[1].trim(),
    nflTeam: match[2].toUpperCase(),
    position: match[3].toUpperCase().replace('D/ST', 'DST'),
  };
}

function findCurrentBidFromDocument(playerName) {
  const candidates = [...document.querySelectorAll('[class*="bid"], [class*="auction"], [class*="nominee"], [class*="draft"]')];
  const values = [];
  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || (playerName && !text.toLowerCase().includes(playerName.toLowerCase()))) continue;
    for (const match of text.matchAll(/\$(\d{1,3})\b/g)) values.push(Number(match[1]));
  }
  return values.length ? Math.min(...values) : null;
}

export function detectCurrentNomination() {
  const candidates = [...document.querySelectorAll('[class*="nominee"], [class*="player-card"], [class*="draftPlayer"], [class*="auction"]')];

  for (const el of candidates) {
    const text = normalizeText(el.innerText || el.textContent || '');
    if (!text || !/2026 PROJECTED|2025 STATS|PREV/i.test(text)) continue;
    const player = parseNomineeFromText(text);
    if (!player) continue;

    return {
      ...player,
      currentBid: findCurrentBidFromDocument(player.playerName),
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
