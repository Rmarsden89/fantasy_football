export const AUCTION_CHEAT_SHEET = {
  version: '2026-09-01-v2',
  goals: {
    primary: 'Acquire an elite RB1 without sacrificing roster balance',
    secondary: ['Add a quality WR2', 'Add a starting QB at a sensible price'],
  },
  tierMultipliers: {
    STRETCH: 1.08,
    IDEAL: 1.03,
    FALLBACK: 0.98,
    VALUE_ONLY: 0.88,
    AVOID: 0.65,
  },
  maxRemainingBudgetShare: {
    RB: { STRETCH: 0.50, IDEAL: 0.45, FALLBACK: 0.36, VALUE_ONLY: 0.25, AVOID: 0.12 },
    WR: { STRETCH: 0.38, IDEAL: 0.31, FALLBACK: 0.24, VALUE_ONLY: 0.18, AVOID: 0.10 },
    QB: { STRETCH: 0.30, IDEAL: 0.22, FALLBACK: 0.16, VALUE_ONLY: 0.12, AVOID: 0.08 },
  },
  players: {
    // Elite-RB chase. These are preference tiers, not fixed dollar values.
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

    'Jeremiyah Love': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Kenneth Walker III': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Breece Hall': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Kyren Williams': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },
    'Javonte Williams': { position: 'RB', tier: 'FALLBACK', targetRole: 'RB1/FLEX' },

    'Travis Etienne Jr.': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX' },
    'Quinshon Judkins': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX' },
    'Bhayshul Tuten': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },
    'Cam Skattebo': { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },
    "D'Andre Swift": { position: 'RB', tier: 'VALUE_ONLY', targetRole: 'FLEX/BENCH' },

    // WR2 targets behind keeper Chris Olave. We do not need to force this tier
    // if the room is expensive; the market engine can wait for value.
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

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

const PLAYER_LOOKUP = new Map(
  Object.entries(AUCTION_CHEAT_SHEET.players).map(([name, entry]) => [normalizeName(name), { name, ...entry }]),
);

export function getCheatSheetPlayer(playerName) {
  return PLAYER_LOOKUP.get(normalizeName(playerName)) ?? null;
}

export function buildCheatSheetState({ roster = [], remainingBudget = 0 } = {}) {
  const mappedRoster = roster.map((player) => ({
    player,
    cheat: getCheatSheetPlayer(player?.playerName),
  }));
  const rbRoster = roster.filter((player) => player?.position === 'RB');
  const eliteRb = mappedRoster.find(({ cheat }) => cheat?.position === 'RB' && cheat?.eliteRb);
  const wrCount = roster.filter((player) => player?.position === 'WR').length;
  const qbCount = roster.filter((player) => player?.position === 'QB').length;

  return {
    eliteRbSecured: Boolean(eliteRb),
    eliteRbName: eliteRb?.player?.playerName ?? null,
    rbCount: rbRoster.length,
    wrCount,
    qbCount,
    remainingBudget,
    budgetMode: remainingBudget >= 140 ? 'AGGRESSIVE' : remainingBudget >= 90 ? 'BALANCED' : 'PROTECT',
  };
}

export function buildCheatSheetContext({ playerName, position, roster = [], remainingBudget = 0 } = {}) {
  const player = getCheatSheetPlayer(playerName);
  const state = buildCheatSheetState({ roster, remainingBudget });

  if (!player) {
    return {
      player: null,
      state,
      tier: 'UNRATED',
      targetRole: null,
      preferenceMultiplier: 1,
      maximumCheatSheetBid: null,
      reason: 'Player is not yet explicitly rated on the cheat sheet.',
    };
  }

  let preferenceMultiplier = Number(AUCTION_CHEAT_SHEET.tierMultipliers[player.tier] ?? 1);
  const reasons = [`${player.tier} cheat-sheet target`];

  if (position === 'RB') {
    if (!state.eliteRbSecured && player.eliteRb) {
      preferenceMultiplier += state.budgetMode === 'AGGRESSIVE' ? 0.04 : state.budgetMode === 'BALANCED' ? 0.02 : 0;
      reasons.push('elite RB1 is still an open primary goal');
    } else if (state.eliteRbSecured) {
      preferenceMultiplier *= 0.72;
      reasons.push(`elite RB1 already secured (${state.eliteRbName})`);
    } else if (state.rbCount >= 1) {
      preferenceMultiplier *= 0.88;
      reasons.push('RB starter is already filled, so this is mainly FLEX/depth');
    }
  }

  if (position === 'WR' && state.wrCount >= 2) {
    preferenceMultiplier *= 0.82;
    reasons.push('both starting WR slots are already filled');
  }

  if (position === 'QB' && state.qbCount >= 1) {
    preferenceMultiplier *= 0.7;
    reasons.push('QB1 is already secured');
  }

  if (state.budgetMode === 'PROTECT' && player.tier === 'STRETCH') {
    preferenceMultiplier = Math.min(preferenceMultiplier, 1);
    reasons.push('remaining budget is in protect mode, so stretch premium is disabled');
  }

  const share = Number(AUCTION_CHEAT_SHEET.maxRemainingBudgetShare?.[position]?.[player.tier]);
  const maximumCheatSheetBid = Number.isFinite(share)
    ? Math.max(1, Math.floor(remainingBudget * share))
    : null;

  if (Number.isFinite(maximumCheatSheetBid)) {
    reasons.push(`cheat-sheet budget guardrail is $${maximumCheatSheetBid}`);
  }

  return {
    player,
    state,
    tier: player.tier,
    targetRole: player.targetRole,
    preferenceMultiplier: Number(Math.max(0.5, Math.min(1.15, preferenceMultiplier)).toFixed(3)),
    maximumCheatSheetBid,
    reason: reasons.join('; '),
  };
}
