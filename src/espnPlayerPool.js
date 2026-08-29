const POSITION_BY_DEFAULT_ID = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'DST',
};

function projectedPoints(player) {
  const stats = player.stats || [];
  const projected = stats
    .filter((stat) => stat.statSourceId === 1 && Number.isFinite(stat.appliedTotal))
    .sort((a, b) => {
      const aSeason = a.statSplitTypeId === 0 ? 1 : 0;
      const bSeason = b.statSplitTypeId === 0 ? 1 : 0;
      return bSeason - aSeason;
    });

  return projected[0]?.appliedTotal ?? null;
}

function draftRank(player) {
  const ranks = player.draftRanksByRankType || {};
  const preferred = ranks.SUPERFLEX || ranks.PPR || ranks.STANDARD;
  return preferred?.rank ?? preferred?.auctionValue ?? null;
}

export function normalizeEspnPlayer(entry) {
  const player = entry.player || entry;
  const position = POSITION_BY_DEFAULT_ID[player.defaultPositionId] || null;

  return {
    id: entry.id ?? player.id,
    name: player.fullName,
    nflTeamId: player.proTeamId,
    position,
    projectedPoints: projectedPoints(player),
    espnRank: draftRank(player),
    percentOwned: player.ownership?.percentOwned ?? null,
    averageDraftPosition: player.ownership?.averageDraftPosition ?? null,
    auctionValueAverage: player.ownership?.auctionValueAverage ?? null,
    injuryStatus: player.injuryStatus ?? null,
    raw: entry,
  };
}

export async function fetchEspnPlayerPool({
  leagueId,
  season,
  limit = 1000,
  endpointHost = 'https://lm-api-reads.fantasy.espn.com',
} = {}) {
  if (!leagueId || !season) {
    throw new Error('leagueId and season are required');
  }

  const url = new URL(
    `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`,
    endpointHost,
  );
  url.searchParams.set('view', 'kona_player_info');
  url.searchParams.set('scoringPeriodId', '1');

  const fantasyFilter = {
    players: {
      filterSlotIds: { value: [0, 2, 4, 6, 16, 17, 23] },
      limit,
      sortPercOwned: {
        sortPriority: 1,
        sortAsc: false,
      },
      filterRanksForScoringPeriodIds: { value: [1] },
      filterRanksForRankTypes: { value: ['SUPERFLEX', 'PPR', 'STANDARD'] },
    },
  };

  const response = await fetch(url, {
    headers: {
      'X-Fantasy-Filter': JSON.stringify(fantasyFilter),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`ESPN player pool request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.players || []).map(normalizeEspnPlayer).filter((player) => player.position);
}
