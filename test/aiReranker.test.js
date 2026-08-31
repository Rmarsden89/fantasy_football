import test from 'node:test';
import assert from 'node:assert/strict';
import { LEAGUE_CONFIG } from '../src/config.js';
import { applyAiRerank, buildAiRerankPayload, deriveTurnPairFromAiRanking, rerankWithAi } from '../src/aiReranker.js';

function scoredBoard() {
  const players = [
    { id: 1, name: 'QB Starter', position: 'QB', draftScore: 60, consensusRank: 50, consensusValue: 80, projectedPoints: 400, averageDraftPosition: 60, marketGap: 10, positionPriority: 70, byeWeek: 7, components: { upside: 10, upsideBase: 60, upsideMultiplier: 0.15, vor: 80, withinPositionValue: 90, tierDrop: 2, waitRisk: 20 } },
    { id: 2, name: 'RB Upside', position: 'RB', draftScore: 59, consensusRank: 65, consensusValue: 74, projectedPoints: 230, averageDraftPosition: 70, marketGap: 5, positionPriority: 55, byeWeek: 8, components: { upside: 85, upsideBase: 63, upsideMultiplier: 1.35, vor: 55, withinPositionValue: 75, tierDrop: 3, waitRisk: 15 } },
    { id: 3, name: 'WR Upside', position: 'WR', draftScore: 58, consensusRank: 72, consensusValue: 70, projectedPoints: 205, averageDraftPosition: 75, marketGap: 3, positionPriority: 50, byeWeek: 9, components: { upside: 80, upsideBase: 61, upsideMultiplier: 1.3, vor: 48, withinPositionValue: 70, tierDrop: 2, waitRisk: 10 } },
  ];
  players.currentRound = 7;
  players.nextPick = 56;
  players.followingPick = 57;
  players.picksUntilFollowing = 0;
  players.positionPriorities = {};
  players.phaseWeights = LEAGUE_CONFIG.strategy.phaseWeights.middle;
  return players;
}

function turnPairs(board) {
  return [
    { first: board[0], second: board[1], secondScoreAfterFirst: 62, pairScore: 122, simulatedAfterFirst: true },
    { first: board[1], second: board[2], secondScoreAfterFirst: 61, pairScore: 120, simulatedAfterFirst: true },
    { first: board[1], second: board[0], secondScoreAfterFirst: 58, pairScore: 117, simulatedAfterFirst: true },
  ];
}

const draftedPicks = [
  { playerId: 10, playerName: 'My QB1', position: 'QB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 8 },
  { playerId: 11, playerName: 'My RB1', position: 'RB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 9 },
  { playerId: 12, playerName: 'My RB2', position: 'RB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 24 },
];

function onClockDraftedPicks() {
  return [...draftedPicks, { playerId: 99, playerName: 'Opponent Pick 55', position: 'WR', fantasyTeam: 'Opponent', overallPick: 55 }];
}

function secondPickOfTurnDraftedPicks() {
  return [...onClockDraftedPicks(), { playerId: 100, playerName: 'My Pick 56', position: 'RB', fantasyTeam: LEAGUE_CONFIG.myTeamName, overallPick: 56 }];
}

test('AI payload contains only the deterministic candidate window and roster state', () => {
  const board = scoredBoard();
  const payload = buildAiRerankPayload({ scoredPlayers: board, draftedPicks, myTeamName: LEAGUE_CONFIG.myTeamName, config: LEAGUE_CONFIG, candidateLimit: 2 });
  assert.equal(payload.candidates.length, 2);
  assert.deepEqual(payload.candidates.map((candidate) => candidate.playerId), [1, 2]);
  assert.equal(payload.draftContext.rosterCounts.QB, 1);
  assert.equal(payload.draftContext.rosterCounts.RB, 2);
  assert.ok(payload.rules.some((rule) => rule.includes('QB1/QB2')));
  assert.equal('turnPairs' in payload, false);
  assert.match(payload.task, /application will build the two-pick/i);
});

test('AI response can reorder candidates but cannot introduce outside players', () => {
  const board = scoredBoard();
  const result = applyAiRerank(board, { rankings: [{ playerId: 999, reason: 'not allowed' }, { playerId: 2, reason: 'RB3 upside' }, { playerId: 1, reason: 'QB2 stability' }] }, 2);
  assert.deepEqual(result.scoredPlayers.map((player) => player.id), [2, 1, 3]);
  assert.equal(result.decisions.some((decision) => decision.playerId === 999), false);
  assert.equal(result.scoredPlayers.currentRound, 7);
});

test('turn pair is derived after AI chooses the first player', () => {
  const board = scoredBoard();
  const reranked = applyAiRerank(board, { rankings: [{ playerId: 2 }, { playerId: 1 }, { playerId: 3 }] }, 3);
  const pair = deriveTurnPairFromAiRanking(reranked.scoredPlayers, turnPairs(board));
  assert.equal(pair.first.name, 'RB Upside');
  assert.equal(pair.second.name, 'WR Upside');
  assert.equal(pair.pairScore, 120);
});

test('AI reranker skips provider calls when it is not our pick', async () => {
  const board = scoredBoard();
  let providerCalled = false;
  const result = await rerankWithAi({ scoredPlayers: board, draftedPicks, myTeamName: LEAGUE_CONFIG.myTeamName, config: LEAGUE_CONFIG, provider: async () => { providerCalled = true; return { rankings: [] }; } });
  assert.equal(result.status, 'skipped_not_on_clock');
  assert.equal(providerCalled, false);
  assert.equal(result.payload, null);
  assert.deepEqual(result.scoredPlayers.map((player) => player.id), [1, 2, 3]);
});

test('AI reranker skips the second consecutive pick of our snake turn', async () => {
  const board = scoredBoard();
  board.nextPick = 57;
  board.followingPick = 72;
  board.picksUntilFollowing = 14;
  let providerCalled = false;
  const result = await rerankWithAi({ scoredPlayers: board, draftedPicks: secondPickOfTurnDraftedPicks(), myTeamName: LEAGUE_CONFIG.myTeamName, config: LEAGUE_CONFIG, provider: async () => { providerCalled = true; return { rankings: [] }; } });
  assert.equal(result.status, 'skipped_pair_followup');
  assert.equal(providerCalled, false);
  assert.equal(result.payload, null);
  assert.deepEqual(result.scoredPlayers.map((player) => player.id), [1, 2, 3]);
});

test('AI reranker falls back to deterministic order when provider errors', async () => {
  const board = scoredBoard();
  const result = await rerankWithAi({ scoredPlayers: board, pairs: turnPairs(board), draftedPicks: onClockDraftedPicks(), myTeamName: LEAGUE_CONFIG.myTeamName, config: LEAGUE_CONFIG, provider: async () => { throw new Error('offline'); } });
  assert.equal(result.status, 'error');
  assert.equal(result.error, 'offline');
  assert.deepEqual(result.scoredPlayers.map((player) => player.id), [1, 2, 3]);
});

test('AI reranker ranks players first and then produces one sequential turn pair', async () => {
  const board = scoredBoard();
  const result = await rerankWithAi({
    scoredPlayers: board,
    pairs: turnPairs(board),
    draftedPicks: onClockDraftedPicks(),
    myTeamName: LEAGUE_CONFIG.myTeamName,
    config: LEAGUE_CONFIG,
    provider: async (payload) => {
      assert.equal('turnPairs' in payload, false);
      return {
        rankings: [
          { playerId: 2, reason: 'RB3 ceiling', confidence: 0.82 },
          { playerId: 1, reason: 'QB2 floor', confidence: 0.75 },
          { playerId: 3, reason: 'WR depth', confidence: 0.68 },
        ],
        summary: 'Prefer RB upside at the top of the board.',
      };
    },
  });
  assert.equal(result.status, 'applied');
  assert.deepEqual(result.scoredPlayers.map((player) => player.id), [2, 1, 3]);
  assert.equal(result.decisions[0].reason, 'RB3 ceiling');
  assert.equal(result.recommendedPair.first.name, 'RB Upside');
  assert.equal(result.recommendedPair.second.name, 'WR Upside');
  assert.match(result.summary, /Recommended turn: RB Upside \+ WR Upside/);
});
