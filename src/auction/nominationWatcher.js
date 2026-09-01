function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizePosition(value = '') {
  return String(value).trim().toUpperCase().replace('D/ST', 'DST');
}

function parseDollarAfterLabel(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = normalizeText(text).match(new RegExp(`${escaped}\\s*\\$([0-9]{1,3})`, 'i'));
  return match ? Number(match[1]) : null;
}

export function parseNomineeCardText(text = '') {
  const cleaned = normalizeText(text);
  if (!/CURRENT OFFER:\s*\$\d+/i.test(cleaned) || !/PRE-DRAFT VAL:\s*\$\d+/i.test(cleaned)) return null;

  // Restrict identity parsing to the heading portion before ESPN's dynamic
  // auction content. This supports both spaced text ("Derrick Henry BAL RB")
  // and collapsed text ("Jonathan TaylorINDRB") while ensuring that changing
  // bids and bid history never become part of the player identity.
  const boundaryIndex = [' CURRENT OFFER:', ' 2025 STATS:']
    .map((marker) => cleaned.toUpperCase().indexOf(marker))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (!Number.isInteger(boundaryIndex)) return null;
  const heading = cleaned.slice(0, boundaryIndex).trim();
  const headingMatch = heading.match(/^(.+?)\s*([A-Z]{2,3})\s*(QB|RB|WR|TE|K|D\/ST|DST)$/);
  if (!headingMatch) return null;

  return {
    playerName: headingMatch[1].trim(),
    nflTeam: headingMatch[2].toUpperCase(),
    position: normalizePosition(headingMatch[3]),
    currentBid: parseDollarAfterLabel(cleaned, 'CURRENT OFFER:'),
    marketValue: parseDollarAfterLabel(cleaned, 'PRE-DRAFT VAL:'),
    marketValueSource: 'espn-practice',
    rawText: cleaned,
  };
}

function detectFromPlayerSelectedDom() {
  const card = document.querySelector('.player-selected');
  if (!card) return null;

  const nameEl = card.querySelector('[class*="playerinfo__playername"]');
  const teamEl = card.querySelector('[class*="playerinfo__playerteam"]');
  const positionEl = card.querySelector('[class*="playerinfo__playerpos"]');
  if (!nameEl || !teamEl || !positionEl) return null;

  const playerName = normalizeText(nameEl.textContent || nameEl.innerText || '');
  const nflTeam = normalizeText(teamEl.textContent || teamEl.innerText || '').toUpperCase();
  const position = normalizePosition(positionEl.textContent || positionEl.innerText || '');
  if (!playerName || !nflTeam || !position) return null;

  // Price labels can live in sibling containers, so read the compact draft
  // area rather than just the player-info node. The player identity itself
  // comes exclusively from the dedicated ESPN spans above.
  const pickArea = card.closest('.pickArea') ?? card.parentElement ?? card;
  const rawText = normalizeText(pickArea.innerText || pickArea.textContent || '');
  const currentBid = parseDollarAfterLabel(rawText, 'CURRENT OFFER:');
  const marketValue = parseDollarAfterLabel(rawText, 'PRE-DRAFT VAL:');

  if (!Number.isFinite(currentBid) || !Number.isFinite(marketValue)) return null;

  return {
    playerName,
    nflTeam,
    position,
    currentBid,
    marketValue,
    marketValueSource: 'espn-practice',
    rawText,
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

export function nominationIdentity(nomination) {
  if (!nomination?.playerName) return null;
  return `${nomination.playerName}|${nomination.nflTeam ?? ''}|${nomination.position ?? ''}`.toLowerCase();
}

export function detectCurrentNomination() {
  const structured = detectFromPlayerSelectedDom();
  if (structured) return structured;

  // Fallback for ESPN variants where the dedicated spans are unavailable.
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

    const key = nominationIdentity(nomination);
    if (key && key !== lastKey) {
      lastKey = key;
      onNomination?.(nomination);
    }
    return nomination;
  }

  function start() {
    stop();
    lastKey = null;
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
