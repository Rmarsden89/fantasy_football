export const AUCTION_LEAGUE_CONFIG = {
  season: 2026,
  leagueId: 1727104,
  myTeamId: 16,
  myTeamName: 'Uncle RICO',
  teams: 16,
  draftType: 'SALARY_CAP',
  salaryCap: 250,
  keeperCount: 2,
  minimumBid: 1,
  myKeepers: [
    { playerName: 'Bijan Robinson', position: 'RB', price: 80 },
    { playerName: 'Brock Bowers', position: 'TE', price: 18 },
  ],
  roster: {
    QB: 1,
    RB: 1,
    WR: 2,
    TE: 1,
    FLEX: 1,
    DP: 1,
    DST: 1,
    K: 1,
    BENCH: 6,
    IR: 2,
  },
  positionLimits: {
    QB: 2,
    RB: 3,
    WR: 5,
    TE: 2,
    DST: 2,
    K: 2,
  },
  auctionStrategy: {
    // These are deterministic budget-reservation targets, not player values.
    // The helper protects money for still-empty starting roles before allowing
    // us to spend aggressively on FLEX or bench depth.
    starterReserve: {
      QB: [32],
      RB: [28],
      WR: [28, 18],
      TE: [18],
      DP: [2],
      DST: [1],
      K: [1],
    },
    flexReserve: 18,
    flexPositions: ['RB', 'WR', 'TE'],
    roleValueMultiplier: {
      STARTER: 1,
      FLEX: 0.85,
      BENCH: 0.35,
    },
    market: {
      // When live room demand suggests the player should clear below intrinsic
      // value, allow a small buffer above the modeled clearing point without
      // bidding all the way back to full value.
      clearingBufferPct: 0.05,
      minimumClearingBuffer: 2,
      maximumClearingBuffer: 5,
    },
  },
  scoring: {
    passing: {
      yards: 0.04,
      completion: 0.1,
      touchdown: 6,
      interception: -2,
      twoPointConversion: 2,
    },
    rushing: {
      yards: 0.1,
      attempt: 0.1,
      touchdown: 6,
      twoPointConversion: 2,
    },
    receiving: {
      yards: 0.1,
      reception: 1,
      touchdown: 6,
      twoPointConversion: 2,
    },
    kicking: {
      extraPointMade: 1,
      extraPointMissed: -1,
      fieldGoal0To39: 3,
      fieldGoal40To49: 3,
      fieldGoalMiss0To39: -3,
      fieldGoalMiss40To49: -1,
      fieldGoal50To59: 5,
      fieldGoal60Plus: 7,
      fieldGoalYards50Plus: 5,
    },
    defense: {
      kickReturnYards: 0.05,
      puntReturnYards: 0.05,
      returnTouchdown: 6,
      sack: 1,
      blockedKick: 2,
      interception: 2,
      fumbleRecovery: 2,
      safety: 2,
    },
    individualDefense: {
      sack: 5,
      blockedKick: 4,
      interception: 6,
      fumbleRecovery: 2,
      forcedFumble: 3,
      safety: 4,
      assistedTackle: 0.5,
      soloTackle: 1.5,
      stuff: 1.5,
      passDefended: 1.5,
    },
  },
};

export function getActiveRosterSize(config = AUCTION_LEAGUE_CONFIG) {
  return Object.entries(config.roster)
    .filter(([slot]) => slot !== 'IR')
    .reduce((total, [, count]) => total + count, 0);
}
