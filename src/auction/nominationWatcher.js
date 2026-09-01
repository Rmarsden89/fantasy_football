function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function parseDollar(value = '') {
  const match = String(value).match(/\$(\d{1,3})\b/);
  return match ? Number(match[1]) : null;
}

export function parseNomineeCardText(text = '') {
  const cleaned = normalizeText(text);
  if (!/CURRENT OFFER:\s*\$\d+/i.test(cleaned) || !/PRE-DRAFT VAL:\s*\$\d+/i.test(cleaned)) return null;

  const playerMatch = cleaned.match(/^(.+?)\s+([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i);
  if (!playerMatch) return null;

  const currentOfferMatch = cleaned.match(/CURRENT OFFER:\s*\$(\d{1,3})/i);
  const marketValueMatch = cleaned.match(/PRE-DRAFT VAL:\s*\$(\d{1,3})/i);

  return {
    playerName: playerMatch[1].trim(),
    nflTeam: playerMatch[2].toUpperCase(),
    position: playerMatch[3].toUpperCase().replace('D/ST', 'DST'),
    currentBid: currentOfferMatch ? Number(currentOfferMatch[1]) : null,
    marketValue: marketValueMatch ? Number(marketValueMatch[1]) : null,
    marketValueSource: 'espn-practice',
    rawText: cleaned,
  };
}

function nomineeCandidates() {
  const selectors = [
    '[class*="auction"]',
    '[class*="offer"]',
    '[class*="draft"]',
    '[class*="player"]',
    'section',
    'div',
  ];
  const elements = [...new Set(selectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];

  return elements
    .map((el) => ({ el, text: normalizeText(el.innerText || el.textContent || '') }))
    .filter(({ text }) => /CURRENT OFFER:\s*\$\d+/i.test(text) && /PRE-DRAFT VAL:\s*\$\d+/i.test(text))
    .sort((a, b) => a.text.length - b.text.length);
}

export function detectCurrentNomination() {
  for (const { text } of nomineeCandidates()) {
    const nomination = parseNomineeCardText(text);
    if (nomination) return nomination;
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
