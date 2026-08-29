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
      positionWeights: {
        starterNeed: 0.5,
        flexNeed: 0.1,
        depthNeed: 0.08,
        depletion: 0.12,
        opponentDemand: 0.1,
        turnPressure: 0.1
      },
      playerWeights: {
        positionPriority: 0.58,
        vor: 0.17,
        withinPositionValue: 0.13,
        tierDrop: 0.05,
        turnRisk: 0.07
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
    endpointHost = "https://lm-api-reads.fantasy.espn.com"
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
        sortPercOwned: {
          sortPriority: 1,
          sortAsc: false
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
  var CORE_POSITIONS = ["QB", "RB", "WR", "TE"];
  var FLEX_POSITIONS = /* @__PURE__ */ new Set(["RB", "WR", "TE"]);
  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }
  function normalizePosition(position) {
    return position === "D/ST" ? "DST" : position;
  }
  function sortByPosition(players) {
    return players.reduce((groups, player) => {
      const position = normalizePosition(player.position);
      (groups[position] ||= []).push(player);
      return groups;
    }, {});
  }
  function rosterCounts(picks) {
    return picks.reduce((counts, pick) => {
      const position = normalizePosition(pick.position);
      counts[position] = (counts[position] || 0) + 1;
      return counts;
    }, {});
  }
  function flexFilled(counts, config) {
    return Math.max(
      0,
      (counts.RB || 0) - config.roster.RB + (counts.WR || 0) - config.roster.WR + (counts.TE || 0) - config.roster.TE
    );
  }
  function starterNeed(position, counts, config) {
    const required = config.roster[position] || 0;
    if (!required) return 0;
    const missing = Math.max(required - (counts[position] || 0), 0);
    return clamp(missing / required * 100);
  }
  function flexNeed(position, counts, config) {
    if (!FLEX_POSITIONS.has(position) || !config.roster.FLEX) return 0;
    const missingFlex = Math.max(config.roster.FLEX - flexFilled(counts, config), 0);
    return missingFlex > 0 ? 100 : 0;
  }
  function depthNeed(position, counts, config) {
    const have = counts[position] || 0;
    if (position === "QB") {
      if (have < config.roster.QB) return 100;
      if (have === config.roster.QB) return 25;
      if (have === config.roster.QB + 1) return 10;
      return 0;
    }
    if (position === "RB" || position === "WR") {
      if (have < config.roster[position]) return 100;
      if (have < config.roster[position] + 2) return 45;
      return 20;
    }
    if (position === "TE") {
      if (have < config.roster.TE) return 100;
      if (have === config.roster.TE) return 20;
      return 5;
    }
    if (position === "DST") return have < config.roster.DST ? 20 : 0;
    if (position === "K") return have < config.roster.K ? 10 : 0;
    return 0;
  }
  function marketDepletion(position, draftedPicks, config) {
    const drafted = draftedPicks.filter((pick) => normalizePosition(pick.position) === position).length;
    const starterDemand = Math.max(config.teams * (config.roster[position] || 1), 1);
    return clamp(drafted / starterDemand * 100);
  }
  function opponentDemand(position, draftedPicks, myTeamName, config) {
    if (!CORE_POSITIONS.includes(position)) return 0;
    const byTeam = /* @__PURE__ */ new Map();
    for (const pick of draftedPicks) {
      if (!pick.fantasyTeam || pick.fantasyTeam === myTeamName) continue;
      const counts = byTeam.get(pick.fantasyTeam) || {};
      const pickPosition = normalizePosition(pick.position);
      counts[pickPosition] = (counts[pickPosition] || 0) + 1;
      byTeam.set(pick.fantasyTeam, counts);
    }
    const opponentCount = Math.max(config.teams - 1, 1);
    let teamsStillNeeding = 0;
    for (const counts of byTeam.values()) {
      if ((counts[position] || 0) < (config.roster[position] || 0)) teamsStillNeeding += 1;
    }
    teamsStillNeeding += Math.max(opponentCount - byTeam.size, 0);
    return clamp(teamsStillNeeding / opponentCount * 100);
  }
  function positionTurnPressure(position, picksUntilNextTurn, draftedPicks, myTeamName, config) {
    if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 0;
    const demand = opponentDemand(position, draftedPicks, myTeamName, config) / 100;
    const exposure = Math.min(picksUntilNextTurn / Math.max(config.teams * 2 - 2, 1), 1);
    return clamp(demand * exposure * 100);
  }
  function computePositionPriorities({
    draftedPicks,
    myTeamName,
    config,
    picksUntilNextTurn = 0
  }) {
    const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
    const counts = rosterCounts(myPicks);
    const weights = config.strategy.positionWeights;
    const priorities = {};
    for (const position of ["QB", "RB", "WR", "TE", "DST", "K"]) {
      const components = {
        starterNeed: starterNeed(position, counts, config),
        flexNeed: flexNeed(position, counts, config),
        depthNeed: depthNeed(position, counts, config),
        depletion: marketDepletion(position, draftedPicks, config),
        opponentDemand: opponentDemand(position, draftedPicks, myTeamName, config),
        turnPressure: positionTurnPressure(
          position,
          picksUntilNextTurn,
          draftedPicks,
          myTeamName,
          config
        )
      };
      const priority = Object.entries(weights).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0
      );
      priorities[position] = {
        position,
        priority: Number(priority.toFixed(2)),
        have: counts[position] || 0,
        required: config.roster[position] || 0,
        components
      };
    }
    return priorities;
  }
  function withinPositionValue(player, positionPlayers) {
    const projected = positionPlayers.filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const projectionIndex = projected.findIndex((p) => p.id === player.id);
    const projectionScore = projectionIndex < 0 || projected.length <= 1 ? 50 : 100 - projectionIndex / (projected.length - 1) * 100;
    if (!Number.isFinite(player.espnRank)) return clamp(projectionScore);
    const rankScore = clamp(105 - Math.min(player.espnRank, 105));
    return clamp(projectionScore * 0.7 + rankScore * 0.3);
  }
  function valueOverReplacement(player, positionPlayers, replacementRank) {
    if (!Number.isFinite(player.projectedPoints)) return 50;
    const sorted = [...positionPlayers].filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    if (!sorted.length) return 50;
    const replacementIndex = Math.min(Math.max(replacementRank - 1, 0), sorted.length - 1);
    const replacement = sorted[replacementIndex]?.projectedPoints ?? 0;
    const leader = sorted[0]?.projectedPoints ?? replacement;
    const range = Math.max(leader - replacement, 1);
    return clamp((player.projectedPoints - replacement) / range * 100);
  }
  function tierDropScore(player, positionPlayers) {
    const group = [...positionPlayers].filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const index = group.findIndex((p) => p.id === player.id);
    if (index < 0 || index === group.length - 1) return 0;
    const current = group[index].projectedPoints;
    const next = group[index + 1]?.projectedPoints ?? current;
    const leader = group[0]?.projectedPoints ?? current;
    const floor = group.at(-1)?.projectedPoints ?? next;
    const range = Math.max(leader - floor, 1);
    return clamp((current - next) / range * 600);
  }
  function estimateTurnRisk(player, picksUntilNextTurn, positionPlayers, positionPriority) {
    if (!Number.isFinite(picksUntilNextTurn) || picksUntilNextTurn <= 0) return 100;
    const group = [...positionPlayers].sort((a, b) => {
      if (Number.isFinite(a.espnRank) && Number.isFinite(b.espnRank)) return a.espnRank - b.espnRank;
      return (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0);
    });
    const rankWithinPosition = Math.max(group.findIndex((p) => p.id === player.id) + 1, 1);
    const pressure = positionPriority / 100;
    const expectedAtPosition = Math.max(1, picksUntilNextTurn * (0.1 + pressure * 0.35));
    if (rankWithinPosition <= expectedAtPosition) return 95;
    return clamp(95 - (rankWithinPosition - expectedAtPosition) * 11, 5, 95);
  }
  function buildDraftState({ players, draftedPicks, myTeamName }) {
    const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
    const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName?.toLowerCase()).filter(Boolean));
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
    myOverallPicks = []
  }) {
    const state = buildDraftState({ players, draftedPicks, myTeamName });
    const availableByPosition = sortByPosition(state.available);
    const turn = getPicksUntilNextTurn(state.lastOverallPick, myOverallPicks);
    const positionPriorities = computePositionPriorities({
      draftedPicks,
      myTeamName,
      config,
      picksUntilNextTurn: turn.picksUntil
    });
    const weights = config.strategy.playerWeights;
    const scored = state.available.map((player) => {
      const position = normalizePosition(player.position);
      const positionPlayers = availableByPosition[position] || [];
      const positionPriority = positionPriorities[position]?.priority || 0;
      const components = {
        positionPriority,
        withinPositionValue: withinPositionValue(player, positionPlayers),
        vor: valueOverReplacement(
          player,
          positionPlayers,
          config.strategy.replacementRanks[position] || 8
        ),
        tierDrop: tierDropScore(player, positionPlayers),
        turnRisk: estimateTurnRisk(player, turn.picksUntil, positionPlayers, positionPriority)
      };
      const draftScore = Object.entries(weights).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0
      );
      return {
        ...player,
        position,
        draftScore: Number(draftScore.toFixed(2)),
        components,
        positionPriority,
        nextPick: turn.nextPick,
        picksUntilNextTurn: turn.picksUntil
      };
    }).sort((a, b) => b.draftScore - a.draftScore);
    scored.positionPriorities = positionPriorities;
    return scored;
  }
  function recommendPairs(scoredPlayers, limit = 14) {
    const candidates = scoredPlayers.slice(0, limit);
    const pairs = [];
    for (let i = 0; i < candidates.length; i += 1) {
      for (let j = i + 1; j < candidates.length; j += 1) {
        const first = candidates[i];
        const second = candidates[j];
        let synergy = 0;
        const firstNeed = first.components.positionPriority || 0;
        const secondNeed = second.components.positionPriority || 0;
        if (first.position !== second.position) synergy += 5;
        if (first.position === second.position && Math.min(firstNeed, secondNeed) < 70) synergy -= 8;
        if (["DST", "K"].includes(first.position) || ["DST", "K"].includes(second.position)) synergy -= 15;
        if (firstNeed >= 80) synergy += 3;
        if (secondNeed >= 80) synergy += 3;
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
  var HELPER_VERSION = "0.2.1-position-priority-logging";
  function printRecommendations(scored, pairs, count = 10) {
    console.group(`Fantasy Draft Helper ${HELPER_VERSION}`);
    const positionPriorities = scored.positionPriorities || {};
    console.log("Position priorities");
    console.table(
      Object.values(positionPriorities).sort((a, b) => b.priority - a.priority).map((item) => ({
        position: item.position,
        priority: item.priority,
        have: item.have,
        required: item.required,
        starterNeed: Number(item.components.starterNeed.toFixed(1)),
        flexNeed: Number(item.components.flexNeed.toFixed(1)),
        depthNeed: Number(item.components.depthNeed.toFixed(1)),
        depletion: Number(item.components.depletion.toFixed(1)),
        opponentDemand: Number(item.components.opponentDemand.toFixed(1)),
        turnPressure: Number(item.components.turnPressure.toFixed(1))
      }))
    );
    console.log("Recommended players");
    console.table(
      scored.slice(0, count).map((player, index) => ({
        rank: index + 1,
        player: player.name,
        position: player.position,
        positionPriority: Number(player.positionPriority.toFixed(1)),
        projected: player.projectedPoints,
        espnRank: player.espnRank,
        score: player.draftScore,
        vor: Number(player.components.vor.toFixed(1)),
        tierDrop: Number(player.components.tierDrop.toFixed(1)),
        turnRisk: Number(player.components.turnRisk.toFixed(1))
      }))
    );
    console.log("Best turn pairs");
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
  function downloadText(filename, text, type = "application/json") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function csvEscape(value) {
    if (value === null || value === void 0) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
  function buildHistorySnapshot({ draftedPicks, scored, pairs, myTeamName }) {
    const lastPick = draftedPicks.at(-1) || null;
    const nextPick = scored[0]?.nextPick ?? null;
    const picksUntilNextTurn = scored[0]?.picksUntilNextTurn ?? null;
    const myRoster = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName).map((pick) => ({
      overallPick: pick.overallPick,
      round: pick.round,
      roundPick: pick.roundPick,
      playerId: pick.playerId,
      playerName: pick.playerName,
      nflTeam: pick.nflTeam,
      position: pick.position
    }));
    const positionPriorities = Object.values(scored.positionPriorities || {}).sort((a, b) => b.priority - a.priority).map((item) => ({
      position: item.position,
      priority: item.priority,
      have: item.have,
      required: item.required,
      ...item.components
    }));
    const recommendations = scored.slice(0, 20).map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      projectedPoints: player.projectedPoints,
      espnRank: player.espnRank,
      averageDraftPosition: player.averageDraftPosition,
      draftScore: player.draftScore,
      positionPriority: player.positionPriority,
      ...player.components
    }));
    const pairRecommendations = pairs.slice(0, 10).map((pair, index) => ({
      rank: index + 1,
      firstPlayer: pair.first.name,
      firstPosition: pair.first.position,
      secondPlayer: pair.second.name,
      secondPosition: pair.second.position,
      pairScore: pair.pairScore
    }));
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      afterOverallPick: lastPick?.overallPick ?? 0,
      lastPick,
      nextPick,
      picksUntilNextTurn,
      myRoster,
      positionPriorities,
      recommendations,
      pairRecommendations
    };
  }
  function historyToCsv(history) {
    const headers = [
      "timestamp",
      "afterOverallPick",
      "nextPick",
      "picksUntilNextTurn",
      "recommendationRank",
      "playerId",
      "playerName",
      "position",
      "draftScore",
      "positionPriority",
      "projectedPoints",
      "espnRank",
      "averageDraftPosition",
      "vor",
      "withinPositionValue",
      "tierDrop",
      "turnRisk"
    ];
    const rows = [headers.join(",")];
    for (const snapshot of history) {
      for (const rec of snapshot.recommendations) {
        rows.push([
          snapshot.timestamp,
          snapshot.afterOverallPick,
          snapshot.nextPick,
          snapshot.picksUntilNextTurn,
          rec.rank,
          rec.playerId,
          rec.playerName,
          rec.position,
          rec.draftScore,
          rec.positionPriority,
          rec.projectedPoints,
          rec.espnRank,
          rec.averageDraftPosition,
          rec.vor,
          rec.withinPositionValue,
          rec.tierDrop,
          rec.turnRisk
        ].map(csvEscape).join(","));
      }
    }
    return rows.join("\n");
  }
  async function startDraftHelper(overrides = {}) {
    const config = {
      ...LEAGUE_CONFIG,
      ...overrides,
      roster: { ...LEAGUE_CONFIG.roster, ...overrides.roster || {} },
      strategy: {
        ...LEAGUE_CONFIG.strategy,
        ...overrides.strategy || {},
        positionWeights: {
          ...LEAGUE_CONFIG.strategy.positionWeights,
          ...overrides.strategy?.positionWeights || {}
        },
        playerWeights: {
          ...LEAGUE_CONFIG.strategy.playerWeights,
          ...overrides.strategy?.playerWeights || {}
        },
        replacementRanks: {
          ...LEAGUE_CONFIG.strategy.replacementRanks,
          ...overrides.strategy?.replacementRanks || {}
        }
      }
    };
    console.log(`Starting Fantasy Draft Helper ${HELPER_VERSION}`);
    console.log("Loading ESPN player pool...");
    const players = await fetchEspnPlayerPool({
      leagueId: config.leagueId,
      season: config.season
    });
    console.log(`Loaded ${players.length} ESPN players.`);
    const myOverallPicks = getMySnakePicks(18, config);
    const history = [];
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
      const snapshot = buildHistorySnapshot({
        draftedPicks,
        scored,
        pairs,
        myTeamName: config.myTeamName
      });
      const prior = history.at(-1);
      if (!prior || prior.afterOverallPick !== snapshot.afterOverallPick) {
        history.push(snapshot);
      } else {
        history[history.length - 1] = snapshot;
      }
      window.__fantasyDraftHelper.state = {
        version: HELPER_VERSION,
        draftedPicks,
        scored,
        pairs,
        positionPriorities: scored.positionPriorities,
        myOverallPicks,
        history
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
      version: HELPER_VERSION,
      config,
      players,
      watcher,
      state: null,
      history,
      recalculate,
      exportLogs(filename = `fantasy-draft-${Date.now()}.json`) {
        const payload = {
          version: HELPER_VERSION,
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          config,
          history,
          finalState: window.__fantasyDraftHelper.state
        };
        downloadText(filename, JSON.stringify(payload, null, 2));
        console.log(`Exported ${history.length} draft snapshots to ${filename}`);
      },
      exportCsv(filename = `fantasy-draft-recommendations-${Date.now()}.csv`) {
        downloadText(filename, historyToCsv(history), "text/csv;charset=utf-8");
        console.log(`Exported recommendation history to ${filename}`);
      },
      stop() {
        watcher.stop();
        console.log(`Fantasy Draft Helper ${HELPER_VERSION} stopped.`);
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
