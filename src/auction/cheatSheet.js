export const AUCTION_CHEAT_SHEET = {
  version: '2026-09-02-v3-dynamic-signals',
  goals: {
    primary: 'Acquire an elite RB1 without sacrificing roster balance',
    secondary: ['Add a quality WR2', 'Add a starting QB at a sensible price'],
  },
  // Tiers are intentionally soft preference priors. They should nudge the
  // recommendation, not impose a static dollar ceiling that ignores the room.
  tierMultipliers: {
    STRETCH: 1.05,
    IDEAL: 1.03,
    FALLBACK: 1.00,
    VALUE_ONLY: 0.96,
    AVOID: 0.75,
  },
  players: {
    'Bijan Robinson': { position: 'RB', tier: 'STRETCH', targetRole: 'RB1', eliteRb: true },
    'Jahmyr Gibbs': { position: 'RB', tier: 'STRETCH', targetRole: 'RB1', eliteRb: true },
    'Jonathan Taylor': { position: 'RB', tier: 'STRETCH', targetRole: 'RB1', eliteRb: true },
    "De'Von Achane": { position: 'RB', tier: 'STRETCH', targetRole: 'RB1', eliteRb: true },
    'Christian McCaffrey': { position: 'RB', tier: 'STRETCH', targetRole: 'RB1', eliteRb: true },

    'Saquon Barkley': { position: 'RB', tier: 'IDEAL', targetRole: 'RB1', eliteRb: true },
    'Chase Brown': { position: 'RB', tier: 'IDEAL', targetRole: 'RB1', eliteRb: true },
    'Omarion Hampton': { position: 'RB', tier: 'IDEAL', targetRole: 'RB1', eliteRb: true },
    'Derrick Henry': { position: 'RB', tier: 'IDEAL', targetRole: 'RB1', eliteRb: true },
    'Ashton Jeanty': { position: 'RB', tier: 'IDEAL', targetRole: 'RB1', eliteRb: true },

    // 2026 rookie; expensive at normal market price, but especially attractive
    // if the room ever lets him fall into cheap keeper-flier territory.
    'Jeremiyah Love': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX', keeperUpside: 'HIGH' },
    'Kenneth Walker III': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Breece Hall': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Kyren Williams': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Javonte Williams': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },

    'Travis Etienne Jr.': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX' },
    'Quinshon Judkins': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX' },
    'Bhayshul Tuten': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },
    'Cam Skattebo': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },
    "D'Andre Swift": { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },
    'Jadarian Price': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'BENCH', keeperUpside: 'HIGH' },

    "Ja'Marr Chase": { position: 'WR', tier: 'STRETCH', targetRole: 'WR1/WR2' },
    'Puka Nacua': { position: 'WR', tier: 'STRETCH', targetRole: 'WR1/WR2' },
    'Amon-Ra St. Brown': { position: 'WR', tier: 'STRETCH', targetRole: 'WR1/WR2' },
    'Jaxon Smith-Njigba': { position: 'WR', tier: 'STRETCH', targetRole: 'WR1/WR2' },
    'CeeDee Lamb': { position: 'WR', tier: 'STRETCH', targetRole: 'WR1/WR2' },

    'Drake London': { position: 'WR', tier: 'IDEAL', targetRole: 'WR2' },
    'Nico Collins': { position: 'WR', tier: 'IDEAL', targetRole: 'WR2' },
    'Garrett Wilson': { position: 'WR', tier: 'IDEAL', targetRole: 'WR2' },
    'Rashee Rice': { position: 'WR', tier: 'IDEAL', targetRole: 'WR2' },
    'A.J. Brown': { position: 'WR', tier: 'IDEAL', targetRole: 'WR2' },

    'DeVonta Smith': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Tetairoa McMillan': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Emeka Egbuka': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Zay Flowers': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Davante Adams': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Ladd McConkey': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },
    'Jaylen Waddle': { position: 'WR', tier: 'FALLBACK', targetRole: 'WR2/FLEX' },

    'Josh Allen': { position: 'QB', tier: 'STRETCH', targetRole: 'QB1' },
    'Lamar Jackson': { position: 'QB', tier: 'IDEAL', targetRole: 'QB1' },
  },
};

const TIER_ORDER = ['STRETCH', 'IDEAL', 'FALLBACK', 'VALUE_ONLY', 'AVOID'];

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

const PLAYER_LOOKUP = new Map(
  Object.entries(AUCTION_CHEAT_SHEET.players).map(([name, entry]) => [normalizeName(name), { name, ...entry }]),
);

export function getCheatSheetPlayer(playerName) {
  return PLAYER_LOOKUP.get(normalizeName(playerName)) ?? null;
}

function tierRank(tier) {
  const index = TIER_ORDER.indexOf(tier);
  return index >= 0 ? index : TIER_ORDER.length;
}

function buildBoardState({ position, sales = [] } = {}) {
  const soldNames = new Set((sales ?? []).map((sale) => normalizeName(sale?.playerName)).filter(Boolean));
  const positionPlayers = Object.entries(AUCTION_CHEAT_SHEET.players)
    .filter(([, entry]) => entry.position === position)
    .map(([name, entry]) => ({ name, ...entry, sold: soldNames.has(normalizeName(name)) }));

  const byTier = {};
  for (const tier of TIER_ORDER) {
    const tierPlayers = positionPlayers.filter((player) => player.tier === tier);
    byTier[tier] = {
      total: tierPlayers.length,
      sold: tierPlayers.filter((player) => player.sold).length,
      remaining: tierPlayers.filter((player) => !player.sold).length,
      remainingNames: tierPlayers.filter((player) => !player.sold).map((player) => player.name),
    };
  }

  return {
    position,
    byTier,
    totalRated: positionPlayers.length,
    totalRemaining: positionPlayers.filter((player) => !player.sold).length,
  };
}

export function buildCheatSheetState({ roster = [], remainingBudget = 0, sales = [] } = {}) {
  const mappedRoster = roster.map((player) => ({
    player,
    cheat: getCheatSheetPlayer(player?.playerName),
  }));
  const rbRoster = roster.filter((player) => player?.position === 'RB');
  const eliteRb = mappedRoster.find(({ cheat }) => cheat?.position === 'RB' && cheat?.eliteRb);
  const wrCount = roster.filter((player) => player?.position === 'WR').length;
  const qbCount = roster.filter((player) => player?.position === 'QB').length;
  const teCount = roster.filter((player) => player?.position === 'TE').length;

  return {
    eliteRbSecured: Boolean(eliteRb),
    eliteRbName: eliteRb?.player?.playerName ?? null,
    rbCount: rbRoster.length,
    wrCount,
    qbCount,
    teCount,
    remainingBudget,
    budgetMode: remainingBudget >= 140 ? 'AGGRESSIVE' : remainingBudget >= 90 ? 'BALANCED' : 'PROTECT',
    board: {
      RB: buildBoardState({ position: 'RB', sales }),
      WR: buildBoardState({ position: 'WR', sales }),
      QB: buildBoardState({ position: 'QB', sales }),
    },
  };
}

function scarcitySignal({ player, position, state }) {
  if (!player || !state?.board?.[position]) return { multiplier: 1, urgency: 'NONE', reason: null };

  const board = state.board[position];
  const rank = tierRank(player.tier);
  const betterOrEqualRemaining = TIER_ORDER
    .slice(0, rank + 1)
    .reduce((sum, tier) => sum + (board.byTier[tier]?.remaining ?? 0), 0);

  const starterOpen = position === 'RB'
    ? !state.eliteRbSecured
    : position === 'WR'
      ? state.wrCount < 2
      : position === 'QB'
        ? state.qbCount < 1
        : false;

  if (!starterOpen) return { multiplier: 1, urgency: 'LOW', reason: 'primary starter goal at this position is already filled' };

  if (betterOrEqualRemaining <= 1) {
    return { multiplier: 1.08, urgency: 'HIGH', reason: `last ${player.tier}-or-better target at ${position}` };
  }
  if (betterOrEqualRemaining <= 3) {
    return { multiplier: 1.04, urgency: 'MEDIUM', reason: `only ${betterOrEqualRemaining} ${player.tier}-or-better ${position} targets remain` };
  }
  if (betterOrEqualRemaining >= 7) {
    return { multiplier: 0.98, urgency: 'LOW', reason: `${betterOrEqualRemaining} ${player.tier}-or-better ${position} targets still remain` };
  }
  return { multiplier: 1, urgency: 'NORMAL', reason: `${betterOrEqualRemaining} ${player.tier}-or-better ${position} targets remain` };
}

function rosterFitSignal({ position, state }) {
  if (position === 'RB') {
    if (!state.eliteRbSecured) return { multiplier: 1.04, reason: 'elite RB1 remains the primary open goal' };
    if (state.rbCount === 1) return { multiplier: 0.84, reason: `elite RB1 already secured (${state.eliteRbName}); another RB is FLEX/depth` };
    return { multiplier: 0.7, reason: 'multiple RBs are already rostered; additional RB is bench depth' };
  }
  if (position === 'WR') {
    if (state.wrCount < 2) return { multiplier: 1.03, reason: 'WR2 starter slot is still open' };
    return { multiplier: 0.82, reason: 'both starting WR slots are filled' };
  }
  if (position === 'QB') {
    if (state.qbCount < 1) return { multiplier: 1.02, reason: 'QB1 starter slot is still open' };
    return { multiplier: 0.7, reason: 'QB1 is already secured' };
  }
  if (position === 'TE' && state.teCount >= 1) {
    return { multiplier: 0.35, reason: 'Bowers already fills TE1; TE2 is only a low-cost safety net' };
  }
  return { multiplier: 1, reason: null };
}

function keeperSignal({ player, marketValue, experienceYears, config }) {
  const flier = config?.auctionStrategy?.keeperFlier ?? {};
  const marketCap = Number(flier.maximumMarketValue ?? 25);
  const manualHighUpside = player?.keeperUpside === 'HIGH';
  const rookie = Number(experienceYears) === 0;
  const cheapEnough = Number.isFinite(Number(marketValue)) && Number(marketValue) <= marketCap;
  const eligible = cheapEnough && (manualHighUpside || rookie);

  return {
    eligible,
    rookie,
    manualHighUpside,
    maximumBid: eligible ? Number(flier.maximumBid ?? 8) : null,
    multiplier: eligible ? 1 + Number(flier.rookiePreferenceBonus ?? 0.08) : 1,
    reason: eligible
      ? `${rookie ? 'rookie' : 'young upside'} keeper flier at a cheap market value`
      : null,
  };
}

export function buildCheatSheetContext({
  playerName,
  position,
  roster = [],
  remainingBudget = 0,
  sales = [],
  marketValue = null,
  experienceYears = null,
  config = null,
} = {}) {
  const player = getCheatSheetPlayer(playerName);
  const state = buildCheatSheetState({ roster, remainingBudget, sales });
  const rosterFit = rosterFitSignal({ position, state });
  const scarcity = scarcitySignal({ player, position, state });
  const keeper = keeperSignal({ player, marketValue, experienceYears, config });

  let preferenceMultiplier = Number(AUCTION_CHEAT_SHEET.tierMultipliers[player?.tier] ?? 1);
  const reasons = [player ? `${player.tier} pre-draft preference` : 'unrated pre-draft player'];

  preferenceMultiplier *= rosterFit.multiplier;
  if (rosterFit.reason) reasons.push(rosterFit.reason);

  preferenceMultiplier *= scarcity.multiplier;
  if (scarcity.reason) reasons.push(scarcity.reason);

  preferenceMultiplier *= keeper.multiplier;
  if (keeper.reason) reasons.push(keeper.reason);

  if (state.budgetMode === 'PROTECT' && preferenceMultiplier > 1.02) {
    preferenceMultiplier = 1.02;
    reasons.push('protect mode limits preference premiums');
  }

  return {
    player,
    state,
    tier: player?.tier ?? 'UNRATED',
    targetRole: player?.targetRole ?? null,
    preferenceMultiplier: Number(Math.max(0.45, Math.min(1.15, preferenceMultiplier)).toFixed(3)),
    maximumCheatSheetBid: null,
    rosterFit,
    scarcity,
    keeper,
    reason: reasons.join('; '),
  };
}
