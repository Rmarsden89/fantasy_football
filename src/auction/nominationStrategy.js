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
    if ((counts.QB ?? 0) === 0) {
      // WR is the primary allocation goal around Bijan/Bowers, so QB is useful
      // but should not outrank an open starting-WR target early.
      return (counts.WR ?? 0) < 2 ? 18 : 30;
    }
    return -30;
  }
  if (position === 'RB') {
    return (counts.RB ?? 0) < 2 ? 12 : 2;
  }
  if (position === 'TE') return -30;
  if (isIndividualDefensivePosition(position)) return (counts.DP ?? 0) < 1 ? 12 : -20;
  if (position === 'DST') return 4;
  if (position === 'K') return 2;
  return 0;
}

// Nomination recommendations are acquisition recommendations first. A $0 ESPN
// value is not a bargain signal: it means the room may simply let us have the
// player for $1. That can be useful in the endgame, but it should not cause an
// unrated player to become our preferred opening nomination.
function acquisitionValueScore(player, cheat) {
  const value = Number(player?.auctionValueAverage);
  const keeperUpside = cheat?.keeperUpside === 'HIGH';

  if (!Number.isFinite(value)) return -4;
  if (value <= 0) return keeperUpside ? -6 : -30;
  if (value <= 5) return keeperUpside ? 2 : -8;
  if (value <= 15) return 0;
  if (value <= 30) return 3;
  if (value <= 60) return 6;
  return 8;
}

function projectedScore(player) {
  const points = Number(player?.projectedPoints);
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.min(10, points / 40);
}

function starterAcquisitionPenalty({ player, cheat, counts }) {
  const starterNeedOpen = (counts.WR ?? 0) < 2 || (counts.QB ?? 0) < 1;
  if (!starterNeedOpen) return 0;

  const value = Number(player?.auctionValueAverage);
  const isOffensiveSkill = ['QB', 'RB', 'WR', 'TE'].includes(player?.position);

  // While core starter needs remain, do not let a $0/$1-ish unrated offensive
  // player outrank legitimate starter targets purely because his projection is
  // respectable. Cheap fliers become appropriate later in the draft.
  if (isOffensiveSkill && !cheat && Number.isFinite(value) && value <= 5) return -18;
  return 0;
}

export function recommendNomination({
  playerPool = [],
  sales = [],
  roster = [],
  config,
  limit = 5,
} = {}) {
  const counts = rosterCounts(roster);
  const unavailable = unavailableNames({
    sales,
    roster,
    keepers: config?.myKeepers ?? [],
  });

  const candidates = playerPool
    .filter((player) => player?.name && !unavailable.has(normalizeName(player.name)))
    .filter((player) => !(Number(player.raw?.onTeamId) > 0))
    .map((player) => {
      const cheat = getCheatSheetPlayer(player.name);
      const idp = getIdpTarget(player.name);
      const need = rosterNeedScore(player.position, counts);
      const preference = tierScore(cheat?.tier);
      const idpBonus = idp ? Math.round(idp.priority / 10) : 0;
      const acquisitionValue = acquisitionValueScore(player, cheat);
      const cheapStarterPenalty = starterAcquisitionPenalty({ player, cheat, counts });
      const score = need
        + preference
        + idpBonus
        + acquisitionValue
        + projectedScore(player)
        + cheapStarterPenalty;

      const auctionAverage = Number(player.auctionValueAverage);
      const zeroValue = Number.isFinite(auctionAverage) && auctionAverage <= 0;

      return {
        playerName: player.name,
        position: player.position,
        score: Number(score.toFixed(2)),
        cheatTier: cheat?.tier ?? 'UNRATED',
        targetRole: cheat?.targetRole ?? null,
        idpTier: idp?.tier ?? null,
        projectedPoints: player.projectedPoints ?? null,
        espnAuctionAverage: player.auctionValueAverage ?? null,
        nominationIntent: 'ACQUIRE',
        reason: [
          need > 20 ? 'fills a high-priority open starter need' : null,
          cheat ? `${cheat.tier} pre-draft target` : null,
          idp ? `IDP target tier ${idp.tier}` : null,
          zeroValue ? 'ESPN $0 value is an endgame/flier signal, not an opening-target bonus' : null,
          Number.isFinite(auctionAverage) && auctionAverage > 0 && auctionAverage <= 15
            ? 'affordable acquisition target'
            : null,
        ].filter(Boolean).join('; '),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    primary: candidates[0] ?? null,
    alternatives: candidates.slice(1, Math.max(1, limit)),
    rosterCounts: counts,
  };
}
