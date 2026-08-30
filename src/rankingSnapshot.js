import snapshot from './data/rankings/2026-draft-final.json' with { type: 'json' };

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[.,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addRank(byName, player, field) {
  const rank = Number(player?.[field]);
  if (!Number.isFinite(rank) || rank <= 0) return;
  byName[normalizeName(player.name)] = rank;
}

export function buildExternalRankingsFromSnapshot(rankingSnapshot = snapshot) {
  const fantasyPros = { byName: {} };
  const pfn = { byName: {} };
  const espnDraftRank = { byName: {} };

  for (const player of Object.values(rankingSnapshot?.players || {})) {
    addRank(fantasyPros.byName, player, 'fantasyProsRank');
    addRank(pfn.byName, player, 'pfnRank');
    addRank(espnDraftRank.byName, player, 'espnDraftRank');
  }

  const externalRankings = {};
  if (Object.keys(fantasyPros.byName).length) externalRankings.fantasyPros = fantasyPros;
  if (Object.keys(pfn.byName).length) externalRankings.pfn = pfn;
  if (Object.keys(espnDraftRank.byName).length) externalRankings.espnDraftRank = espnDraftRank;

  return {
    rankingSnapshot,
    externalRankings,
    sourceSummary: {
      fantasyPros: Object.keys(fantasyPros.byName).length,
      pfn: Object.keys(pfn.byName).length,
      espnDraftRank: Object.keys(espnDraftRank.byName).length,
    },
  };
}

export { snapshot as DEFAULT_RANKING_SNAPSHOT };
