export const IDP_TARGETS = {
  version: '2026-09-02-v1-custom-scoring',
  scoringProfile: {
    soloTackle: 1.5,
    assistedTackle: 0.5,
    sack: 5,
    interception: 6,
    forcedFumble: 3,
    fumbleRecovery: 2,
    passDefended: 1.5,
    stuff: 1.5,
  },
  // One DP starter means we want impact and floor, but we should not spend
  // meaningful offensive budget chasing IDP. Edge rushers gain value from the
  // 5-point sack, while every-down linebackers retain a strong tackle floor.
  players: {
    'Myles Garrett': { tier: 'A', archetype: 'EDGE', priority: 100 },
    'Aidan Hutchinson': { tier: 'A', archetype: 'EDGE', priority: 98 },
    'Maxx Crosby': { tier: 'A', archetype: 'EDGE', priority: 96 },
    'Will Anderson Jr.': { tier: 'A', archetype: 'EDGE', priority: 94 },
    'Jordyn Brooks': { tier: 'A', archetype: 'LB', priority: 93 },
    'Jack Campbell': { tier: 'A', archetype: 'LB', priority: 92 },
    'Roquan Smith': { tier: 'A', archetype: 'LB', priority: 91 },
    'Carson Schwesinger': { tier: 'A', archetype: 'LB', priority: 90 },

    'Brian Burns': { tier: 'B', archetype: 'EDGE', priority: 88 },
    'T.J. Watt': { tier: 'B', archetype: 'EDGE/LB', priority: 87 },
    'Fred Warner': { tier: 'B', archetype: 'LB', priority: 86 },
    'Foyesade Oluokun': { tier: 'B', archetype: 'LB', priority: 85 },
    'Zack Baun': { tier: 'B', archetype: 'LB', priority: 84 },
    'Nick Bosa': { tier: 'B', archetype: 'EDGE', priority: 83 },
    'Jamien Sherwood': { tier: 'B', archetype: 'LB', priority: 82 },
    'Blake Cashman': { tier: 'B', archetype: 'LB', priority: 81 },

    'Kyle Hamilton': { tier: 'C', archetype: 'S', priority: 78 },
    'Nick Bolton': { tier: 'C', archetype: 'LB', priority: 77 },
    'Edgerrin Cooper': { tier: 'C', archetype: 'LB', priority: 76 },
    'Alex Singleton': { tier: 'C', archetype: 'LB', priority: 75 },
    'Derwin James Jr.': { tier: 'C', archetype: 'S', priority: 73 },
    'Budda Baker': { tier: 'C', archetype: 'S', priority: 72 },
  },
};

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

const IDP_LOOKUP = new Map(
  Object.entries(IDP_TARGETS.players).map(([name, value]) => [normalizeName(name), { name, ...value }]),
);

export function getIdpTarget(playerName) {
  return IDP_LOOKUP.get(normalizeName(playerName)) ?? null;
}

export function isIndividualDefensivePosition(position) {
  return ['DT', 'DE', 'LB', 'CB', 'S', 'DB', 'DL', 'DP'].includes(String(position ?? '').toUpperCase());
}
