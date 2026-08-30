import test from 'node:test';
import assert from 'node:assert/strict';
import { applyConsensusModel } from '../src/consensusModel.js';
import { buildExternalRankingsFromSnapshot } from '../src/rankingSnapshot.js';

test('static ranking snapshot is converted into external ranking sources', () => {
  const snapshot = {
    players: {
      'player one': { name: 'Player One', fantasyProsRank: 4, pfnRank: 7, espnDraftRank: 9 },
    },
  };
  const result = buildExternalRankingsFromSnapshot(snapshot);
  assert.equal(result.externalRankings.fantasyPros.byName['player one'], 4);
  assert.equal(result.externalRankings.pfn.byName['player one'], 7);
  assert.equal(result.externalRankings.espnDraftRank.byName['player one'], 9);
});

test('consensus renormalizes weights when a source is missing', () => {
  const players = [{ id: 1, name: 'Player One', espnRank: 40, averageDraftPosition: 30 }];
  const scored = applyConsensusModel(players, {
    sourceWeights: {
      fantasyPros: 0.35,
      pfn: 0.25,
      espnDraftRank: 0.15,
      marketAdp: 0.15,
      espnRank: 0.10,
    },
    externalRankings: {
      fantasyPros: { byName: { 'player one': 10 } },
      pfn: { byName: { 'player one': 14 } },
    },
  });
  assert.equal(scored[0].consensusSourceCount, 4);
  assert.ok(scored[0].consensusRank < 25);
});
