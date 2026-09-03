import { getCheatSheetPlayer } from './cheatSheet.js';
import { getIdpTarget, isIndividualDefensivePosition } from './idpTargets.js';

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

function rosterCounts(roster = []) {
  const counts = {};
  for (const player of roster) {
    const position = player?.position;
    if (!position) continue;
    counts[position] = (counts[position] ?? 0) + 1;
    if (isIndividualDefensivePosition(position)) counts.DP = (counts.DP ?? 0) + 1;
  }
  return counts;
}

function unavailableNames({ sales = [], roster = [], keepers = [] } = {}) {
  return new Set(
    [...sales, ...roster, ...keepers]
      .map((player) => normalizeName(player?.playerName ?? player?.name))
      .filter(Boolean),
  );
}

function tierScore(tier) {
  return {
    STRETCH: 30,
    IDEAL: 25,
    FALLBACK: 16,
    VALUE_ONLY: 8,
    AVOID: -25,
  }[tier] ?? 0;
}

function rosterNeedScore(position, counts) {
  if (position === 'WR') {
    if ((counts.WR ?? 0) === 0) return 45;
    if ((counts.WR ?? 0) === 1) return 36;
    return 8;
  }
  if (position === 'QB') {
    if ((counts.QB ?? 0) === 0) return (counts.WR ?? 0) < 2 ? 18 : 30;
    return -30;
  }
  if (position === 'RB') return (counts.RB ?? 0) < 2 ? 12 : 2;
  if (position === 'TE') return -30;
  if (isIndividualDefensivePosition(position)) return (counts.DP ?? 0) < 1 ? 12 : -20;
  if (position === 'DST') return 4;
  if (position === 'K') return 2;
  return 0;
}

function valueScore(player) {
  const value = Number(player?.auctionValueAverage);
  if (!Number.isFinite(value)) return 0;
  if (value === 0) return -24;
  if (value <= 5) return -6;
  if (value <= 15) return 0;
  if (value <= 30) return 6;
  if (value <= 60) return 10;
  return 14;
}

function projectedScore(player) {
  const points = Number(player?.projectedPoints);
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.min(10, points / 40);
}

export function recommendNomination({
  playerPool = [],
  sales = [],
  roster = [],
  config,
  limit = 5,
} = {}) {
  const counts = rosterCounts(roster);

  // The current nomination ranker is experimental and is intentionally kept
  // out of normal draft operation until it is redesigned around explicit
  // auction intent (acquire vs price-discovery vs draining opponent budgets).
  // The bidding model remains active and independent.
  if (config?.auctionStrategy?.nomination?.enabled !== true) {
    return {
      primary: null,
      alternatives: [],
      rosterCounts: counts,
      disabled: true,
      reason: 'experimental nomination recommendations disabled',
    };
  }

  const unavailable = unavailableNames({
    sales,
    roster,
    keepers: config?.myKeepers ?? [],
  });
  const coreStarterNeedOpen = (counts.WR ?? 0) < 2 || (counts.QB ?? 0) < 1;

  const candidates = playerPool
    .filter((player) => player?.name && !unavailable.has(normalizeName(player.name)))
    .filter((player) => !(Number(player.raw?.onTeamId) > 0))
    .map((player) => {
      const cheat = getCheatSheetPlayer(player.name);
      const idp = getIdpTarget(player.name);
      const need = rosterNeedScore(player.position, counts);
      const preference = tierScore(cheat?.tier);
      const idpBonus = idp ? Math.round(idp.priority / 10) : 0;
      const auctionValue = Number(player.auctionValueAverage);
      const cheapUnratedPenalty = coreStarterNeedOpen
        && ['QB', 'RB', 'WR', 'TE'].includes(player.position)
        && !cheat
        && Number.isFinite(auctionValue)
        && auctionValue <= 5
        ? -20
        : 0;
      const score = need + preference + idpBonus + valueScore(player) + projectedScore(player) + cheapUnratedPenalty;

      return {
        playerName: player.name,
        position: player.position,
        score: Number(score.toFixed(2)),
        cheatTier: cheat?.tier ?? 'UNRATED',
        targetRole: cheat?.targetRole ?? null,
        idpTier: idp?.tier ?? null,
        projectedPoints: player.projectedPoints ?? null,
        espnAuctionAverage: player.auctionValueAverage ?? null,
        reason: [
          need > 20 ? 'fills a high-priority open starter need' : null,
          cheat ? `${cheat.tier} pre-draft target` : null,
          idp ? `IDP target tier ${idp.tier}` : null,
          Number(player.auctionValueAverage) >= 16 ? 'meaningful current auction value' : null,
        ].filter(Boolean).join('; '),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    primary: candidates[0] ?? null,
    alternatives: candidates.slice(1, Math.max(1, limit)),
    rosterCounts: counts,
    disabled: false,
  };
}
