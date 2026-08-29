function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function rankScore(rank, ceiling = 240) {
  if (!Number.isFinite(rank) || rank <= 0) return null;
  return clamp(100 - ((Math.min(rank, ceiling) - 1) / Math.max(ceiling - 1, 1)) * 100);
}

function lookupExternalRank(player, source) {
  if (!source) return null;
  if (source.byId && player.id in source.byId) return Number(source.byId[player.id]);
  const key = normalizeName(player.name);
  if (source.byName && key in source.byName) return Number(source.byName[key]);
  return null;
}

export function applyConsensusModel(players, {
  sourceWeights = {},
  rankCeiling = 240,
  externalRankings = {},
} = {}) {
  return players.map((player) => {
    const sourceRanks = {
      espnRank: Number.isFinite(player.espnRank) ? player.espnRank : null,
      marketAdp: Number.isFinite(player.averageDraftPosition) ? player.averageDraftPosition : null,
    };

    for (const [sourceName, source] of Object.entries(externalRankings || {})) {
      sourceRanks[sourceName] = lookupExternalRank(player, source);
    }

    let weightedRankTotal = 0;
    let weightedScoreTotal = 0;
    let totalWeight = 0;
    let sourceCount = 0;

    for (const [sourceName, rank] of Object.entries(sourceRanks)) {
      if (!Number.isFinite(rank) || rank <= 0) continue;
      const weight = Number(sourceWeights[sourceName] ?? 0);
      if (weight <= 0) continue;
      weightedRankTotal += rank * weight;
      weightedScoreTotal += rankScore(rank, rankCeiling) * weight;
      totalWeight += weight;
      sourceCount += 1;
    }

    const consensusRank = totalWeight > 0 ? weightedRankTotal / totalWeight : null;
    const consensusValue = totalWeight > 0 ? weightedScoreTotal / totalWeight : 50;
    const marketGap = Number.isFinite(player.averageDraftPosition) && Number.isFinite(consensusRank)
      ? player.averageDraftPosition - consensusRank
      : 0;

    return {
      ...player,
      consensusRank: Number.isFinite(consensusRank) ? Number(consensusRank.toFixed(2)) : null,
      consensusValue: Number(consensusValue.toFixed(2)),
      consensusSourceCount: sourceCount,
      consensusSourceRanks: sourceRanks,
      marketGap: Number(marketGap.toFixed(2)),
    };
  });
}
