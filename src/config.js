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
      QB: 4,
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
    tightEndStrategy: {
      elitePositionRank: 5,
      eliteStarterPriorityCap: 8,
      normalStarterPriorityCap: 20,
      backupEarliestRound: 10,
      // An empty TE slot matters, but it should not carry the same FLEX/depth
      // urgency as RB/WR. Elite individual TEs can still rise on player value.
      unfilledFlexNeed: 25,
      unfilledDepthNeed: 70,
    },
    specialTeamsEarliestRound: {
      DST: 14,
      K: 15,
    },
    positionWeights: {
      starterNeed: 0.50,
      flexNeed: 0.10,
      depthNeed: 0.08,
      depletion: 0.12,
      opponentDemand: 0.10,
      turnPressure: 0.10,
    },
    consensus: {
      sourceWeights: {
        espnRank: 0.35,
        marketAdp: 0.25,
        fantasyPros: 0.40,
      },
      rankCeiling: 240,
    },
    // Core player value is intentionally stable. Live availability affects
    // wait risk and depletion, but not a player's baseline VOR/tier quality.
    phaseWeights: {
      early: {
        throughRound: 6,
        positionPriority: 0.56,
        vor: 0.18,
        withinPositionValue: 0.10,
        consensusValue: 0.12,
        upside: 0.00,
        tierDrop: 0.04,
      },
      middle: {
        throughRound: 11,
        positionPriority: 0.50,
        vor: 0.15,
        withinPositionValue: 0.09,
        consensusValue: 0.12,
        upside: 0.10,
        tierDrop: 0.04,
      },
      late: {
        positionPriority: 0.42,
        vor: 0.11,
        withinPositionValue: 0.07,
        consensusValue: 0.12,
        upside: 0.25,
        tierDrop: 0.03,
      },
    },
    decisionContext: {
      // Reorder only true near-ties; a 2-3 point core value edge should win.
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
