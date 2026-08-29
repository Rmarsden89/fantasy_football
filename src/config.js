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
    positionWeights: {
      starterNeed: 0.50,
      flexNeed: 0.10,
      depthNeed: 0.08,
      depletion: 0.12,
      opponentDemand: 0.10,
      turnPressure: 0.10,
    },
    playerWeights: {
      positionPriority: 0.58,
      vor: 0.17,
      withinPositionValue: 0.13,
      tierDrop: 0.05,
      turnRisk: 0.07,
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
