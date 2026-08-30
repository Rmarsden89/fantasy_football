export const LEAGUE_CONFIG = {
  season: 2026,
  leagueId: 299923,
  teams: 8,
  myDraftSlot: 8,
  myTeamName: 'Luck Deez Nuts',
  draftType: 'SNAKE',
  roster: {
    QB: 2,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    DST: 1,
    K: 1,
    BENCH: 8,
  },
  positionLimits: {
    QB: 5,
    RB: 8,
    WR: 8,
    TE: 4,
    DST: 3,
    K: 3,
  },
  scoring: {
    passingTD: 4,
    interception: -2,
    rushingTD: 6,
    receivingTD: 6,
    receptionPointsPerCatch: 0.2,
    fumbleLost: -2,
    bonuses: {
      passing300To399: 3,
      passing400Plus: 6,
      rushing100To199: 3,
      rushing200Plus: 6,
      receiving100To199: 3,
      receiving200Plus: 6,
      longRushingTD40Plus: 3,
      longReceivingTD40Plus: 3,
    },
  },
  strategy: {
    replacementRanks: {
      QB: 20,
      RB: 28,
      WR: 32,
      TE: 12,
      DST: 8,
      K: 8,
    },
    maxRecommendedByPosition: {
      QB: 3,
      RB: 6,
      WR: 7,
      TE: 2,
      DST: 1,
      K: 1,
    },
    saturation: {
      QB: { softTarget: 3, multiplierAfterTarget: 0.18 },
      RB: { softTarget: 5, multiplierAfterTarget: 0.30 },
      WR: { softTarget: 5, multiplierAfterTarget: 0.75 },
      TE: { softTarget: 2, multiplierAfterTarget: 0 },
      DST: { softTarget: 1, multiplierAfterTarget: 0 },
      K: { softTarget: 1, multiplierAfterTarget: 0 },
    },
    // Upside should depend on the role we are filling, not just the round.
    // RB3/RB4, WR4+, and QB3 are the intentional ceiling-chasing spots.
    depthUpside: {
      QB: [
        { minHave: 0, maxHave: 1, multiplier: 0.15 },
        { minHave: 2, maxHave: 2, multiplier: 1.30 },
        { minHave: 3, maxHave: 99, multiplier: 0.10 },
      ],
      RB: [
        { minHave: 0, maxHave: 1, multiplier: 0.20 },
        { minHave: 2, maxHave: 3, multiplier: 1.35 },
        { minHave: 4, maxHave: 4, multiplier: 0.80 },
        { minHave: 5, maxHave: 99, multiplier: 0.40 },
      ],
      WR: [
        { minHave: 0, maxHave: 2, multiplier: 0.25 },
        { minHave: 3, maxHave: 4, multiplier: 1.30 },
        { minHave: 5, maxHave: 99, multiplier: 1.10 },
      ],
      TE: [
        { minHave: 0, maxHave: 0, multiplier: 0.20 },
        { minHave: 1, maxHave: 1, multiplier: 0.70 },
        { minHave: 2, maxHave: 99, multiplier: 0 },
      ],
    },
    // The AI layer is deliberately constrained: it may only reorder the
    // deterministic top candidates and can never introduce an ineligible player.
    // The local reranker service keeps the OpenAI API key out of the browser bundle.
    aiReranker: {
      enabled: true,
      candidateLimit: 8,
      timeoutMs: 2500,
      endpoint: 'http://127.0.0.1:8787/rerank',
    },
    tightEndStrategy: {
      elitePositionRank: 5,
      eliteStarterPriorityCap: 8,
      normalStarterPriorityCap: 20,
      backupEarliestRound: 10,
      unfilledFlexNeed: 25,
      unfilledDepthNeed: 70,
      missingStarterUrgency: [
        { throughRound: 3, multiplier: 0.70 },
        { throughRound: 7, multiplier: 0.82 },
        { throughRound: 10, multiplier: 0.96 },
        { throughRound: 18, multiplier: 1.08 },
      ],
      playerQualityGate: {
        minimum: 52,
        fullCredit: 78,
        minimumMultiplier: 0.35,
      },
    },
    specialTeamsEarliestRound: {
      DST: 16,
      K: 17,
    },
    positionWeights: {
      starterNeed: 0.50,
      flexNeed: 0.10,
      depthNeed: 0.08,
      depletion: 0.12,
      opponentDemand: 0.10,
      turnPressure: 0.10,
    },
    // Independent ranking sources form the stable player-quality anchor.
    // Missing sources are automatically renormalized by consensusModel, so
    // partial snapshot coverage does not penalize a player.
    consensus: {
      sourceWeights: {
        fantasyPros: 0.35,
        pfn: 0.25,
        espnDraftRank: 0.15,
        marketAdp: 0.15,
        espnRank: 0.10,
      },
      rankCeiling: 240,
    },
    // VOR is a league-specific adjustment, not the primary player ranking.
    phaseWeights: {
      early: {
        throughRound: 6,
        positionPriority: 0.54,
        vor: 0.10,
        withinPositionValue: 0.08,
        consensusValue: 0.24,
        upside: 0.00,
        tierDrop: 0.04,
      },
      middle: {
        throughRound: 11,
        positionPriority: 0.47,
        vor: 0.08,
        withinPositionValue: 0.07,
        consensusValue: 0.20,
        upside: 0.14,
        tierDrop: 0.04,
      },
      late: {
        positionPriority: 0.38,
        vor: 0.06,
        withinPositionValue: 0.06,
        consensusValue: 0.18,
        upside: 0.29,
        tierDrop: 0.03,
      },
    },
    decisionContext: {
      waitRiskScoreWindow: 0.75,
      upsideTiebreakStartsRound: 7,
    },
    byeTiebreaker: {
      scoreWindow: 0.75,
      conflictPenalty: 25,
      maxConflictsCounted: 3,
    },
  },
};

export function getSnakeOverallPick(round, draftSlot = LEAGUE_CONFIG.myDraftSlot, teams = LEAGUE_CONFIG.teams) {
  const oddRound = round % 2 === 1;
  const roundPick = oddRound ? draftSlot : teams - draftSlot + 1;
  return (round - 1) * teams + roundPick;
}

export function getMySnakePicks(rounds = 18, config = LEAGUE_CONFIG) {
  return Array.from({ length: rounds }, (_, index) => {
    const round = index + 1;
    return getSnakeOverallPick(round, config.myDraftSlot, config.teams);
  });
}
