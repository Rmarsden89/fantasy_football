var FantasyDraftHelper = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    startDraftHelper: () => startDraftHelper
  });

  // src/config.js
  var LEAGUE_CONFIG = {
    season: 2026,
    leagueId: 299923,
    teams: 8,
    myDraftSlot: 8,
    myTeamName: "Luck Deez Nuts",
    draftType: "SNAKE",
    roster: {
      QB: 2,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 1,
      DST: 1,
      K: 1,
      BENCH: 8
    },
    positionLimits: {
      QB: 5,
      RB: 8,
      WR: 8,
      TE: 4,
      DST: 3,
      K: 3
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
        longReceivingTD40Plus: 3
      }
    },
    strategy: {
      replacementRanks: {
        QB: 20,
        RB: 28,
        WR: 32,
        TE: 12,
        DST: 8,
        K: 8
      },
      weights: {
        baseValue: 0.35,
        vor: 0.2,
        scarcity: 0.15,
        rosterNeed: 0.1,
        tierDrop: 0.1,
        turnRisk: 0.1
      }
    }
  };
  function getSnakeOverallPick(round, draftSlot = LEAGUE_CONFIG.myDraftSlot, teams = LEAGUE_CONFIG.teams) {
    const oddRound = round % 2 === 1;
    const roundPick = oddRound ? draftSlot : teams - draftSlot + 1;
    return (round - 1) * teams + roundPick;
  }
  function getMySnakePicks(rounds = 18, config = LEAGUE_CONFIG) {
    return Array.from({ length: rounds }, (_, index) => {
      const round = index + 1;
      return getSnakeOverallPick(round, config.myDraftSlot, config.teams);
    });
  }

  // src/espnDraftWatcher.js
  function createEspnDraftWatcher({ teams = 8, onPick = null } = {}) {
    const seen = /* @__PURE__ */ new Set();
    const picks = [];
    let observer = null;
    function parsePick(el) {
      const rawText = (el.innerText || "").replace(/\s+/g, " ").trim();
      const pickMatch = rawText.match(/R(\d+)\s*,\s*P(\d+)\s*-\s*(.+)$/i);
      if (!pickMatch) return null;
      const round = Number(pickMatch[1]);
      const roundPick = Number(pickMatch[2]);
      const fantasyTeam = pickMatch[3].trim();
      const playerMatch = rawText.match(
        /^(.+?)\s*\/\s*([A-Z]{2,3})\s+(QB|RB|WR|TE|K|D\/ST|DST)\b/i
      );
      if (!playerMatch) return null;
      const playerName = playerMatch[1].trim();
      const nflTeam = playerMatch[2].toUpperCase();
      const position = playerMatch[3].toUpperCase().replace("D/ST", "DST");
      const img = el.querySelector('img[src*="/headshots/nfl/players/"]');
      let playerId = null;
      if (img?.src) {
        const idMatch = img.src.match(/\/players\/(?:full\/)?(\d+)\.(?:png|jpg|jpeg)/i);
        if (idMatch) playerId = Number(idMatch[1]);
      }
      return {
        overallPick: (round - 1) * teams + roundPick,
        round,
        roundPick,
        playerId,
        playerName,
        nflTeam,
        position,
        fantasyTeam,
        rawText
      };
    }
    function scan({ announce = false } = {}) {
      const candidates = [...document.querySelectorAll('[class*="pick-message"]')];
      for (const el of candidates) {
        const pick = parsePick(el);
        if (!pick) continue;
        const key = `${pick.round}:${pick.roundPick}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push(pick);
        picks.sort((a, b) => a.overallPick - b.overallPick);
        if (announce) {
          console.log(`\u{1F3C8} PICK ${pick.overallPick}: ${pick.playerName} (${pick.position})`);
          console.table([pick]);
          onPick?.(pick, [...picks]);
        }
      }
      return [...picks];
    }
    function start() {
      if (observer) observer.disconnect();
      const existing = scan({ announce: false });
      observer = new MutationObserver(() => {
        scan({ announce: true });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log(`ESPN draft watcher running. ${existing.length} completed picks loaded.`);
      return [...picks];
    }
    function stop() {
      observer?.disconnect();
      observer = null;
    }
    function getPicks() {
      return [...picks];
    }
    return { start, stop, scan, getPicks, parsePick };
  }

  // src/espnPlayerPool.js
  var POSITION_BY_DEFAULT_ID = {
    1: "QB",
    2: "RB",
    3: "WR",
    4: "TE",
    5: "K",
    16: "DST"
  };
  function projectedPoints(player) {
    const stats = player.stats || [];
    const projected = stats.filter((stat) => stat.statSourceId === 1 && Number.isFinite(stat.appliedTotal)).sort((a, b) => {
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
  function normalizeEspnPlayer(entry) {
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
      raw: entry
    };
  }
  async function fetchEspnPlayerPool({
    leagueId,
    season,
    limit = 1e3,
    endpointHost = 'https://lm-api-reads.fantasy.espn.com',
  } = {}) {
    if (!leagueId || !season) {
      throw new Error("leagueId and season are required");
    }
    const url = new URL(
      `/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}`,
      endpointHost
    );
    url.searchParams.set("view", "kona_player_info");
    url.searchParams.set("scoringPeriodId", "1");
    const fantasyFilter = {
      players: {
        filterSlotIds: { value: [0, 2, 4, 6, 16, 17, 23] },
        limit,
        sortDraftRanks: {
          sortPriority: 1,
          sortAsc: true,
          value: "SUPERFLEX"
        },
        filterRanksForScoringPeriodIds: { value: [1] },
        filterRanksForRankTypes: { value: ["SUPERFLEX", "PPR", "STANDARD"] }
      }
    };
    const response = await fetch(url, {
      headers: {
        "X-Fantasy-Filter": JSON.stringify(fantasyFilter)
      },
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`ESPN player pool request failed: ${response.status}`);
    }
    const data = await response.json();
    return (data.players || []).map(normalizeEspnPlayer).filter((player) => player.position);
  }

  // src/recommendationEngine.js
  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }
  function sortByPosition(players) {
    return players.reduce((groups, player) => {
      (groups[player.position] ||= []).push(player);
      return groups;
    }, {});
  }
  function rosterCounts(picks) {
    return picks.reduce((counts, pick) => {
      const position = pick.position === "D/ST" ? "DST" : pick.position;
      counts[position] = (counts[position] || 0) + 1;
      return counts;
    }, {});
  }
  function baseValue(player, maxProjection) {
    if (Number.isFinite(player.projectedPoints) && maxProjection > 0) {
      return clamp(player.projectedPoints / maxProjection * 100);
    }
    if (Number.isFinite(player.espnRank)) {
      return clamp(101 - player.espnRank);
    }
    return 0;
  }
  function valueOverReplacement(player, positionPlayers, replacementRank) {
    if (!Number.isFinite(player.projectedPoints)) return 50;
    const sorted = [...positionPlayers].filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    if (!sorted.length) return 50;
    const replacementIndex = Math.min(Math.max(replacementRank - 1, 0), sorted.length - 1);
    const replacement = sorted[replacementIndex]?.projectedPoints ?? 0;
    const best = sorted[0]?.projectedPoints ?? replacement;
    const range = Math.max(best - replacement, 1);
    return clamp((player.projectedPoints - replacement) / range * 100);
  }
  function scarcityScore(player, availableByPosition, config) {
    const startersNeeded = {
      QB: config.teams * config.roster.QB,
      RB: config.teams * config.roster.RB,
      WR: config.teams * config.roster.WR,
      TE: config.teams * config.roster.TE,
      DST: config.teams * config.roster.DST,
      K: config.teams * config.roster.K
    };
    const remaining = availableByPosition[player.position]?.length || 1;
    const demand = startersNeeded[player.position] || config.teams;
    return clamp(demand / remaining * 100);
  }
  function rosterNeedScore(player, myPicks, config) {
    const counts = rosterCounts(myPicks);
    const needs = {
      QB: config.roster.QB,
      RB: config.roster.RB,
      WR: config.roster.WR,
      TE: config.roster.TE,
      DST: config.roster.DST,
      K: config.roster.K
    };
    const required = needs[player.position] || 0;
    const have = counts[player.position] || 0;
    if (have < required) return 100;
    if (["RB", "WR", "TE"].includes(player.position)) {
      const flexFilled = Math.max(
        0,
        (counts.RB || 0) - config.roster.RB + (counts.WR || 0) - config.roster.WR + (counts.TE || 0) - config.roster.TE
      );
      if (flexFilled < config.roster.FLEX) return 75;
    }
    if (player.position === "QB" && have < 3) return 60;
    if (["RB", "WR"].includes(player.position)) return 50;
    if (player.position === "TE" && have < 2) return 40;
    return 15;
  }
  function tierDropScore(player, availableByPosition) {
    const group = [...availableByPosition[player.position] || []].filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const index = group.findIndex((p) => p.id === player.id);
    if (index < 0 || index === group.length - 1) return 50;
    const current = group[index].projectedPoints;
    const next = group[index + 1]?.projectedPoints ?? current;
    const leader = group[0]?.projectedPoints ?? current;
    const floor = group.at(-1)?.projectedPoints ?? next;
    const range = Math.max(leader - floor, 1);
    return clamp((current - next) / range * 500);
  }
  function estimateTurnRisk(player, picksUntilNextTurn, availableByPosition, opponentNeeds = {}) {
    if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 100;
    const group = availableByPosition[player.position] || [];
    const rankWithinPosition = group.findIndex((p) => p.id === player.id) + 1;
    const needPressure = opponentNeeds[player.position] ?? 0.5;
    const expectedPositionPicks = Math.max(1, picksUntilNextTurn * needPressure);
    if (rankWithinPosition <= expectedPositionPicks) return 95;
    const distance = rankWithinPosition - expectedPositionPicks;
    return clamp(95 - distance * 12, 5, 95);
  }
  function buildDraftState({ players, draftedPicks, myTeamName }) {
    const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
    const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName.toLowerCase()));
    const available = players.filter(
      (player) => !draftedIds.has(player.id) && !draftedNames.has(player.name?.toLowerCase())
    );
    const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
    return {
      available,
      myPicks,
      draftedPicks,
      lastOverallPick: draftedPicks.at(-1)?.overallPick || 0
    };
  }
  function getPicksUntilNextTurn(lastOverallPick, myOverallPicks) {
    const next = myOverallPicks.find((pick) => pick > lastOverallPick);
    if (!next) return { nextPick: null, picksUntil: null };
    return { nextPick: next, picksUntil: Math.max(next - lastOverallPick - 1, 0) };
  }
  function scoreAvailablePlayers({
    players,
    draftedPicks,
    myTeamName,
    config,
    myOverallPicks = [],
    opponentNeeds = {}
  }) {
    const state = buildDraftState({ players, draftedPicks, myTeamName });
    const availableByPosition = sortByPosition(
      [...state.available].sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0))
    );
    const maxProjection = Math.max(...state.available.map((p) => p.projectedPoints || 0), 1);
    const turn = getPicksUntilNextTurn(state.lastOverallPick, myOverallPicks);
    const weights = config.strategy.weights;
    return state.available.map((player) => {
      const components = {
        baseValue: baseValue(player, maxProjection),
        vor: valueOverReplacement(
          player,
          availableByPosition[player.position] || [],
          config.strategy.replacementRanks[player.position] || 8
        ),
        scarcity: scarcityScore(player, availableByPosition, config),
        rosterNeed: rosterNeedScore(player, state.myPicks, config),
        tierDrop: tierDropScore(player, availableByPosition),
        turnRisk: estimateTurnRisk(
          player,
          turn.picksUntil,
          availableByPosition,
          opponentNeeds
        )
      };
      const draftScore = Object.entries(weights).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0
      );
      return {
        ...player,
        draftScore: Number(draftScore.toFixed(2)),
        components,
        nextPick: turn.nextPick,
        picksUntilNextTurn: turn.picksUntil
      };
    }).sort((a, b) => b.draftScore - a.draftScore);
  }
  function recommendPairs(scoredPlayers, limit = 12) {
    const candidates = scoredPlayers.slice(0, limit);
    const pairs = [];
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const first = candidates[i];
        const second = candidates[j];
        let synergy = 0;
        if (first.position !== second.position) synergy += 4;
        if (first.position === "QB" || second.position === "QB") synergy += 3;
        if (["DST", "K"].includes(first.position) || ["DST", "K"].includes(second.position)) synergy -= 10;
        pairs.push({
          first,
          second,
          pairScore: Number((first.draftScore + second.draftScore + synergy).toFixed(2))
        });
      }
    }
    return pairs.sort((a, b) => b.pairScore - a.pairScore);
  }

  // src/index.js
  function printRecommendations(scored, pairs, count = 8) {
    console.group("Fantasy Draft Helper");
    console.table(
      scored.slice(0, count).map((player) => ({
        rank: scored.indexOf(player) + 1,
        player: player.name,
        position: player.position,
        projected: player.projectedPoints,
        espnRank: player.espnRank,
        score: player.draftScore,
        turnRisk: Number(player.components.turnRisk.toFixed(1)),
        rosterNeed: Number(player.components.rosterNeed.toFixed(1))
      }))
    );
    console.table(
      pairs.slice(0, 5).map((pair, index) => ({
        rank: index + 1,
        pair: `${pair.first.name} + ${pair.second.name}`,
        positions: `${pair.first.position}/${pair.second.position}`,
        score: pair.pairScore
      }))
    );
    console.groupEnd();
  }
  async function startDraftHelper(overrides = {}) {
    const config = {
      ...LEAGUE_CONFIG,
      ...overrides,
      roster: { ...LEAGUE_CONFIG.roster, ...overrides.roster || {} },
      strategy: {
        ...LEAGUE_CONFIG.strategy,
        ...overrides.strategy || {},
        weights: {
          ...LEAGUE_CONFIG.strategy.weights,
          ...overrides.strategy?.weights || {}
        },
        replacementRanks: {
          ...LEAGUE_CONFIG.strategy.replacementRanks,
          ...overrides.strategy?.replacementRanks || {}
        }
      }
    };
    console.log("Loading ESPN player pool...");
    const players = await fetchEspnPlayerPool({
      leagueId: config.leagueId,
      season: config.season
    });
    console.log(`Loaded ${players.length} ESPN players.`);
    const myOverallPicks = getMySnakePicks(18, config);
    let watcher;
    const recalculate = () => {
      const draftedPicks = watcher.getPicks();
      const scored = scoreAvailablePlayers({
        players,
        draftedPicks,
        myTeamName: config.myTeamName,
        config,
        myOverallPicks
      });
      const pairs = recommendPairs(scored);
      window.__fantasyDraftHelper.state = {
        draftedPicks,
        scored,
        pairs,
        myOverallPicks
      };
      printRecommendations(scored, pairs);
      return window.__fantasyDraftHelper.state;
    };
    watcher = createEspnDraftWatcher({
      teams: config.teams,
      onPick: () => recalculate()
    });
    watcher.start();
    window.__fantasyDraftHelper = {
      config,
      players,
      watcher,
      state: null,
      recalculate,
      stop() {
        watcher.stop();
        console.log("Fantasy Draft Helper stopped.");
      }
    };
    recalculate();
    return window.__fantasyDraftHelper;
  }
  if (typeof window !== "undefined") {
    window.startFantasyDraftHelper = startDraftHelper;
  }
  return __toCommonJS(index_exports);
})();
