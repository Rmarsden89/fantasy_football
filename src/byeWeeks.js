// ESPN proTeamId -> 2026 NFL bye week.
// Source: NFL 2026 schedule release. This is intentionally isolated so it can
// be refreshed without touching the recommendation engine.
export const BYE_WEEK_BY_PRO_TEAM_ID_2026 = {
  1: 11,  // ATL
  2: 7,   // BUF
  3: 10,  // CHI
  4: 6,   // CIN
  5: 11,  // CLE
  6: 14,  // DAL
  7: 10,  // DEN
  8: 6,   // DET
  9: 11,  // GB
  10: 9,  // TEN
  11: 13, // IND
  12: 5,  // KC
  13: 13, // LV
  14: 11, // LAR
  15: 6,  // MIA
  16: 6,  // MIN
  17: 11, // NE
  18: 8,  // NO
  19: 8,  // NYG
  20: 13, // NYJ
  21: 10, // PHI
  22: 14, // ARI
  23: 9,  // PIT
  24: 7,  // LAC
  25: 8,  // SF
  26: 11, // SEA
  27: 10, // TB
  28: 7,  // WAS
  29: 5,  // CAR
  30: 7,  // JAX
  33: 13, // BAL
  34: 8,  // HOU
};

export function byeWeekForProTeamId(proTeamId, season = 2026) {
  if (season !== 2026) return null;
  return BYE_WEEK_BY_PRO_TEAM_ID_2026[Number(proTeamId)] ?? null;
}
