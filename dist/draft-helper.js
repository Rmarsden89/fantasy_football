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
      maxRecommendedByPosition: {
        QB: 3,
        RB: 6,
        WR: 7,
        TE: 2,
        DST: 1,
        K: 1
      },
      saturation: {
        QB: { softTarget: 3, multiplierAfterTarget: 0.18 },
        RB: { softTarget: 5, multiplierAfterTarget: 0.3 },
        WR: { softTarget: 5, multiplierAfterTarget: 0.75 },
        TE: { softTarget: 2, multiplierAfterTarget: 0 },
        DST: { softTarget: 1, multiplierAfterTarget: 0 },
        K: { softTarget: 1, multiplierAfterTarget: 0 }
      },
      // Upside should depend on the role we are filling, not just the round.
      // RB3/RB4, WR4+, and QB3 are the intentional ceiling-chasing spots.
      depthUpside: {
        QB: [
          { minHave: 0, maxHave: 1, multiplier: 0.15 },
          { minHave: 2, maxHave: 2, multiplier: 1.3 },
          { minHave: 3, maxHave: 99, multiplier: 0.1 }
        ],
        RB: [
          { minHave: 0, maxHave: 1, multiplier: 0.2 },
          { minHave: 2, maxHave: 3, multiplier: 1.35 },
          { minHave: 4, maxHave: 4, multiplier: 0.8 },
          { minHave: 5, maxHave: 99, multiplier: 0.4 }
        ],
        WR: [
          { minHave: 0, maxHave: 2, multiplier: 0.25 },
          { minHave: 3, maxHave: 4, multiplier: 1.3 },
          { minHave: 5, maxHave: 99, multiplier: 1.1 }
        ],
        TE: [
          { minHave: 0, maxHave: 0, multiplier: 0.2 },
          { minHave: 1, maxHave: 1, multiplier: 0.7 },
          { minHave: 2, maxHave: 99, multiplier: 0 }
        ]
      },
      // The AI layer is deliberately constrained: it may only reorder the
      // deterministic top candidates and can never introduce an ineligible player.
      // The local reranker service keeps the OpenAI API key out of the browser bundle.
      aiReranker: {
        enabled: true,
        candidateLimit: 8,
        // The rerank is asynchronous and race-protected, so allow a realistic
        // network/model window instead of aborting a healthy request after 2.5s.
        timeoutMs: 1e4,
        endpoint: "http://127.0.0.1:8787/rerank"
      },
      tightEndStrategy: {
        elitePositionRank: 5,
        eliteStarterPriorityCap: 8,
        normalStarterPriorityCap: 20,
        backupEarliestRound: 10,
        unfilledFlexNeed: 25,
        unfilledDepthNeed: 70,
        missingStarterUrgency: [
          { throughRound: 3, multiplier: 0.7 },
          { throughRound: 7, multiplier: 0.82 },
          { throughRound: 10, multiplier: 0.96 },
          { throughRound: 18, multiplier: 1.08 }
        ],
        playerQualityGate: {
          minimum: 52,
          fullCredit: 78,
          minimumMultiplier: 0.35
        }
      },
      specialTeamsEarliestRound: {
        DST: 16,
        K: 17
      },
      positionWeights: {
        starterNeed: 0.5,
        flexNeed: 0.1,
        depthNeed: 0.08,
        depletion: 0.12,
        opponentDemand: 0.1,
        turnPressure: 0.1
      },
      // Independent ranking sources form the stable player-quality anchor.
      // Missing sources are automatically renormalized by consensusModel, so
      // partial snapshot coverage does not penalize a player.
      consensus: {
        sourceWeights: {
          fantasyPros: 0.35,
          pfn: 0.25,
          espnDraftRank: 0.15,
          marketAdp: 0.15,
          espnRank: 0.1
        },
        rankCeiling: 240
      },
      // VOR is a league-specific adjustment, not the primary player ranking.
      phaseWeights: {
        early: {
          throughRound: 6,
          positionPriority: 0.54,
          vor: 0.1,
          withinPositionValue: 0.08,
          consensusValue: 0.24,
          upside: 0,
          tierDrop: 0.04
        },
        middle: {
          throughRound: 11,
          positionPriority: 0.47,
          vor: 0.08,
          withinPositionValue: 0.07,
          consensusValue: 0.2,
          upside: 0.14,
          tierDrop: 0.04
        },
        late: {
          positionPriority: 0.38,
          vor: 0.06,
          withinPositionValue: 0.06,
          consensusValue: 0.18,
          upside: 0.29,
          tierDrop: 0.03
        }
      },
      decisionContext: {
        waitRiskScoreWindow: 0.75,
        upsideTiebreakStartsRound: 7
      },
      byeTiebreaker: {
        scoreWindow: 0.75,
        conflictPenalty: 25,
        maxConflictsCounted: 3
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

  // src/consensusModel.js
  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }
  function normalizeName(name) {
    return String(name || "").toLowerCase().replace(/[’]/g, "'").replace(/[.,]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/\s+/g, " ").trim();
  }
  function rankScore(rank, ceiling = 240) {
    if (!Number.isFinite(rank) || rank <= 0) return null;
    return clamp(100 - (Math.min(rank, ceiling) - 1) / Math.max(ceiling - 1, 1) * 100);
  }
  function lookupExternalRank(player, source) {
    if (!source) return null;
    if (source.byId && player.id in source.byId) return Number(source.byId[player.id]);
    const key = normalizeName(player.name);
    if (source.byName && key in source.byName) return Number(source.byName[key]);
    if (source.byName) {
      for (const [name, rank] of Object.entries(source.byName)) {
        if (normalizeName(name) === key) return Number(rank);
      }
    }
    return null;
  }
  function applyConsensusModel(players, {
    sourceWeights = {},
    rankCeiling = 240,
    externalRankings = {}
  } = {}) {
    return players.map((player) => {
      const sourceRanks = {
        espnRank: Number.isFinite(player.espnRank) ? player.espnRank : null,
        marketAdp: Number.isFinite(player.averageDraftPosition) ? player.averageDraftPosition : null
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
      const marketGap = Number.isFinite(player.averageDraftPosition) && Number.isFinite(consensusRank) ? player.averageDraftPosition - consensusRank : 0;
      return {
        ...player,
        consensusRank: Number.isFinite(consensusRank) ? Number(consensusRank.toFixed(2)) : null,
        consensusValue: Number(consensusValue.toFixed(2)),
        consensusSourceCount: sourceCount,
        consensusSourceRanks: sourceRanks,
        marketGap: Number(marketGap.toFixed(2))
      };
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

  // src/byeWeeks.js
  var BYE_WEEK_BY_PRO_TEAM_ID_2026 = {
    1: 11,
    // ATL
    2: 7,
    // BUF
    3: 10,
    // CHI
    4: 6,
    // CIN
    5: 11,
    // CLE
    6: 14,
    // DAL
    7: 10,
    // DEN
    8: 6,
    // DET
    9: 11,
    // GB
    10: 9,
    // TEN
    11: 13,
    // IND
    12: 5,
    // KC
    13: 13,
    // LV
    14: 11,
    // LAR
    15: 6,
    // MIA
    16: 6,
    // MIN
    17: 11,
    // NE
    18: 8,
    // NO
    19: 8,
    // NYG
    20: 13,
    // NYJ
    21: 10,
    // PHI
    22: 14,
    // ARI
    23: 9,
    // PIT
    24: 7,
    // LAC
    25: 8,
    // SF
    26: 11,
    // SEA
    27: 10,
    // TB
    28: 7,
    // WAS
    29: 5,
    // CAR
    30: 7,
    // JAX
    33: 13,
    // BAL
    34: 8
    // HOU
  };
  function byeWeekForProTeamId(proTeamId, season = 2026) {
    if (season !== 2026) return null;
    return BYE_WEEK_BY_PRO_TEAM_ID_2026[Number(proTeamId)] ?? null;
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
  function normalizeEspnPlayer(entry, season = 2026) {
    const player = entry.player || entry;
    const position = POSITION_BY_DEFAULT_ID[player.defaultPositionId] || null;
    const nflTeamId = player.proTeamId;
    return {
      id: entry.id ?? player.id,
      name: player.fullName,
      nflTeamId,
      position,
      active: player.active ?? null,
      projectedPoints: projectedPoints(player),
      espnRank: draftRank(player),
      percentOwned: player.ownership?.percentOwned ?? null,
      averageDraftPosition: player.ownership?.averageDraftPosition ?? null,
      auctionValueAverage: player.ownership?.auctionValueAverage ?? null,
      injuryStatus: player.injuryStatus ?? null,
      seasonOutlook: player.seasonOutlook ?? "",
      lastNewsDate: player.lastNewsDate ?? null,
      byeWeek: byeWeekForProTeamId(nflTeamId, season),
      raw: entry
    };
  }
  function isDraftEligiblePlayer(player) {
    if (!player?.position) return false;
    if (player.active === false) return false;
    if (player.position !== "DST" && !(Number(player.nflTeamId) > 0)) return false;
    return true;
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
    return (data.players || []).map((entry) => normalizeEspnPlayer(entry, season)).filter(isDraftEligiblePlayer);
  }

  // src/data/rankings/2026-draft-final.json
  var draft_final_default = {
    snapshotVersion: 2,
    season: 2026,
    format: "PPR_SUPERFLEX",
    generatedAt: "2026-08-30",
    notes: "Static pre-draft ranking snapshot. FantasyPros ranks imported from the downloadable 2026 Superflex PPR CSV; runtime never scrapes ranking sites.",
    sources: {
      fantasyPros: {
        name: "FantasyPros 2026 Superflex PPR downloadable CSV",
        asOf: "2026-08-30",
        playerCount: 446,
        importMethod: "csv"
      },
      pfn: {
        name: "Pro Football Network Superflex PPR Big Board",
        asOf: "2026-08-30",
        playerCount: 6,
        refreshStatus: "preserved-seed"
      }
    },
    players: {
      "josh allen": {
        name: "Josh Allen",
        team: "BUF",
        position: "QB",
        pfnRank: 1,
        fantasyProsRank: 1,
        fantasyProsExpertRanks: [
          1,
          1
        ],
        fantasyProsAverage: 1
      },
      "drake maye": {
        name: "Drake Maye",
        team: "NE",
        position: "QB",
        pfnRank: 2,
        fantasyProsRank: 2,
        fantasyProsExpertRanks: [
          4,
          2
        ],
        fantasyProsAverage: 2
      },
      "ja'marr chase": {
        name: "Ja'Marr Chase",
        team: "CIN",
        position: "WR",
        pfnRank: 3,
        fantasyProsRank: 3,
        fantasyProsExpertRanks: [
          3,
          3
        ],
        fantasyProsAverage: 3
      },
      "lamar jackson": {
        name: "Lamar Jackson",
        team: "BAL",
        position: "QB",
        pfnRank: 4,
        fantasyProsRank: 4,
        fantasyProsExpertRanks: [
          2,
          6
        ],
        fantasyProsAverage: 4
      },
      "jahmyr gibbs": {
        name: "Jahmyr Gibbs",
        team: "DET",
        position: "RB",
        pfnRank: 5,
        fantasyProsRank: 5,
        fantasyProsExpertRanks: [
          5,
          7
        ],
        fantasyProsAverage: 5
      },
      "bijan robinson": {
        name: "Bijan Robinson",
        team: "ATL",
        position: "RB",
        fantasyProsRank: 7,
        fantasyProsExpertRanks: [
          7,
          5
        ],
        fantasyProsAverage: 7
      },
      "joe burrow": {
        name: "Joe Burrow",
        team: "CIN",
        position: "QB",
        pfnRank: 6,
        fantasyProsRank: 6,
        fantasyProsExpertRanks: [
          10,
          4
        ],
        fantasyProsAverage: 6
      },
      "puka nacua": {
        name: "Puka Nacua",
        team: "LAR",
        position: "WR",
        fantasyProsRank: 9,
        fantasyProsExpertRanks: [
          9,
          9
        ],
        fantasyProsAverage: 9
      },
      "jayden daniels": {
        name: "Jayden Daniels",
        team: "WAS",
        position: "QB",
        fantasyProsRank: 8,
        fantasyProsExpertRanks: [
          6,
          8
        ],
        fantasyProsAverage: 8
      },
      "jalen hurts": {
        name: "Jalen Hurts",
        team: "PHI",
        position: "QB",
        fantasyProsRank: 10,
        fantasyProsExpertRanks: [
          8,
          18
        ],
        fantasyProsAverage: 10
      },
      "amon-ra st. brown": {
        name: "Amon-Ra St. Brown",
        team: "DET",
        position: "WR",
        fantasyProsRank: 15,
        fantasyProsExpertRanks: [
          15,
          13
        ],
        fantasyProsAverage: 15
      },
      "justin herbert": {
        name: "Justin Herbert",
        team: "LAC",
        position: "QB",
        fantasyProsRank: 13,
        fantasyProsExpertRanks: [
          16,
          15
        ],
        fantasyProsAverage: 13
      },
      "jaxon smith-njigba": {
        name: "Jaxon Smith-Njigba",
        team: "SEA",
        position: "WR",
        fantasyProsRank: 12,
        fantasyProsExpertRanks: [
          12,
          11
        ],
        fantasyProsAverage: 12
      },
      "ceedee lamb": {
        name: "CeeDee Lamb",
        team: "DAL",
        position: "WR",
        fantasyProsRank: 19,
        fantasyProsExpertRanks: [
          18,
          26
        ],
        fantasyProsAverage: 19
      },
      "de'von achane": {
        name: "De'Von Achane",
        team: "MIA",
        position: "RB",
        fantasyProsRank: 30,
        fantasyProsExpertRanks: [
          44,
          20
        ],
        fantasyProsAverage: 30
      },
      "malik nabers": {
        name: "Malik Nabers",
        team: "NYG",
        position: "WR",
        fantasyProsRank: 28,
        fantasyProsExpertRanks: [
          24,
          28
        ],
        fantasyProsAverage: 28
      },
      "brian thomas jr.": {
        name: "Brian Thomas Jr.",
        team: "JAX",
        position: "WR",
        fantasyProsRank: 82,
        fantasyProsExpertRanks: [
          88,
          89
        ],
        fantasyProsAverage: 82
      },
      "james cook iii": {
        name: "James Cook III",
        team: "BUF",
        position: "RB",
        fantasyProsRank: 14,
        fantasyProsExpertRanks: [
          17,
          10
        ],
        fantasyProsAverage: 14
      },
      "justin jefferson": {
        name: "Justin Jefferson",
        team: "MIN",
        position: "WR",
        fantasyProsRank: 18,
        fantasyProsExpertRanks: [
          19,
          19
        ],
        fantasyProsAverage: 18
      },
      "drake london": {
        name: "Drake London",
        team: "ATL",
        position: "WR",
        fantasyProsRank: 24,
        fantasyProsExpertRanks: [
          21,
          24
        ],
        fantasyProsAverage: 24
      },
      "brock bowers": {
        name: "Brock Bowers",
        team: "LV",
        position: "TE",
        fantasyProsRank: 25,
        fantasyProsExpertRanks: [
          25,
          34
        ],
        fantasyProsAverage: 25
      },
      "jeremiyah love": {
        name: "Jeremiyah Love",
        team: "ARI",
        position: "RB",
        fantasyProsRank: 44,
        fantasyProsExpertRanks: [
          40,
          43
        ],
        fantasyProsAverage: 44
      },
      "rashee rice": {
        name: "Rashee Rice",
        team: "KC",
        position: "WR",
        fantasyProsRank: 33,
        fantasyProsExpertRanks: [
          39,
          33
        ],
        fantasyProsAverage: 33
      },
      "nico collins": {
        name: "Nico Collins",
        team: "HOU",
        position: "WR",
        fantasyProsRank: 27,
        fantasyProsExpertRanks: [
          27,
          21
        ],
        fantasyProsAverage: 27
      },
      "trevor lawrence": {
        name: "Trevor Lawrence",
        team: "JAX",
        position: "QB",
        fantasyProsRank: 29,
        fantasyProsExpertRanks: [
          29,
          29
        ],
        fantasyProsAverage: 29
      },
      "dak prescott": {
        name: "Dak Prescott",
        team: "DAL",
        position: "QB",
        fantasyProsRank: 36,
        fantasyProsExpertRanks: [
          36,
          36
        ],
        fantasyProsAverage: 36
      },
      "bo nix": {
        name: "Bo Nix",
        team: "DEN",
        position: "QB",
        fantasyProsRank: 50,
        fantasyProsExpertRanks: [
          57,
          41
        ],
        fantasyProsAverage: 50
      },
      "saquon barkley": {
        name: "Saquon Barkley",
        team: "PHI",
        position: "RB",
        fantasyProsRank: 23,
        fantasyProsExpertRanks: [
          26,
          23
        ],
        fantasyProsAverage: 23
      },
      "derrick henry": {
        name: "Derrick Henry",
        team: "BAL",
        position: "RB",
        fantasyProsRank: 26,
        fantasyProsExpertRanks: [
          32,
          30
        ],
        fantasyProsAverage: 26
      },
      "ashton jeanty": {
        name: "Ashton Jeanty",
        team: "LV",
        position: "RB",
        fantasyProsRank: 37,
        fantasyProsExpertRanks: [
          20,
          54
        ],
        fantasyProsAverage: 37
      },
      "george kittle": {
        name: "George Kittle",
        team: "SF",
        position: "TE",
        fantasyProsRank: 72,
        fantasyProsExpertRanks: [
          80,
          65
        ],
        fantasyProsAverage: 72
      },
      "bucky irving": {
        name: "Bucky Irving",
        team: "TB",
        position: "RB",
        fantasyProsRank: 85,
        fantasyProsExpertRanks: [
          96,
          81
        ],
        fantasyProsAverage: 85
      },
      "brock purdy": {
        name: "Brock Purdy",
        team: "SF",
        position: "QB",
        fantasyProsRank: 41,
        fantasyProsExpertRanks: [
          41,
          53
        ],
        fantasyProsAverage: 41
      },
      "matthew stafford": {
        name: "Matthew Stafford",
        team: "LAR",
        position: "QB",
        fantasyProsRank: 69,
        fantasyProsExpertRanks: [
          78,
          61
        ],
        fantasyProsAverage: 69
      },
      "a.j. brown": {
        name: "A.J. Brown",
        team: "NE",
        position: "WR",
        fantasyProsRank: 21,
        fantasyProsExpertRanks: [
          28,
          17
        ],
        fantasyProsAverage: 21
      },
      "chris olave": {
        name: "Chris Olave",
        team: "NO",
        position: "WR",
        fantasyProsRank: 35,
        fantasyProsExpertRanks: [
          31,
          42
        ],
        fantasyProsAverage: 35
      },
      "tee higgins": {
        name: "Tee Higgins",
        team: "CIN",
        position: "WR",
        fantasyProsRank: 39,
        fantasyProsExpertRanks: [
          45,
          35
        ],
        fantasyProsAverage: 39
      },
      "caleb williams": {
        name: "Caleb Williams",
        team: "CHI",
        position: "QB",
        fantasyProsRank: 16,
        fantasyProsExpertRanks: [
          22,
          12
        ],
        fantasyProsAverage: 16
      },
      "jordan love": {
        name: "Jordan Love",
        team: "GB",
        position: "QB",
        fantasyProsRank: 81,
        fantasyProsExpertRanks: [
          92,
          76
        ],
        fantasyProsAverage: 81
      },
      "kenneth walker iii": {
        name: "Kenneth Walker III",
        team: "KC",
        position: "RB",
        fantasyProsRank: 32,
        fantasyProsExpertRanks: [
          30,
          37
        ],
        fantasyProsAverage: 32
      },
      "marvin harrison jr.": {
        name: "Marvin Harrison Jr.",
        team: "ARI",
        position: "WR",
        fantasyProsRank: 74,
        fantasyProsExpertRanks: [
          82,
          77
        ],
        fantasyProsAverage: 74
      },
      "patrick mahomes": {
        name: "Patrick Mahomes",
        team: "KC",
        position: "QB"
      },
      "rome odunze": {
        name: "Rome Odunze",
        team: "CHI",
        position: "WR",
        fantasyProsRank: 68,
        fantasyProsExpertRanks: [
          70,
          62
        ],
        fantasyProsAverage: 68
      },
      "kyler murray": {
        name: "Kyler Murray",
        team: "MIN",
        position: "QB",
        fantasyProsRank: 62,
        fantasyProsExpertRanks: [
          64,
          69
        ],
        fantasyProsAverage: 62
      },
      "sam laporta": {
        name: "Sam LaPorta",
        team: "DET",
        position: "TE",
        fantasyProsRank: 65,
        fantasyProsExpertRanks: [
          66,
          73
        ],
        fantasyProsAverage: 65
      },
      "ladd mcconkey": {
        name: "Ladd McConkey",
        team: "LAC",
        position: "WR",
        fantasyProsRank: 47,
        fantasyProsExpertRanks: [
          48,
          45
        ],
        fantasyProsAverage: 47
      },
      "tetairoa mcmillan": {
        name: "Tetairoa McMillan",
        team: "CAR",
        position: "WR",
        fantasyProsRank: 54,
        fantasyProsExpertRanks: [
          55,
          51
        ],
        fantasyProsAverage: 54
      },
      "trey mcbride": {
        name: "Trey McBride",
        team: "ARI",
        position: "TE",
        fantasyProsRank: 34,
        fantasyProsExpertRanks: [
          34,
          27
        ],
        fantasyProsAverage: 34
      },
      "josh jacobs": {
        name: "Josh Jacobs",
        team: "GB",
        position: "RB",
        fantasyProsRank: 56,
        fantasyProsExpertRanks: [
          53,
          57
        ],
        fantasyProsAverage: 56
      },
      "garrett wilson": {
        name: "Garrett Wilson",
        team: "NYJ",
        position: "WR",
        fantasyProsRank: 55,
        fantasyProsExpertRanks: [
          58,
          56
        ],
        fantasyProsAverage: 55
      },
      "jonathan taylor": {
        name: "Jonathan Taylor",
        team: "IND",
        position: "RB",
        fantasyProsRank: 11,
        fantasyProsExpertRanks: [
          11,
          14
        ],
        fantasyProsAverage: 11
      },
      "christian mccaffrey": {
        name: "Christian McCaffrey",
        team: "SF",
        position: "RB",
        fantasyProsRank: 17,
        fantasyProsExpertRanks: [
          14,
          16
        ],
        fantasyProsAverage: 17
      },
      "chase brown": {
        name: "Chase Brown",
        team: "CIN",
        position: "RB",
        fantasyProsRank: 20,
        fantasyProsExpertRanks: [
          23,
          25
        ],
        fantasyProsAverage: 20
      },
      "jaxson dart": {
        name: "Jaxson Dart",
        team: "NYG",
        position: "QB",
        fantasyProsRank: 22,
        fantasyProsExpertRanks: [
          13,
          22
        ],
        fantasyProsAverage: 22
      },
      "george pickens": {
        name: "George Pickens",
        team: "DAL",
        position: "WR",
        fantasyProsRank: 31,
        fantasyProsExpertRanks: [
          33,
          31
        ],
        fantasyProsAverage: 31
      },
      "zay flowers": {
        name: "Zay Flowers",
        team: "BAL",
        position: "WR",
        fantasyProsRank: 38,
        fantasyProsExpertRanks: [
          38,
          38
        ],
        fantasyProsAverage: 38
      },
      "omarion hampton": {
        name: "Omarion Hampton",
        team: "LAC",
        position: "RB",
        fantasyProsRank: 40,
        fantasyProsExpertRanks: [
          37,
          40
        ],
        fantasyProsAverage: 40
      },
      "jaylen waddle": {
        name: "Jaylen Waddle",
        team: "DEN",
        position: "WR",
        fantasyProsRank: 42,
        fantasyProsExpertRanks: [
          42,
          39
        ],
        fantasyProsAverage: 42
      },
      "colston loveland": {
        name: "Colston Loveland",
        team: "CHI",
        position: "TE",
        fantasyProsRank: 43,
        fantasyProsExpertRanks: [
          43,
          44
        ],
        fantasyProsAverage: 43
      },
      "devonta smith": {
        name: "DeVonta Smith",
        team: "PHI",
        position: "WR",
        fantasyProsRank: 45,
        fantasyProsExpertRanks: [
          35,
          49
        ],
        fantasyProsAverage: 45
      },
      "javonte williams": {
        name: "Javonte Williams",
        team: "DAL",
        position: "RB",
        fantasyProsRank: 46,
        fantasyProsExpertRanks: [
          56,
          32
        ],
        fantasyProsAverage: 46
      },
      "emeka egbuka": {
        name: "Emeka Egbuka",
        team: "TB",
        position: "WR",
        fantasyProsRank: 48,
        fantasyProsExpertRanks: [
          51,
          47
        ],
        fantasyProsAverage: 48
      },
      "breece hall": {
        name: "Breece Hall",
        team: "NYJ",
        position: "RB",
        fantasyProsRank: 49,
        fantasyProsExpertRanks: [
          46,
          60
        ],
        fantasyProsAverage: 49
      },
      "terry mclaurin": {
        name: "Terry McLaurin",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 51,
        fantasyProsExpertRanks: [
          47,
          55
        ],
        fantasyProsAverage: 51
      },
      "tyler warren": {
        name: "Tyler Warren",
        team: "IND",
        position: "TE",
        fantasyProsRank: 52,
        fantasyProsExpertRanks: [
          52,
          59
        ],
        fantasyProsAverage: 52
      },
      "travis etienne jr.": {
        name: "Travis Etienne Jr.",
        team: "NO",
        position: "RB",
        fantasyProsRank: 53,
        fantasyProsExpertRanks: [
          60,
          46
        ],
        fantasyProsAverage: 53
      },
      "patrick mahomes ii": {
        name: "Patrick Mahomes II",
        team: "KC",
        position: "QB",
        fantasyProsRank: 57,
        fantasyProsExpertRanks: [
          50,
          50
        ],
        fantasyProsAverage: 57
      },
      "luther burden iii": {
        name: "Luther Burden III",
        team: "CHI",
        position: "WR",
        fantasyProsRank: 58,
        fantasyProsExpertRanks: [
          54,
          67
        ],
        fantasyProsAverage: 58
      },
      "tucker kraft": {
        name: "Tucker Kraft",
        team: "GB",
        position: "TE",
        fantasyProsRank: 59,
        fantasyProsExpertRanks: [
          59,
          52
        ],
        fantasyProsAverage: 59
      },
      "d'andre swift": {
        name: "D'Andre Swift",
        team: "CHI",
        position: "RB",
        fantasyProsRank: 60,
        fantasyProsExpertRanks: [
          64,
          48
        ],
        fantasyProsAverage: 60
      },
      "christian watson": {
        name: "Christian Watson",
        team: "GB",
        position: "WR",
        fantasyProsRank: 61,
        fantasyProsExpertRanks: [
          67,
          58
        ],
        fantasyProsAverage: 61
      },
      "kyren williams": {
        name: "Kyren Williams",
        team: "LAR",
        position: "RB",
        fantasyProsRank: 63,
        fantasyProsExpertRanks: [
          49,
          64
        ],
        fantasyProsAverage: 63
      },
      "parker washington": {
        name: "Parker Washington",
        team: "JAX",
        position: "WR",
        fantasyProsRank: 64,
        fantasyProsExpertRanks: [
          61,
          66
        ],
        fantasyProsAverage: 64
      },
      "jameson williams": {
        name: "Jameson Williams",
        team: "DET",
        position: "WR",
        fantasyProsRank: 66,
        fantasyProsExpertRanks: [
          64,
          63
        ],
        fantasyProsAverage: 66
      },
      "cam skattebo": {
        name: "Cam Skattebo",
        team: "NYG",
        position: "RB",
        fantasyProsRank: 67,
        fantasyProsExpertRanks: [
          68,
          71
        ],
        fantasyProsAverage: 67
      },
      "david montgomery": {
        name: "David Montgomery",
        team: "HOU",
        position: "RB",
        fantasyProsRank: 70,
        fantasyProsExpertRanks: [
          76,
          70
        ],
        fantasyProsAverage: 70
      },
      "carnell tate": {
        name: "Carnell Tate",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 71,
        fantasyProsExpertRanks: [
          73,
          72
        ],
        fantasyProsAverage: 71
      },
      "bhayshul tuten": {
        name: "Bhayshul Tuten",
        team: "JAX",
        position: "RB",
        fantasyProsRank: 73,
        fantasyProsExpertRanks: [
          80,
          74
        ],
        fantasyProsAverage: 73
      },
      "jared goff": {
        name: "Jared Goff",
        team: "DET",
        position: "QB",
        fantasyProsRank: 75,
        fantasyProsExpertRanks: [
          71,
          68
        ],
        fantasyProsAverage: 75
      },
      "dj moore": {
        name: "DJ Moore",
        team: "BUF",
        position: "WR",
        fantasyProsRank: 76,
        fantasyProsExpertRanks: [
          85,
          80
        ],
        fantasyProsAverage: 76
      },
      "quinshon judkins": {
        name: "Quinshon Judkins",
        team: "CLE",
        position: "RB",
        fantasyProsRank: 77,
        fantasyProsExpertRanks: [
          72,
          92
        ],
        fantasyProsAverage: 77
      },
      "harold fannin jr.": {
        name: "Harold Fannin Jr.",
        team: "CLE",
        position: "TE",
        fantasyProsRank: 78,
        fantasyProsExpertRanks: [
          73,
          79
        ],
        fantasyProsAverage: 78
      },
      "davante adams": {
        name: "Davante Adams",
        team: "LAR",
        position: "WR",
        fantasyProsRank: 79,
        fantasyProsExpertRanks: [
          76,
          93
        ],
        fantasyProsAverage: 79
      },
      "jadarian price": {
        name: "Jadarian Price",
        team: "SEA",
        position: "RB",
        fantasyProsRank: 80,
        fantasyProsExpertRanks: [
          92,
          78
        ],
        fantasyProsAverage: 80
      },
      "kyle pitts sr.": {
        name: "Kyle Pitts Sr.",
        team: "ATL",
        position: "TE",
        fantasyProsRank: 83,
        fantasyProsExpertRanks: [
          87,
          90
        ],
        fantasyProsAverage: 83
      },
      "dk metcalf": {
        name: "DK Metcalf",
        team: "PIT",
        position: "WR",
        fantasyProsRank: 84,
        fantasyProsExpertRanks: [
          112,
          75
        ],
        fantasyProsAverage: 84
      },
      "quentin johnston": {
        name: "Quentin Johnston",
        team: "LAC",
        position: "WR",
        fantasyProsRank: 86,
        fantasyProsExpertRanks: [
          106,
          82
        ],
        fantasyProsAverage: 86
      },
      "malik willis": {
        name: "Malik Willis",
        team: "MIA",
        position: "QB",
        fantasyProsRank: 87,
        fantasyProsExpertRanks: [
          85,
          95
        ],
        fantasyProsAverage: 87
      },
      "jaylen warren": {
        name: "Jaylen Warren",
        team: "PIT",
        position: "RB",
        fantasyProsRank: 88,
        fantasyProsExpertRanks: [
          84,
          97
        ],
        fantasyProsAverage: 88
      },
      "stefon diggs": {
        name: "Stefon Diggs",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 89,
        fantasyProsExpertRanks: [
          94,
          96
        ],
        fantasyProsAverage: 89
      },
      "isaiah likely": {
        name: "Isaiah Likely",
        team: "NYG",
        position: "TE",
        fantasyProsRank: 90,
        fantasyProsExpertRanks: [
          129,
          83
        ],
        fantasyProsAverage: 90
      },
      "treveyon henderson": {
        name: "TreVeyon Henderson",
        team: "NE",
        position: "RB",
        fantasyProsRank: 91,
        fantasyProsExpertRanks: [
          104,
          88
        ],
        fantasyProsAverage: 91
      },
      "mike evans": {
        name: "Mike Evans",
        team: "SF",
        position: "WR",
        fantasyProsRank: 92,
        fantasyProsExpertRanks: [
          79,
          113
        ],
        fantasyProsAverage: 92
      },
      "baker mayfield": {
        name: "Baker Mayfield",
        team: "TB",
        position: "QB",
        fantasyProsRank: 93,
        fantasyProsExpertRanks: [
          106,
          86
        ],
        fantasyProsAverage: 93
      },
      "michael pittman jr.": {
        name: "Michael Pittman Jr.",
        team: "PIT",
        position: "WR",
        fantasyProsRank: 94,
        fantasyProsExpertRanks: [
          97,
          105
        ],
        fantasyProsAverage: 94
      },
      "rhamondre stevenson": {
        name: "Rhamondre Stevenson",
        team: "NE",
        position: "RB",
        fantasyProsRank: 95,
        fantasyProsExpertRanks: [
          88,
          107
        ],
        fantasyProsAverage: 95
      },
      "juwan johnson": {
        name: "Juwan Johnson",
        team: "NO",
        position: "TE",
        fantasyProsRank: 96,
        fantasyProsExpertRanks: [
          115,
          98
        ],
        fantasyProsAverage: 96
      },
      "josh downs": {
        name: "Josh Downs",
        team: "IND",
        position: "WR",
        fantasyProsRank: 97,
        fantasyProsExpertRanks: [
          100,
          102
        ],
        fantasyProsAverage: 97
      },
      "chuba hubbard": {
        name: "Chuba Hubbard",
        team: "CAR",
        position: "RB",
        fantasyProsRank: 98,
        fantasyProsExpertRanks: [
          124,
          85
        ],
        fantasyProsAverage: 98
      },
      "tyler shough": {
        name: "Tyler Shough",
        team: "NO",
        position: "QB",
        fantasyProsRank: 99,
        fantasyProsExpertRanks: [
          99,
          94
        ],
        fantasyProsAverage: 99
      },
      "jakobi meyers": {
        name: "Jakobi Meyers",
        team: "JAX",
        position: "WR",
        fantasyProsRank: 100,
        fantasyProsExpertRanks: [
          121,
          87
        ],
        fantasyProsAverage: 100
      },
      "tony pollard": {
        name: "Tony Pollard",
        team: "TEN",
        position: "RB",
        fantasyProsRank: 101,
        fantasyProsExpertRanks: [
          108,
          110
        ],
        fantasyProsAverage: 101
      },
      "travis kelce": {
        name: "Travis Kelce",
        team: "KC",
        position: "TE",
        fantasyProsRank: 102,
        fantasyProsExpertRanks: [
          101,
          120
        ],
        fantasyProsAverage: 102
      },
      "jayden reed": {
        name: "Jayden Reed",
        team: "GB",
        position: "WR",
        fantasyProsRank: 103,
        fantasyProsExpertRanks: [
          109,
          99
        ],
        fantasyProsAverage: 103
      },
      "michael wilson": {
        name: "Michael Wilson",
        team: "ARI",
        position: "WR",
        fantasyProsRank: 104,
        fantasyProsExpertRanks: [
          130,
          84
        ],
        fantasyProsAverage: 104
      },
      "kenny gainwell": {
        name: "Kenny Gainwell",
        team: "TB",
        position: "RB",
        fantasyProsRank: 105,
        fantasyProsExpertRanks: [
          112,
          112
        ],
        fantasyProsAverage: 105
      },
      "daniel jones": {
        name: "Daniel Jones",
        team: "IND",
        position: "QB",
        fantasyProsRank: 106,
        fantasyProsExpertRanks: [
          134,
          91
        ],
        fantasyProsAverage: 106
      },
      "wan'dale robinson": {
        name: "Wan'Dale Robinson",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 107,
        fantasyProsExpertRanks: [
          103,
          115
        ],
        fantasyProsAverage: 107
      },
      "dallas goedert": {
        name: "Dallas Goedert",
        team: "PHI",
        position: "TE",
        fantasyProsRank: 108,
        fantasyProsExpertRanks: [
          108,
          114
        ],
        fantasyProsAverage: 108
      },
      "jonathon brooks": {
        name: "Jonathon Brooks",
        team: "CAR",
        position: "RB",
        fantasyProsRank: 109,
        fantasyProsExpertRanks: [
          100,
          127
        ],
        fantasyProsAverage: 109
      },
      "courtland sutton": {
        name: "Courtland Sutton",
        team: "DEN",
        position: "WR",
        fantasyProsRank: 110,
        fantasyProsExpertRanks: [
          118,
          106
        ],
        fantasyProsAverage: 110
      },
      "sam darnold": {
        name: "Sam Darnold",
        team: "SEA",
        position: "QB",
        fantasyProsRank: 111,
        fantasyProsExpertRanks: [
          113,
          123
        ],
        fantasyProsAverage: 111
      },
      "blake corum": {
        name: "Blake Corum",
        team: "LAR",
        position: "RB",
        fantasyProsRank: 112,
        fantasyProsExpertRanks: [
          120,
          119
        ],
        fantasyProsAverage: 112
      },
      "chris godwin jr.": {
        name: "Chris Godwin Jr.",
        team: "TB",
        position: "WR",
        fantasyProsRank: 113,
        fantasyProsExpertRanks: [
          91,
          137
        ],
        fantasyProsAverage: 113
      },
      "dalton kincaid": {
        name: "Dalton Kincaid",
        team: "BUF",
        position: "TE",
        fantasyProsRank: 114,
        fantasyProsExpertRanks: [
          94,
          139
        ],
        fantasyProsAverage: 114
      },
      "makai lemon": {
        name: "Makai Lemon",
        team: "PHI",
        position: "WR",
        fantasyProsRank: 115,
        fantasyProsExpertRanks: [
          124,
          126
        ],
        fantasyProsAverage: 115
      },
      "jacory croskey-merritt": {
        name: "Jacory Croskey-Merritt",
        team: "WAS",
        position: "RB",
        fantasyProsRank: 116,
        fantasyProsExpertRanks: [
          140,
          103
        ],
        fantasyProsAverage: 116
      },
      "c.j. stroud": {
        name: "C.J. Stroud",
        team: "HOU",
        position: "QB",
        fantasyProsRank: 117,
        fantasyProsExpertRanks: [
          120,
          118
        ],
        fantasyProsAverage: 117
      },
      "jordan addison": {
        name: "Jordan Addison",
        team: "MIN",
        position: "WR",
        fantasyProsRank: 118,
        fantasyProsExpertRanks: [
          115,
          142
        ],
        fantasyProsAverage: 118
      },
      "rico dowdle": {
        name: "Rico Dowdle",
        team: "PIT",
        position: "RB",
        fantasyProsRank: 119,
        fantasyProsExpertRanks: [
          116,
          130
        ],
        fantasyProsAverage: 119
      },
      "jake ferguson": {
        name: "Jake Ferguson",
        team: "DAL",
        position: "TE",
        fantasyProsRank: 120,
        fantasyProsExpertRanks: [
          136,
          104
        ],
        fantasyProsAverage: 120
      },
      "khalil shakir": {
        name: "Khalil Shakir",
        team: "BUF",
        position: "WR",
        fantasyProsRank: 121,
        fantasyProsExpertRanks: [
          151,
          108
        ],
        fantasyProsAverage: 121
      },
      "jordan mason": {
        name: "Jordan Mason",
        team: "MIN",
        position: "RB",
        fantasyProsRank: 122,
        fantasyProsExpertRanks: [
          148,
          100
        ],
        fantasyProsAverage: 122
      },
      "de'zhaun stribling": {
        name: "De'Zhaun Stribling",
        team: "SF",
        position: "WR",
        fantasyProsRank: 123,
        fantasyProsExpertRanks: [
          142,
          121
        ],
        fantasyProsAverage: 123
      },
      "bryce young": {
        name: "Bryce Young",
        team: "CAR",
        position: "QB",
        fantasyProsRank: 124,
        fantasyProsExpertRanks: [
          127,
          133
        ],
        fantasyProsAverage: 124
      },
      "rashid shaheed": {
        name: "Rashid Shaheed",
        team: "SEA",
        position: "WR",
        fantasyProsRank: 125,
        fantasyProsExpertRanks: [
          148,
          117
        ],
        fantasyProsAverage: 125
      },
      "kyle monangai": {
        name: "Kyle Monangai",
        team: "CHI",
        position: "RB",
        fantasyProsRank: 126,
        fantasyProsExpertRanks: [
          136,
          122
        ],
        fantasyProsAverage: 126
      },
      "mark andrews": {
        name: "Mark Andrews",
        team: "BAL",
        position: "TE",
        fantasyProsRank: 127,
        fantasyProsExpertRanks: [
          143,
          109
        ],
        fantasyProsAverage: 127
      },
      "romeo doubs": {
        name: "Romeo Doubs",
        team: "NE",
        position: "WR",
        fantasyProsRank: 128,
        fantasyProsExpertRanks: [
          136,
          129
        ],
        fantasyProsAverage: 128
      },
      "rj harvey": {
        name: "RJ Harvey",
        team: "DEN",
        position: "RB",
        fantasyProsRank: 129,
        fantasyProsExpertRanks: [
          132,
          135
        ],
        fantasyProsAverage: 129
      },
      "cam ward": {
        name: "Cam Ward",
        team: "TEN",
        position: "QB",
        fantasyProsRank: 130,
        fantasyProsExpertRanks: [
          148,
          125
        ],
        fantasyProsAverage: 130
      },
      "alec pierce": {
        name: "Alec Pierce",
        team: "IND",
        position: "WR",
        fantasyProsRank: 131,
        fantasyProsExpertRanks: [
          160,
          111
        ],
        fantasyProsAverage: 131
      },
      "brenton strange": {
        name: "Brenton Strange",
        team: "JAX",
        position: "TE",
        fantasyProsRank: 132,
        fantasyProsExpertRanks: [
          122,
          151
        ],
        fantasyProsAverage: 132
      },
      "j.k. dobbins": {
        name: "J.K. Dobbins",
        team: "DEN",
        position: "RB",
        fantasyProsRank: 133,
        fantasyProsExpertRanks: [
          156,
          116
        ],
        fantasyProsAverage: 133
      },
      "kc concepcion": {
        name: "KC Concepcion",
        team: "CLE",
        position: "WR",
        fantasyProsRank: 134,
        fantasyProsExpertRanks: [
          133,
          140
        ],
        fantasyProsAverage: 134
      },
      "jacoby brissett": {
        name: "Jacoby Brissett",
        team: "ARI",
        position: "QB",
        fantasyProsRank: 135,
        fantasyProsExpertRanks: [
          141,
          134
        ],
        fantasyProsAverage: 135
      },
      "xavier worthy": {
        name: "Xavier Worthy",
        team: "KC",
        position: "WR",
        fantasyProsRank: 136,
        fantasyProsExpertRanks: [
          127,
          146
        ],
        fantasyProsAverage: 136
      },
      "rachaad white": {
        name: "Rachaad White",
        team: "WAS",
        position: "RB",
        fantasyProsRank: 137,
        fantasyProsExpertRanks: [
          128,
          147
        ],
        fantasyProsAverage: 137
      },
      "chig okonkwo": {
        name: "Chig Okonkwo",
        team: "WAS",
        position: "TE",
        fantasyProsRank: 138,
        fantasyProsExpertRanks: [
          150,
          132
        ],
        fantasyProsAverage: 138
      },
      "jordyn tyson": {
        name: "Jordyn Tyson",
        team: "NO",
        position: "WR",
        fantasyProsRank: 139,
        fantasyProsExpertRanks: [
          145,
          131
        ],
        fantasyProsAverage: 139
      },
      "chris rodriguez jr.": {
        name: "Chris Rodriguez Jr.",
        team: "JAX",
        position: "RB",
        fantasyProsRank: 140,
        fantasyProsExpertRanks: [
          152,
          141
        ],
        fantasyProsAverage: 140
      },
      "matthew golden": {
        name: "Matthew Golden",
        team: "GB",
        position: "WR",
        fantasyProsRank: 141,
        fantasyProsExpertRanks: [
          166,
          124
        ],
        fantasyProsAverage: 141
      },
      "aaron rodgers": {
        name: "Aaron Rodgers",
        team: "PIT",
        position: "QB",
        fantasyProsRank: 142,
        fantasyProsExpertRanks: [
          190,
          101
        ],
        fantasyProsAverage: 142
      },
      "aaron jones sr.": {
        name: "Aaron Jones Sr.",
        team: "MIN",
        position: "RB",
        fantasyProsRank: 143,
        fantasyProsExpertRanks: [
          144,
          150
        ],
        fantasyProsAverage: 143
      },
      "jalen coker": {
        name: "Jalen Coker",
        team: "CAR",
        position: "WR",
        fantasyProsRank: 144,
        fantasyProsExpertRanks: [
          139,
          157
        ],
        fantasyProsAverage: 144
      },
      "hunter henry": {
        name: "Hunter Henry",
        team: "NE",
        position: "TE",
        fantasyProsRank: 145,
        fantasyProsExpertRanks: [
          157,
          128
        ],
        fantasyProsAverage: 145
      },
      "deebo samuel sr.": {
        name: "Deebo Samuel Sr.",
        team: "SF",
        position: "WR",
        fantasyProsRank: 146,
        fantasyProsExpertRanks: [
          163,
          136
        ],
        fantasyProsAverage: 146
      },
      "zach charbonnet": {
        name: "Zach Charbonnet",
        team: "SEA",
        position: "RB",
        fantasyProsRank: 147,
        fantasyProsExpertRanks: [
          168,
          138
        ],
        fantasyProsAverage: 147
      },
      "geno smith": {
        name: "Geno Smith",
        team: "NYJ",
        position: "QB",
        fantasyProsRank: 148,
        fantasyProsExpertRanks: [
          155,
          161
        ],
        fantasyProsAverage: 148
      },
      "travis hunter": {
        name: "Travis Hunter",
        team: "JAX",
        position: "WR",
        fantasyProsRank: 149,
        fantasyProsExpertRanks: [
          172,
          155
        ],
        fantasyProsAverage: 149
      },
      "tyler allgeier": {
        name: "Tyler Allgeier",
        team: "ARI",
        position: "RB",
        fantasyProsRank: 150,
        fantasyProsExpertRanks: [
          176,
          143
        ],
        fantasyProsAverage: 150
      },
      "dalton schultz": {
        name: "Dalton Schultz",
        team: "HOU",
        position: "TE",
        fantasyProsRank: 151,
        fantasyProsExpertRanks: [
          178,
          145
        ],
        fantasyProsAverage: 151
      },
      "jalen mcmillan": {
        name: "Jalen McMillan",
        team: "TB",
        position: "WR",
        fantasyProsRank: 152,
        fantasyProsExpertRanks: [
          175,
          159
        ],
        fantasyProsAverage: 152
      },
      "woody marks": {
        name: "Woody Marks",
        team: "HOU",
        position: "RB",
        fantasyProsRank: 153,
        fantasyProsExpertRanks: [
          160,
          160
        ],
        fantasyProsAverage: 153
      },
      "tua tagovailoa": {
        name: "Tua Tagovailoa",
        team: "ATL",
        position: "QB",
        fantasyProsRank: 154,
        fantasyProsExpertRanks: [
          162,
          166
        ],
        fantasyProsAverage: 154
      },
      "jerry jeudy": {
        name: "Jerry Jeudy",
        team: "CLE",
        position: "WR",
        fantasyProsRank: 155,
        fantasyProsExpertRanks: [
          193,
          149
        ],
        fantasyProsAverage: 155
      },
      "greg dulcich": {
        name: "Greg Dulcich",
        team: "MIA",
        position: "TE",
        fantasyProsRank: 156,
        fantasyProsExpertRanks: [
          185,
          169
        ],
        fantasyProsAverage: 156
      },
      "tre tucker": {
        name: "Tre Tucker",
        team: "LV",
        position: "WR",
        fantasyProsRank: 157,
        fantasyProsExpertRanks: [
          154,
          190
        ],
        fantasyProsAverage: 157
      },
      "isiah pacheco": {
        name: "Isiah Pacheco",
        team: "DET",
        position: "RB",
        fantasyProsRank: 158,
        fantasyProsExpertRanks: [
          192,
          158
        ],
        fantasyProsAverage: 158
      },
      "ryan flournoy": {
        name: "Ryan Flournoy",
        team: "DAL",
        position: "WR",
        fantasyProsRank: 159,
        fantasyProsExpertRanks: [
          178,
          170
        ],
        fantasyProsAverage: 159
      },
      "kirk cousins": {
        name: "Kirk Cousins",
        team: "LV",
        position: "QB",
        fantasyProsRank: 160,
        fantasyProsExpertRanks: [
          183,
          154
        ],
        fantasyProsAverage: 160
      },
      "mike washington jr.": {
        name: "Mike Washington Jr.",
        team: "LV",
        position: "RB",
        fantasyProsRank: 161,
        fantasyProsExpertRanks: [
          200,
          153
        ],
        fantasyProsAverage: 161
      },
      "jalen nailor": {
        name: "Jalen Nailor",
        team: "LV",
        position: "WR",
        fantasyProsRank: 162,
        fantasyProsExpertRanks: [
          187,
          167
        ],
        fantasyProsAverage: 162
      },
      "kenyon sadiq": {
        name: "Kenyon Sadiq",
        team: "NYJ",
        position: "TE",
        fantasyProsRank: 163,
        fantasyProsExpertRanks: [
          192,
          163
        ],
        fantasyProsAverage: 163
      },
      "tank bigsby": {
        name: "Tank Bigsby",
        team: "PHI",
        position: "RB",
        fantasyProsRank: 164,
        fantasyProsExpertRanks: [
          184,
          174
        ],
        fantasyProsAverage: 164
      },
      "houston texans": {
        name: "Houston Texans",
        team: "HOU",
        position: "DST",
        fantasyProsRank: 165,
        fantasyProsExpertRanks: [
          180,
          180
        ],
        fantasyProsAverage: 165
      },
      "tre' harris": {
        name: "Tre' Harris",
        team: "LAC",
        position: "WR",
        fantasyProsRank: 166,
        fantasyProsExpertRanks: [
          184,
          172
        ],
        fantasyProsAverage: 166
      },
      "denver broncos": {
        name: "Denver Broncos",
        team: "DEN",
        position: "DST",
        fantasyProsRank: 167,
        fantasyProsExpertRanks: [
          182,
          182
        ],
        fantasyProsAverage: 167
      },
      "fernando mendoza": {
        name: "Fernando Mendoza",
        team: "LV",
        position: "QB",
        fantasyProsRank: 168,
        fantasyProsExpertRanks: [
          197,
          148
        ],
        fantasyProsAverage: 168
      },
      "denzel boston": {
        name: "Denzel Boston",
        team: "CLE",
        position: "WR",
        fantasyProsRank: 169,
        fantasyProsExpertRanks: [
          157,
          201
        ],
        fantasyProsAverage: 169
      },
      "tyjae spears": {
        name: "Tyjae Spears",
        team: "TEN",
        position: "RB",
        fantasyProsRank: 170,
        fantasyProsExpertRanks: [
          172,
          189
        ],
        fantasyProsAverage: 170
      },
      "seattle seahawks": {
        name: "Seattle Seahawks",
        team: "SEA",
        position: "DST",
        fantasyProsRank: 171,
        fantasyProsExpertRanks: [
          186,
          184
        ],
        fantasyProsAverage: 171
      },
      "aj barner": {
        name: "AJ Barner",
        team: "SEA",
        position: "TE",
        fantasyProsRank: 172,
        fantasyProsExpertRanks: [
          171,
          193
        ],
        fantasyProsAverage: 172
      },
      "los angeles rams": {
        name: "Los Angeles Rams",
        team: "LAR",
        position: "DST",
        fantasyProsRank: 173,
        fantasyProsExpertRanks: [
          184,
          186
        ],
        fantasyProsAverage: 173
      },
      "jauan jennings": {
        name: "Jauan Jennings",
        team: "MIN",
        position: "WR",
        fantasyProsRank: 174,
        fantasyProsExpertRanks: [
          217,
          144
        ],
        fantasyProsAverage: 174
      },
      "keaton mitchell": {
        name: "Keaton Mitchell",
        team: "LAC",
        position: "RB",
        fantasyProsRank: 175,
        fantasyProsExpertRanks: [
          196,
          171
        ],
        fantasyProsAverage: 175
      },
      "philadelphia eagles": {
        name: "Philadelphia Eagles",
        team: "PHI",
        position: "DST",
        fantasyProsRank: 176,
        fantasyProsExpertRanks: [
          188,
          188
        ],
        fantasyProsAverage: 176
      },
      "michael penix jr.": {
        name: "Michael Penix Jr.",
        team: "ATL",
        position: "QB",
        fantasyProsRank: 177,
        fantasyProsExpertRanks: [
          169,
          185
        ],
        fantasyProsAverage: 177
      },
      "keenan allen": {
        name: "Keenan Allen",
        team: "IND",
        position: "WR",
        fantasyProsRank: 178,
        fantasyProsExpertRanks: [
          199,
          162
        ],
        fantasyProsAverage: 178
      },
      "new england patriots": {
        name: "New England Patriots",
        team: "NE",
        position: "DST",
        fantasyProsRank: 179,
        fantasyProsExpertRanks: [
          192,
          190
        ],
        fantasyProsAverage: 179
      },
      "brian robinson jr.": {
        name: "Brian Robinson Jr.",
        team: "ATL",
        position: "RB",
        fantasyProsRank: 180,
        fantasyProsExpertRanks: [
          180,
          192
        ],
        fantasyProsAverage: 180
      },
      "t.j. hockenson": {
        name: "T.J. Hockenson",
        team: "MIN",
        position: "TE",
        fantasyProsRank: 181,
        fantasyProsExpertRanks: [
          164,
          211
        ],
        fantasyProsAverage: 181
      },
      "minnesota vikings": {
        name: "Minnesota Vikings",
        team: "MIN",
        position: "DST",
        fantasyProsRank: 182,
        fantasyProsExpertRanks: [
          196,
          194
        ],
        fantasyProsAverage: 182
      },
      "adonai mitchell": {
        name: "Adonai Mitchell",
        team: "NYJ",
        position: "WR",
        fantasyProsRank: 183,
        fantasyProsExpertRanks: [
          181,
          186
        ],
        fantasyProsAverage: 183
      },
      "pittsburgh steelers": {
        name: "Pittsburgh Steelers",
        team: "PIT",
        position: "DST",
        fantasyProsRank: 184,
        fantasyProsExpertRanks: [
          194,
          198
        ],
        fantasyProsAverage: 184
      },
      "omar cooper jr.": {
        name: "Omar Cooper Jr.",
        team: "NYJ",
        position: "WR",
        fantasyProsRank: 185,
        fantasyProsExpertRanks: [
          220,
          165
        ],
        fantasyProsAverage: 185
      },
      "dylan sampson": {
        name: "Dylan Sampson",
        team: "CLE",
        position: "RB",
        fantasyProsRank: 186,
        fantasyProsExpertRanks: [
          164,
          213
        ],
        fantasyProsAverage: 186
      },
      "baltimore ravens": {
        name: "Baltimore Ravens",
        team: "BAL",
        position: "DST",
        fantasyProsRank: 187,
        fantasyProsExpertRanks: [
          190,
          204
        ],
        fantasyProsAverage: 187
      },
      "deshaun watson": {
        name: "Deshaun Watson",
        team: "CLE",
        position: "QB",
        fantasyProsRank: 188,
        fantasyProsExpertRanks: [
          176,
          179
        ],
        fantasyProsAverage: 188
      },
      "jacksonville jaguars": {
        name: "Jacksonville Jaguars",
        team: "JAX",
        position: "DST",
        fantasyProsRank: 189,
        fantasyProsExpertRanks: [
          202,
          192
        ],
        fantasyProsAverage: 189
      },
      "pat bryant": {
        name: "Pat Bryant",
        team: "DEN",
        position: "WR",
        fantasyProsRank: 190,
        fantasyProsExpertRanks: [
          208,
          180
        ],
        fantasyProsAverage: 190
      },
      "oronde gadsden ii": {
        name: "Oronde Gadsden II",
        team: "LAC",
        position: "TE",
        fantasyProsRank: 191,
        fantasyProsExpertRanks: [
          199,
          181
        ],
        fantasyProsAverage: 191
      },
      "nick singleton": {
        name: "Nick Singleton",
        team: "TEN",
        position: "RB",
        fantasyProsRank: 192,
        fantasyProsExpertRanks: [
          216,
          164
        ],
        fantasyProsAverage: 192
      },
      "los angeles chargers": {
        name: "Los Angeles Chargers",
        team: "LAC",
        position: "DST",
        fantasyProsRank: 193,
        fantasyProsExpertRanks: [
          198,
          196
        ],
        fantasyProsAverage: 193
      },
      "tank dell": {
        name: "Tank Dell",
        team: "HOU",
        position: "WR",
        fantasyProsRank: 194,
        fantasyProsExpertRanks: [
          238,
          152
        ],
        fantasyProsAverage: 194
      },
      "green bay packers": {
        name: "Green Bay Packers",
        team: "GB",
        position: "DST",
        fantasyProsRank: 195,
        fantasyProsExpertRanks: [
          204,
          202
        ],
        fantasyProsAverage: 195
      },
      "shedeur sanders": {
        name: "Shedeur Sanders",
        team: "CLE",
        position: "QB",
        fantasyProsRank: 196,
        fantasyProsExpertRanks: [
          204,
          173
        ],
        fantasyProsAverage: 196
      },
      "jonah coleman": {
        name: "Jonah Coleman",
        team: "DEN",
        position: "RB",
        fantasyProsRank: 197,
        fantasyProsExpertRanks: [
          188,
          199
        ],
        fantasyProsAverage: 197
      },
      "kansas city chiefs": {
        name: "Kansas City Chiefs",
        team: "KC",
        position: "DST",
        fantasyProsRank: 198,
        fantasyProsExpertRanks: [
          200,
          210
        ],
        fantasyProsAverage: 198
      },
      "jaylin noel": {
        name: "Jaylin Noel",
        team: "HOU",
        position: "WR",
        fantasyProsRank: 199,
        fantasyProsExpertRanks: [
          214,
          177
        ],
        fantasyProsAverage: 199
      },
      "terrance ferguson": {
        name: "Terrance Ferguson",
        team: "LAR",
        position: "TE",
        fantasyProsRank: 200,
        fantasyProsExpertRanks: [
          227,
          156
        ],
        fantasyProsAverage: 200
      },
      "detroit lions": {
        name: "Detroit Lions",
        team: "DET",
        position: "DST",
        fantasyProsRank: 201,
        fantasyProsExpertRanks: [
          206,
          208
        ],
        fantasyProsAverage: 201
      },
      "dontayvion wicks": {
        name: "Dontayvion Wicks",
        team: "PHI",
        position: "WR",
        fantasyProsRank: 202,
        fantasyProsExpertRanks: [
          190,
          204
        ],
        fantasyProsAverage: 202
      },
      "kimani vidal": {
        name: "Kimani Vidal",
        team: "LAC",
        position: "RB",
        fantasyProsRank: 203,
        fantasyProsExpertRanks: [
          244,
          182
        ],
        fantasyProsAverage: 203
      },
      "buffalo bills": {
        name: "Buffalo Bills",
        team: "BUF",
        position: "DST",
        fantasyProsRank: 204,
        fantasyProsExpertRanks: [
          216,
          200
        ],
        fantasyProsAverage: 204
      },
      "cleveland browns": {
        name: "Cleveland Browns",
        team: "CLE",
        position: "DST",
        fantasyProsRank: 205,
        fantasyProsExpertRanks: [
          208,
          212
        ],
        fantasyProsAverage: 205
      },
      "justin fields": {
        name: "Justin Fields",
        team: "KC",
        position: "QB",
        fantasyProsRank: 206,
        fantasyProsExpertRanks: [
          218,
          191
        ],
        fantasyProsAverage: 206
      },
      "kayshon boutte": {
        name: "Kayshon Boutte",
        team: "HOU",
        position: "WR",
        fantasyProsRank: 207,
        fantasyProsExpertRanks: [
          232,
          183
        ],
        fantasyProsAverage: 207
      },
      "marshawn lloyd": {
        name: "MarShawn Lloyd",
        team: "GB",
        position: "RB",
        fantasyProsRank: 208,
        fantasyProsExpertRanks: [
          220,
          206
        ],
        fantasyProsAverage: 208
      },
      "atlanta falcons": {
        name: "Atlanta Falcons",
        team: "ATL",
        position: "DST",
        fantasyProsRank: 209,
        fantasyProsExpertRanks: [
          206
        ],
        fantasyProsAverage: 209
      },
      "pat freiermuth": {
        name: "Pat Freiermuth",
        team: "PIT",
        position: "TE",
        fantasyProsRank: 210,
        fantasyProsExpertRanks: [
          213,
          187
        ],
        fantasyProsAverage: 210
      },
      "troy franklin": {
        name: "Troy Franklin",
        team: "DEN",
        position: "WR",
        fantasyProsRank: 211,
        fantasyProsExpertRanks: [
          253,
          176
        ],
        fantasyProsAverage: 211
      },
      "new orleans saints": {
        name: "New Orleans Saints",
        team: "NO",
        position: "DST",
        fantasyProsRank: 212,
        fantasyProsExpertRanks: [
          214
        ],
        fantasyProsAverage: 212
      },
      "devin singletary": {
        name: "Devin Singletary",
        team: "NYG",
        position: "RB",
        fantasyProsRank: 213,
        fantasyProsExpertRanks: [
          260,
          168
        ],
        fantasyProsAverage: 213
      },
      "indianapolis colts": {
        name: "Indianapolis Colts",
        team: "IND",
        position: "DST",
        fantasyProsRank: 214,
        fantasyProsExpertRanks: [
          218,
          216
        ],
        fantasyProsAverage: 214
      },
      "malachi fields": {
        name: "Malachi Fields",
        team: "NYG",
        position: "WR",
        fantasyProsRank: 215,
        fantasyProsExpertRanks: [
          211,
          222
        ],
        fantasyProsAverage: 215
      },
      "mac jones": {
        name: "Mac Jones",
        team: "SF",
        position: "QB",
        fantasyProsRank: 216,
        fantasyProsExpertRanks: [
          211,
          210
        ],
        fantasyProsAverage: 216
      },
      "san francisco 49ers": {
        name: "San Francisco 49ers",
        team: "SF",
        position: "DST",
        fantasyProsRank: 217,
        fantasyProsExpertRanks: [
          214,
          222
        ],
        fantasyProsAverage: 217
      },
      "christian kirk": {
        name: "Christian Kirk",
        team: "SF",
        position: "WR",
        fantasyProsRank: 218,
        fantasyProsExpertRanks: [
          250,
          196
        ],
        fantasyProsAverage: 218
      },
      "sean tucker": {
        name: "Sean Tucker",
        team: "TB",
        position: "RB",
        fantasyProsRank: 219,
        fantasyProsExpertRanks: [
          228,
          202
        ],
        fantasyProsAverage: 219
      },
      "gunnar helm": {
        name: "Gunnar Helm",
        team: "TEN",
        position: "TE",
        fantasyProsRank: 220,
        fantasyProsExpertRanks: [
          206,
          205
        ],
        fantasyProsAverage: 220
      },
      "miami dolphins": {
        name: "Miami Dolphins",
        team: "MIA",
        position: "DST",
        fantasyProsRank: 221,
        fantasyProsExpertRanks: [
          218
        ],
        fantasyProsAverage: 221
      },
      "brandon aubrey": {
        name: "Brandon Aubrey",
        team: "DAL",
        position: "K",
        fantasyProsRank: 222,
        fantasyProsExpertRanks: [
          220,
          220
        ],
        fantasyProsAverage: 222
      },
      "dallas cowboys": {
        name: "Dallas Cowboys",
        team: "DAL",
        position: "DST",
        fantasyProsRank: 223,
        fantasyProsExpertRanks: [
          212,
          228
        ],
        fantasyProsAverage: 223
      },
      "cam little": {
        name: "Cam Little",
        team: "JAX",
        position: "K",
        fantasyProsRank: 224,
        fantasyProsExpertRanks: [
          222,
          222
        ],
        fantasyProsAverage: 224
      },
      "calvin ridley": {
        name: "Calvin Ridley",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 225,
        fantasyProsExpertRanks: [
          235,
          219
        ],
        fantasyProsAverage: 225
      },
      "ray davis": {
        name: "Ray Davis",
        team: "BUF",
        position: "RB",
        fantasyProsRank: 226,
        fantasyProsExpertRanks: [
          236,
          209
        ],
        fantasyProsAverage: 226
      },
      "washington commanders": {
        name: "Washington Commanders",
        team: "WAS",
        position: "DST",
        fantasyProsRank: 227,
        fantasyProsExpertRanks: [
          220
        ],
        fantasyProsAverage: 227
      },
      "cameron dicker": {
        name: "Cameron Dicker",
        team: "LAC",
        position: "K",
        fantasyProsRank: 228,
        fantasyProsExpertRanks: [
          224,
          224
        ],
        fantasyProsAverage: 228
      },
      "j.j. mccarthy": {
        name: "J.J. McCarthy",
        team: "MIN",
        position: "QB",
        fantasyProsRank: 229,
        fantasyProsExpertRanks: [
          225,
          197
        ],
        fantasyProsAverage: 229
      },
      "rashod bateman": {
        name: "Rashod Bateman",
        team: "BAL",
        position: "WR",
        fantasyProsRank: 230,
        fantasyProsExpertRanks: [
          247,
          208
        ],
        fantasyProsAverage: 230
      },
      "new york giants": {
        name: "New York Giants",
        team: "NYG",
        position: "DST",
        fantasyProsRank: 231,
        fantasyProsExpertRanks: [
          210,
          232
        ],
        fantasyProsAverage: 231
      },
      "ka'imi fairbairn": {
        name: "Ka'imi Fairbairn",
        team: "HOU",
        position: "K",
        fantasyProsRank: 232,
        fantasyProsExpertRanks: [
          226,
          228
        ],
        fantasyProsAverage: 232
      },
      "evan engram": {
        name: "Evan Engram",
        team: "DEN",
        position: "TE",
        fantasyProsRank: 233,
        fantasyProsExpertRanks: [
          241,
          175
        ],
        fantasyProsAverage: 233
      },
      "braelon allen": {
        name: "Braelon Allen",
        team: "NYJ",
        position: "RB",
        fantasyProsRank: 234,
        fantasyProsExpertRanks: [
          212,
          242
        ],
        fantasyProsAverage: 234
      },
      "chicago bears": {
        name: "Chicago Bears",
        team: "CHI",
        position: "DST",
        fantasyProsRank: 235,
        fantasyProsExpertRanks: [
          224
        ],
        fantasyProsAverage: 235
      },
      "evan mcpherson": {
        name: "Evan McPherson",
        team: "CIN",
        position: "K",
        fantasyProsRank: 236,
        fantasyProsExpertRanks: [
          232,
          226
        ],
        fantasyProsAverage: 236
      },
      "devaughn vele": {
        name: "Devaughn Vele",
        team: "NO",
        position: "WR",
        fantasyProsRank: 237,
        fantasyProsExpertRanks: [
          196,
          264
        ],
        fantasyProsAverage: 237
      },
      "tampa bay buccaneers": {
        name: "Tampa Bay Buccaneers",
        team: "TB",
        position: "DST",
        fantasyProsRank: 238,
        fantasyProsExpertRanks: [
          226
        ],
        fantasyProsAverage: 238
      },
      "jason myers": {
        name: "Jason Myers",
        team: "SEA",
        position: "K",
        fantasyProsRank: 239,
        fantasyProsExpertRanks: [
          230,
          230
        ],
        fantasyProsAverage: 239
      },
      "ty simpson": {
        name: "Ty Simpson",
        team: "LAR",
        position: "QB",
        fantasyProsRank: 240,
        fantasyProsExpertRanks: [
          232,
          203
        ],
        fantasyProsAverage: 240
      },
      "isaac teslaa": {
        name: "Isaac TeSlaa",
        team: "DET",
        position: "WR",
        fantasyProsRank: 241,
        fantasyProsExpertRanks: [
          256,
          207
        ],
        fantasyProsAverage: 241
      },
      "najee harris": {
        name: "Najee Harris",
        team: "NYG",
        position: "RB",
        fantasyProsRank: 242,
        fantasyProsExpertRanks: [
          280,
          178
        ],
        fantasyProsAverage: 242
      },
      "cincinnati bengals": {
        name: "Cincinnati Bengals",
        team: "CIN",
        position: "DST",
        fantasyProsRank: 243,
        fantasyProsExpertRanks: [
          230
        ],
        fantasyProsAverage: 243
      },
      "harrison mevis": {
        name: "Harrison Mevis",
        team: "LAR",
        position: "K",
        fantasyProsRank: 244,
        fantasyProsExpertRanks: [
          228,
          236
        ],
        fantasyProsAverage: 244
      },
      "cade otton": {
        name: "Cade Otton",
        team: "TB",
        position: "TE",
        fantasyProsRank: 245,
        fantasyProsExpertRanks: [
          234,
          200
        ],
        fantasyProsAverage: 245
      },
      "carolina panthers": {
        name: "Carolina Panthers",
        team: "CAR",
        position: "DST",
        fantasyProsRank: 246,
        fantasyProsExpertRanks: [
          234
        ],
        fantasyProsAverage: 246
      },
      "andy borregales": {
        name: "Andy Borregales",
        team: "NE",
        position: "K",
        fantasyProsRank: 247,
        fantasyProsExpertRanks: [
          234,
          232
        ],
        fantasyProsAverage: 247
      },
      "malik washington": {
        name: "Malik Washington",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 248,
        fantasyProsExpertRanks: [
          202,
          261
        ],
        fantasyProsAverage: 248
      },
      "kaytron allen": {
        name: "Kaytron Allen",
        team: "WAS",
        position: "RB",
        fantasyProsRank: 249,
        fantasyProsExpertRanks: [
          252,
          220
        ],
        fantasyProsAverage: 249
      },
      "tennessee titans": {
        name: "Tennessee Titans",
        team: "TEN",
        position: "DST",
        fantasyProsRank: 250,
        fantasyProsExpertRanks: [
          236
        ],
        fantasyProsAverage: 250
      },
      "tyler loop": {
        name: "Tyler Loop",
        team: "BAL",
        position: "K",
        fantasyProsRank: 251,
        fantasyProsExpertRanks: [
          242,
          234
        ],
        fantasyProsAverage: 251
      },
      "chimere dike": {
        name: "Chimere Dike",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 252,
        fantasyProsExpertRanks: [
          277,
          188
        ],
        fantasyProsAverage: 252
      },
      "new york jets": {
        name: "New York Jets",
        team: "NYJ",
        position: "DST",
        fantasyProsRank: 253,
        fantasyProsExpertRanks: [
          238
        ],
        fantasyProsAverage: 253
      },
      "eddy pineiro": {
        name: "Eddy Pineiro",
        team: "SF",
        position: "K",
        fantasyProsRank: 254,
        fantasyProsExpertRanks: [
          236,
          246
        ],
        fantasyProsAverage: 254
      },
      "jameis winston": {
        name: "Jameis Winston",
        team: "NYG",
        position: "QB",
        fantasyProsRank: 255,
        fantasyProsExpertRanks: [
          253,
          221
        ],
        fantasyProsAverage: 255
      },
      "james conner": {
        name: "James Conner",
        team: "ARI",
        position: "RB",
        fantasyProsRank: 256,
        fantasyProsExpertRanks: [
          296,
          184
        ],
        fantasyProsAverage: 256
      },
      "arizona cardinals": {
        name: "Arizona Cardinals",
        team: "ARI",
        position: "DST",
        fantasyProsRank: 257,
        fantasyProsExpertRanks: [
          240
        ],
        fantasyProsAverage: 257
      },
      "jake bates": {
        name: "Jake Bates",
        team: "DET",
        position: "K",
        fantasyProsRank: 258,
        fantasyProsExpertRanks: [
          238,
          244
        ],
        fantasyProsAverage: 258
      },
      "cooper kupp": {
        name: "Cooper Kupp",
        team: "SEA",
        position: "WR",
        fantasyProsRank: 259,
        fantasyProsExpertRanks: [
          241,
          225
        ],
        fantasyProsAverage: 259
      },
      "colby parkinson": {
        name: "Colby Parkinson",
        team: "LAR",
        position: "TE",
        fantasyProsRank: 260,
        fantasyProsExpertRanks: [
          220,
          245
        ],
        fantasyProsAverage: 260
      },
      "las vegas raiders": {
        name: "Las Vegas Raiders",
        team: "LV",
        position: "DST",
        fantasyProsRank: 261,
        fantasyProsExpertRanks: [
          242
        ],
        fantasyProsAverage: 261
      },
      "cairo santos": {
        name: "Cairo Santos",
        team: "CHI",
        position: "K",
        fantasyProsRank: 262,
        fantasyProsExpertRanks: [
          244,
          240
        ],
        fantasyProsAverage: 262
      },
      "zachariah branch": {
        name: "Zachariah Branch",
        team: "ATL",
        position: "WR",
        fantasyProsRank: 263,
        fantasyProsExpertRanks: [
          226,
          249
        ],
        fantasyProsAverage: 263
      },
      "jaylen wright": {
        name: "Jaylen Wright",
        team: "MIA",
        position: "RB",
        fantasyProsRank: 264,
        fantasyProsExpertRanks: [
          264,
          216
        ],
        fantasyProsAverage: 264
      },
      "chase mclaughlin": {
        name: "Chase McLaughlin",
        team: "TB",
        position: "K",
        fantasyProsRank: 265,
        fantasyProsExpertRanks: [
          250,
          238
        ],
        fantasyProsAverage: 265
      },
      "dillon gabriel": {
        name: "Dillon Gabriel",
        team: "CLE",
        position: "QB",
        fantasyProsRank: 266,
        fantasyProsExpertRanks: [
          260,
          235
        ],
        fantasyProsAverage: 266
      },
      "wil lutz": {
        name: "Wil Lutz",
        team: "DEN",
        position: "K",
        fantasyProsRank: 267,
        fantasyProsExpertRanks: [
          246,
          242
        ],
        fantasyProsAverage: 267
      },
      "darnell mooney": {
        name: "Darnell Mooney",
        team: "NYG",
        position: "WR",
        fantasyProsRank: 268,
        fantasyProsExpertRanks: [
          262,
          214
        ],
        fantasyProsAverage: 268
      },
      "jordan james": {
        name: "Jordan James",
        team: "SF",
        position: "RB",
        fantasyProsRank: 269,
        fantasyProsExpertRanks: [
          240,
          248
        ],
        fantasyProsAverage: 269
      },
      "jake tonges": {
        name: "Jake Tonges",
        team: "SF",
        position: "TE",
        fantasyProsRank: 270,
        fantasyProsExpertRanks: [
          248,
          218
        ],
        fantasyProsAverage: 270
      },
      "harrison butker": {
        name: "Harrison Butker",
        team: "KC",
        position: "K",
        fantasyProsRank: 271,
        fantasyProsExpertRanks: [
          240,
          256
        ],
        fantasyProsAverage: 271
      },
      "elic ayomanor": {
        name: "Elic Ayomanor",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 272,
        fantasyProsExpertRanks: [
          283,
          198
        ],
        fantasyProsAverage: 272
      },
      "chris boswell": {
        name: "Chris Boswell",
        team: "PIT",
        position: "K",
        fantasyProsRank: 273,
        fantasyProsExpertRanks: [
          248,
          252
        ],
        fantasyProsAverage: 273
      },
      "alvin kamara": {
        name: "Alvin Kamara",
        team: "NO",
        position: "RB",
        fantasyProsRank: 274,
        fantasyProsExpertRanks: [
          204,
          285
        ],
        fantasyProsAverage: 274
      },
      "charlie smyth": {
        name: "Charlie Smyth",
        team: "NO",
        position: "K",
        fantasyProsRank: 275,
        fantasyProsExpertRanks: [
          248
        ],
        fantasyProsAverage: 275
      },
      "carson beck": {
        name: "Carson Beck",
        team: "ARI",
        position: "QB",
        fantasyProsRank: 276,
        fantasyProsExpertRanks: [
          239,
          256
        ],
        fantasyProsAverage: 276
      },
      "ja'kobi lane": {
        name: "Ja'Kobi Lane",
        team: "BAL",
        position: "WR",
        fantasyProsRank: 277,
        fantasyProsExpertRanks: [
          169,
          319
        ],
        fantasyProsAverage: 277
      },
      "tyler bass": {
        name: "Tyler Bass",
        team: "BUF",
        position: "K",
        fantasyProsRank: 278,
        fantasyProsExpertRanks: [
          254,
          250
        ],
        fantasyProsAverage: 278
      },
      "theo johnson": {
        name: "Theo Johnson",
        team: "NYG",
        position: "TE",
        fantasyProsRank: 279,
        fantasyProsExpertRanks: [
          262,
          229
        ],
        fantasyProsAverage: 279
      },
      "tyquan thornton": {
        name: "Tyquan Thornton",
        team: "KC",
        position: "WR",
        fantasyProsRank: 280,
        fantasyProsExpertRanks: [
          244,
          246
        ],
        fantasyProsAverage: 280
      },
      "kendre miller": {
        name: "Kendre Miller",
        team: "NO",
        position: "RB",
        fantasyProsRank: 281,
        fantasyProsExpertRanks: [
          284,
          223
        ],
        fantasyProsAverage: 281
      },
      "joey slye": {
        name: "Joey Slye",
        team: "TEN",
        position: "K",
        fantasyProsRank: 282,
        fantasyProsExpertRanks: [
          254
        ],
        fantasyProsAverage: 282
      },
      "blake grupe": {
        name: "Blake Grupe",
        team: "IND",
        position: "K",
        fantasyProsRank: 283,
        fantasyProsExpertRanks: [
          258
        ],
        fantasyProsAverage: 283
      },
      "keon coleman": {
        name: "Keon Coleman",
        team: "BUF",
        position: "WR",
        fantasyProsRank: 284,
        fantasyProsExpertRanks: [
          292,
          212
        ],
        fantasyProsAverage: 284
      },
      "jack strand": {
        name: "Jack Strand",
        team: "ATL",
        position: "QB",
        fantasyProsRank: 285,
        fantasyProsExpertRanks: [
          267,
          242
        ],
        fantasyProsAverage: 285
      },
      "emmett johnson": {
        name: "Emmett Johnson",
        team: "KC",
        position: "RB",
        fantasyProsRank: 286,
        fantasyProsExpertRanks: [
          224,
          283
        ],
        fantasyProsAverage: 286
      },
      "chad ryland": {
        name: "Chad Ryland",
        team: "ARI",
        position: "K",
        fantasyProsRank: 287,
        fantasyProsExpertRanks: [
          260
        ],
        fantasyProsAverage: 287
      },
      "jack bech": {
        name: "Jack Bech",
        team: "LV",
        position: "WR",
        fantasyProsRank: 288,
        fantasyProsExpertRanks: [
          274,
          234
        ],
        fantasyProsAverage: 288
      },
      "mason taylor": {
        name: "Mason Taylor",
        team: "NYJ",
        position: "TE",
        fantasyProsRank: 289,
        fantasyProsExpertRanks: [
          269,
          224
        ],
        fantasyProsAverage: 289
      },
      "will reichard": {
        name: "Will Reichard",
        team: "MIN",
        position: "K",
        fantasyProsRank: 290,
        fantasyProsExpertRanks: [
          252,
          266
        ],
        fantasyProsAverage: 290
      },
      "ollie gordon ii": {
        name: "Ollie Gordon II",
        team: "MIA",
        position: "RB",
        fantasyProsRank: 291,
        fantasyProsExpertRanks: [
          272,
          236
        ],
        fantasyProsAverage: 291
      },
      "jake elliott": {
        name: "Jake Elliott",
        team: "PHI",
        position: "K",
        fantasyProsRank: 292,
        fantasyProsExpertRanks: [
          262
        ],
        fantasyProsAverage: 292
      },
      "kyle williams": {
        name: "Kyle Williams",
        team: "NE",
        position: "WR",
        fantasyProsRank: 293,
        fantasyProsExpertRanks: [
          286,
          227
        ],
        fantasyProsAverage: 293
      },
      "trey smack": {
        name: "Trey Smack",
        team: "GB",
        position: "K",
        fantasyProsRank: 294,
        fantasyProsExpertRanks: [
          264
        ],
        fantasyProsAverage: 294
      },
      "anthony richardson sr.": {
        name: "Anthony Richardson Sr.",
        team: "IND",
        position: "QB",
        fantasyProsRank: 295,
        fantasyProsExpertRanks: [
          215
        ],
        fantasyProsAverage: 295
      },
      "elijah sarratt": {
        name: "Elijah Sarratt",
        team: "BAL",
        position: "WR",
        fantasyProsRank: 296,
        fantasyProsExpertRanks: [
          271,
          247
        ],
        fantasyProsAverage: 296
      },
      "george holani": {
        name: "George Holani",
        team: "SEA",
        position: "RB",
        fantasyProsRank: 297,
        fantasyProsExpertRanks: [
          232,
          278
        ],
        fantasyProsAverage: 297
      },
      "ryan fitzgerald": {
        name: "Ryan Fitzgerald",
        team: "CAR",
        position: "K",
        fantasyProsRank: 298,
        fantasyProsExpertRanks: [
          268
        ],
        fantasyProsAverage: 298
      },
      "mike gesicki": {
        name: "Mike Gesicki",
        team: "CIN",
        position: "TE",
        fantasyProsRank: 299,
        fantasyProsExpertRanks: [
          276,
          250
        ],
        fantasyProsAverage: 299
      },
      "daniel carlson": {
        name: "Daniel Carlson",
        team: "NO",
        position: "K",
        fantasyProsRank: 300,
        fantasyProsExpertRanks: [
          270
        ],
        fantasyProsAverage: 300
      },
      "darius slayton": {
        name: "Darius Slayton",
        team: "NYG",
        position: "WR",
        fantasyProsRank: 301,
        fantasyProsExpertRanks: [
          307,
          217
        ],
        fantasyProsAverage: 301
      },
      "tyrone tracy jr.": {
        name: "Tyrone Tracy Jr.",
        team: "NYG",
        position: "RB",
        fantasyProsRank: 302,
        fantasyProsExpertRanks: [
          316,
          195
        ],
        fantasyProsAverage: 302
      },
      "nick folk": {
        name: "Nick Folk",
        team: "ATL",
        position: "K",
        fantasyProsRank: 303,
        fantasyProsExpertRanks: [
          272
        ],
        fantasyProsAverage: 303
      },
      "joe milton iii": {
        name: "Joe Milton III",
        team: "DAL",
        position: "QB",
        fantasyProsRank: 304,
        fantasyProsExpertRanks: [
          228
        ],
        fantasyProsAverage: 304
      },
      "caleb douglas": {
        name: "Caleb Douglas",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 305,
        fantasyProsExpertRanks: [
          205,
          321
        ],
        fantasyProsAverage: 305
      },
      "ben sauls": {
        name: "Ben Sauls",
        team: "NYG",
        position: "K",
        fantasyProsRank: 306,
        fantasyProsExpertRanks: [
          274
        ],
        fantasyProsAverage: 306
      },
      "jaydon blue": {
        name: "Jaydon Blue",
        team: "DAL",
        position: "RB",
        fantasyProsRank: 307,
        fantasyProsExpertRanks: [
          208,
          310
        ],
        fantasyProsAverage: 307
      },
      "david njoku": {
        name: "David Njoku",
        team: "LAC",
        position: "TE",
        fantasyProsRank: 308,
        fantasyProsExpertRanks: [
          290,
          240
        ],
        fantasyProsAverage: 308
      },
      "jake moody": {
        name: "Jake Moody",
        team: null,
        position: "K",
        fantasyProsRank: 309,
        fantasyProsExpertRanks: [
          276
        ],
        fantasyProsAverage: 309
      },
      "tory horton": {
        name: "Tory Horton",
        team: "SEA",
        position: "WR",
        fantasyProsRank: 310,
        fantasyProsExpertRanks: [
          289,
          238
        ],
        fantasyProsAverage: 310
      },
      "andre szmyt": {
        name: "Andre Szmyt",
        team: "CLE",
        position: "K",
        fantasyProsRank: 311,
        fantasyProsExpertRanks: [
          278
        ],
        fantasyProsAverage: 311
      },
      "marvin mims jr.": {
        name: "Marvin Mims Jr.",
        team: "DEN",
        position: "WR",
        fantasyProsRank: 312,
        fantasyProsExpertRanks: [
          304,
          230
        ],
        fantasyProsAverage: 312
      },
      "devin neal": {
        name: "Devin Neal",
        team: "NO",
        position: "RB",
        fantasyProsRank: 313,
        fantasyProsExpertRanks: [
          288,
          231
        ],
        fantasyProsAverage: 313
      },
      "jason sanders": {
        name: "Jason Sanders",
        team: "NYJ",
        position: "K",
        fantasyProsRank: 314,
        fantasyProsExpertRanks: [
          280
        ],
        fantasyProsAverage: 314
      },
      "drew allar": {
        name: "Drew Allar",
        team: "PIT",
        position: "QB",
        fantasyProsRank: 315,
        fantasyProsExpertRanks: [
          288,
          249
        ],
        fantasyProsAverage: 315
      },
      "brandon mcmanus": {
        name: "Brandon McManus",
        team: null,
        position: "K",
        fantasyProsRank: 316,
        fantasyProsExpertRanks: [
          282
        ],
        fantasyProsAverage: 316
      },
      "germie bernard": {
        name: "Germie Bernard",
        team: "PIT",
        position: "WR",
        fantasyProsRank: 317,
        fantasyProsExpertRanks: [
          223,
          313
        ],
        fantasyProsAverage: 317
      },
      "eli stowers": {
        name: "Eli Stowers",
        team: "PHI",
        position: "TE",
        fantasyProsRank: 318,
        fantasyProsExpertRanks: [
          318,
          235
        ],
        fantasyProsAverage: 318
      },
      "emanuel wilson": {
        name: "Emanuel Wilson",
        team: "SEA",
        position: "RB",
        fantasyProsRank: 319,
        fantasyProsExpertRanks: [
          308,
          226
        ],
        fantasyProsAverage: 319
      },
      "spencer shrader": {
        name: "Spencer Shrader",
        team: "IND",
        position: "K",
        fantasyProsRank: 320,
        fantasyProsExpertRanks: [
          284
        ],
        fantasyProsAverage: 320
      },
      "treylon burks": {
        name: "Treylon Burks",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 321,
        fantasyProsExpertRanks: [
          343,
          194
        ],
        fantasyProsAverage: 321
      },
      "matt gay": {
        name: "Matt Gay",
        team: "LV",
        position: "K",
        fantasyProsRank: 322,
        fantasyProsExpertRanks: [
          286
        ],
        fantasyProsAverage: 322
      },
      "marcus mariota": {
        name: "Marcus Mariota",
        team: "WAS",
        position: "QB",
        fantasyProsRank: 323,
        fantasyProsExpertRanks: [
          246
        ],
        fantasyProsAverage: 323
      },
      "isaiah davis": {
        name: "Isaiah Davis",
        team: "NYJ",
        position: "RB",
        fantasyProsRank: 324,
        fantasyProsExpertRanks: [
          304,
          233
        ],
        fantasyProsAverage: 324
      },
      "cade york": {
        name: "Cade York",
        team: null,
        position: "K",
        fantasyProsRank: 325,
        fantasyProsExpertRanks: [
          288
        ],
        fantasyProsAverage: 325
      },
      "mack hollins": {
        name: "Mack Hollins",
        team: "NE",
        position: "WR",
        fantasyProsRank: 326,
        fantasyProsExpertRanks: [
          301,
          237
        ],
        fantasyProsAverage: 326
      },
      "michael mayer": {
        name: "Michael Mayer",
        team: "LV",
        position: "TE",
        fantasyProsRank: 327,
        fantasyProsExpertRanks: [
          255
        ],
        fantasyProsAverage: 327
      },
      "riley patterson": {
        name: "Riley Patterson",
        team: "MIA",
        position: "K",
        fantasyProsRank: 328,
        fantasyProsExpertRanks: [
          290
        ],
        fantasyProsAverage: 328
      },
      "cedric tillman": {
        name: "Cedric Tillman",
        team: null,
        position: "WR",
        fantasyProsRank: 329,
        fantasyProsExpertRanks: [
          334,
          232
        ],
        fantasyProsAverage: 329
      },
      "samaje perine": {
        name: "Samaje Perine",
        team: "CIN",
        position: "RB",
        fantasyProsRank: 330,
        fantasyProsExpertRanks: [
          248,
          299
        ],
        fantasyProsAverage: 330
      },
      "taylen green": {
        name: "Taylen Green",
        team: "CLE",
        position: "QB",
        fantasyProsRank: 331,
        fantasyProsExpertRanks: [
          281,
          263
        ],
        fantasyProsAverage: 331
      },
      "xavier legette": {
        name: "Xavier Legette",
        team: "CAR",
        position: "WR",
        fantasyProsRank: 332,
        fantasyProsExpertRanks: [
          316,
          252
        ],
        fantasyProsAverage: 332
      },
      "malik davis": {
        name: "Malik Davis",
        team: "DAL",
        position: "RB",
        fantasyProsRank: 333,
        fantasyProsExpertRanks: [
          300,
          257
        ],
        fantasyProsAverage: 333
      },
      "max klare": {
        name: "Max Klare",
        team: "LAR",
        position: "TE",
        fantasyProsRank: 334,
        fantasyProsExpertRanks: [
          304,
          274
        ],
        fantasyProsAverage: 334
      },
      "chris bell": {
        name: "Chris Bell",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 335,
        fantasyProsExpertRanks: [
          259,
          309
        ],
        fantasyProsAverage: 335
      },
      "justice hill": {
        name: "Justice Hill",
        team: "BAL",
        position: "RB",
        fantasyProsRank: 336,
        fantasyProsExpertRanks: [
          276,
          290
        ],
        fantasyProsAverage: 336
      },
      "jahan dotson": {
        name: "Jahan Dotson",
        team: "ATL",
        position: "WR",
        fantasyProsRank: 337,
        fantasyProsExpertRanks: [
          229
        ],
        fantasyProsAverage: 337
      },
      "cole payton": {
        name: "Cole Payton",
        team: "PHI",
        position: "QB",
        fantasyProsRank: 338,
        fantasyProsExpertRanks: [
          274,
          291
        ],
        fantasyProsAverage: 338
      },
      "brandon aiyuk": {
        name: "Brandon Aiyuk",
        team: "SF",
        position: "WR",
        fantasyProsRank: 339,
        fantasyProsExpertRanks: [
          265,
          305
        ],
        fantasyProsAverage: 339
      },
      "brashard smith": {
        name: "Brashard Smith",
        team: "KC",
        position: "RB",
        fantasyProsRank: 340,
        fantasyProsExpertRanks: [
          320,
          251
        ],
        fantasyProsAverage: 340
      },
      "darren waller": {
        name: "Darren Waller",
        team: "CAR",
        position: "TE",
        fantasyProsRank: 341,
        fantasyProsExpertRanks: [
          283
        ],
        fantasyProsAverage: 341
      },
      "andrei iosivas": {
        name: "Andrei Iosivas",
        team: "CIN",
        position: "WR",
        fantasyProsRank: 342,
        fantasyProsExpertRanks: [
          331,
          243
        ],
        fantasyProsAverage: 342
      },
      "seth mcgowan": {
        name: "Seth McGowan",
        team: "IND",
        position: "RB",
        fantasyProsRank: 343,
        fantasyProsExpertRanks: [
          256,
          319
        ],
        fantasyProsAverage: 343
      },
      "cade klubnik": {
        name: "Cade Klubnik",
        team: "NYJ",
        position: "QB",
        fantasyProsRank: 344,
        fantasyProsExpertRanks: [
          270
        ],
        fantasyProsAverage: 344
      },
      "antonio williams": {
        name: "Antonio Williams",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 345,
        fantasyProsExpertRanks: [
          268,
          307
        ],
        fantasyProsAverage: 345
      },
      "darnell washington": {
        name: "Darnell Washington",
        team: "PIT",
        position: "TE",
        fantasyProsRank: 346,
        fantasyProsExpertRanks: [
          297
        ],
        fantasyProsAverage: 346
      },
      "ty johnson": {
        name: "Ty Johnson",
        team: "BUF",
        position: "RB",
        fantasyProsRank: 347,
        fantasyProsExpertRanks: [
          324,
          253
        ],
        fantasyProsAverage: 347
      },
      "isaiah bond": {
        name: "Isaiah Bond",
        team: "CLE",
        position: "WR",
        fantasyProsRank: 348,
        fantasyProsExpertRanks: [
          322,
          254
        ],
        fantasyProsAverage: 348
      },
      "miller moss": {
        name: "Miller Moss",
        team: "CHI",
        position: "QB",
        fantasyProsRank: 349,
        fantasyProsExpertRanks: [
          277
        ],
        fantasyProsAverage: 349
      },
      "hollywood brown": {
        name: "Hollywood Brown",
        team: "PHI",
        position: "WR",
        fantasyProsRank: 350,
        fantasyProsExpertRanks: [
          319,
          269
        ],
        fantasyProsAverage: 350
      },
      "demond claiborne": {
        name: "Demond Claiborne",
        team: "MIN",
        position: "RB",
        fantasyProsRank: 351,
        fantasyProsExpertRanks: [
          268,
          322
        ],
        fantasyProsAverage: 351
      },
      "justin joly": {
        name: "Justin Joly",
        team: "DEN",
        position: "TE",
        fantasyProsRank: 352,
        fantasyProsExpertRanks: [
          325,
          286
        ],
        fantasyProsAverage: 352
      },
      "demario douglas": {
        name: "DeMario Douglas",
        team: "NE",
        position: "WR",
        fantasyProsRank: 353,
        fantasyProsExpertRanks: [
          313,
          284
        ],
        fantasyProsAverage: 353
      },
      "jaleel mclaughlin": {
        name: "Jaleel McLaughlin",
        team: "DEN",
        position: "RB",
        fantasyProsRank: 354,
        fantasyProsExpertRanks: [
          352,
          244
        ],
        fantasyProsAverage: 354
      },
      "skyler bell": {
        name: "Skyler Bell",
        team: "BUF",
        position: "WR",
        fantasyProsRank: 355,
        fantasyProsExpertRanks: [
          280,
          317
        ],
        fantasyProsAverage: 355
      },
      "garrett nussmeier": {
        name: "Garrett Nussmeier",
        team: "KC",
        position: "QB",
        fantasyProsRank: 356,
        fantasyProsExpertRanks: [
          295,
          284
        ],
        fantasyProsAverage: 356
      },
      "emari demercado": {
        name: "Emari Demercado",
        team: "KC",
        position: "RB",
        fantasyProsRank: 357,
        fantasyProsExpertRanks: [
          312,
          292
        ],
        fantasyProsAverage: 357
      },
      "calvin austin iii": {
        name: "Calvin Austin III",
        team: "NYG",
        position: "WR",
        fantasyProsRank: 358,
        fantasyProsExpertRanks: [
          337,
          263
        ],
        fantasyProsAverage: 358
      },
      "tyler higbee": {
        name: "Tyler Higbee",
        team: "LAR",
        position: "TE",
        fantasyProsRank: 359,
        fantasyProsExpertRanks: [
          311
        ],
        fantasyProsAverage: 359
      },
      "tez johnson": {
        name: "Tez Johnson",
        team: "TB",
        position: "WR",
        fantasyProsRank: 360,
        fantasyProsExpertRanks: [
          325,
          275
        ],
        fantasyProsAverage: 360
      },
      "kaleb johnson": {
        name: "Kaleb Johnson",
        team: "PIT",
        position: "RB",
        fantasyProsRank: 361,
        fantasyProsExpertRanks: [
          368,
          239
        ],
        fantasyProsAverage: 361
      },
      "malik benson": {
        name: "Malik Benson",
        team: "LV",
        position: "WR",
        fantasyProsRank: 362,
        fantasyProsExpertRanks: [
          310,
          294
        ],
        fantasyProsAverage: 362
      },
      "lequint allen jr.": {
        name: "LeQuint Allen Jr.",
        team: "JAX",
        position: "RB",
        fantasyProsRank: 363,
        fantasyProsExpertRanks: [
          336,
          271
        ],
        fantasyProsAverage: 363
      },
      "oscar delp": {
        name: "Oscar Delp",
        team: "NO",
        position: "TE",
        fantasyProsRank: 364,
        fantasyProsExpertRanks: [
          367,
          270
        ],
        fantasyProsAverage: 364
      },
      "ted hurst": {
        name: "Ted Hurst",
        team: "TB",
        position: "WR",
        fantasyProsRank: 365,
        fantasyProsExpertRanks: [
          295,
          315
        ],
        fantasyProsAverage: 365
      },
      "trevor etienne": {
        name: "Trevor Etienne",
        team: "CAR",
        position: "RB",
        fantasyProsRank: 366,
        fantasyProsExpertRanks: [
          348,
          268
        ],
        fantasyProsAverage: 366
      },
      "olamide zaccheaus": {
        name: "Olamide Zaccheaus",
        team: "ATL",
        position: "WR",
        fantasyProsRank: 367,
        fantasyProsExpertRanks: [
          340,
          280
        ],
        fantasyProsAverage: 367
      },
      "eli raridon": {
        name: "Eli Raridon",
        team: "NE",
        position: "TE",
        fantasyProsRank: 368,
        fantasyProsExpertRanks: [
          374,
          266
        ],
        fantasyProsAverage: 368
      },
      "savion williams": {
        name: "Savion Williams",
        team: "GB",
        position: "WR",
        fantasyProsRank: 369,
        fantasyProsExpertRanks: [
          241
        ],
        fantasyProsAverage: 369
      },
      "dj giddens": {
        name: "DJ Giddens",
        team: "IND",
        position: "RB",
        fantasyProsRank: 370,
        fantasyProsExpertRanks: [
          360,
          259
        ],
        fantasyProsAverage: 370
      },
      "tutu atwell": {
        name: "Tutu Atwell",
        team: "LAR",
        position: "WR",
        fantasyProsRank: 371,
        fantasyProsExpertRanks: [
          346,
          289
        ],
        fantasyProsAverage: 371
      },
      "adam randall": {
        name: "Adam Randall",
        team: "BAL",
        position: "RB",
        fantasyProsRank: 372,
        fantasyProsExpertRanks: [
          292,
          328
        ],
        fantasyProsAverage: 372
      },
      "demarcus robinson": {
        name: "Demarcus Robinson",
        team: "SF",
        position: "WR",
        fantasyProsRank: 373,
        fantasyProsExpertRanks: [
          298
        ],
        fantasyProsAverage: 373
      },
      "elijah arroyo": {
        name: "Elijah Arroyo",
        team: "SEA",
        position: "TE",
        fantasyProsRank: 374,
        fantasyProsExpertRanks: [
          332
        ],
        fantasyProsAverage: 374
      },
      "chris brooks": {
        name: "Chris Brooks",
        team: "GB",
        position: "RB",
        fantasyProsRank: 375,
        fantasyProsExpertRanks: [
          344,
          281
        ],
        fantasyProsAverage: 375
      },
      "xavier hutchinson": {
        name: "Xavier Hutchinson",
        team: "HOU",
        position: "WR",
        fantasyProsRank: 376,
        fantasyProsExpertRanks: [
          256
        ],
        fantasyProsAverage: 376
      },
      "konata mumpfield": {
        name: "Konata Mumpfield",
        team: "LAR",
        position: "WR",
        fantasyProsRank: 377,
        fantasyProsExpertRanks: [
          258
        ],
        fantasyProsAverage: 377
      },
      "audric estime": {
        name: "Audric Estime",
        team: "NO",
        position: "RB",
        fantasyProsRank: 378,
        fantasyProsExpertRanks: [
          372,
          262
        ],
        fantasyProsAverage: 378
      },
      "noah gray": {
        name: "Noah Gray",
        team: "KC",
        position: "TE",
        fantasyProsRank: 379,
        fantasyProsExpertRanks: [
          339
        ],
        fantasyProsAverage: 379
      },
      "kevin coleman jr.": {
        name: "Kevin Coleman Jr.",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 380,
        fantasyProsExpertRanks: [
          352,
          293
        ],
        fantasyProsAverage: 380
      },
      "jarquez hunter": {
        name: "Jarquez Hunter",
        team: "MIA",
        position: "RB",
        fantasyProsRank: 381,
        fantasyProsExpertRanks: [
          380,
          265
        ],
        fantasyProsAverage: 381
      },
      "luke mccaffrey": {
        name: "Luke McCaffrey",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 382,
        fantasyProsExpertRanks: [
          267
        ],
        fantasyProsAverage: 382
      },
      "jerome ford": {
        name: "Jerome Ford",
        team: "WAS",
        position: "RB",
        fantasyProsRank: 383,
        fantasyProsExpertRanks: [
          328,
          317
        ],
        fantasyProsAverage: 383
      },
      "ja'tavion sanders": {
        name: "Ja'Tavion Sanders",
        team: "CAR",
        position: "TE",
        fantasyProsRank: 384,
        fantasyProsExpertRanks: [
          346
        ],
        fantasyProsAverage: 384
      },
      "brenen thompson": {
        name: "Brenen Thompson",
        team: "LAC",
        position: "WR",
        fantasyProsRank: 385,
        fantasyProsExpertRanks: [
          328,
          325
        ],
        fantasyProsAverage: 385
      },
      "dont'e thornton jr.": {
        name: "Dont'e Thornton Jr.",
        team: "LV",
        position: "WR",
        fantasyProsRank: 386,
        fantasyProsExpertRanks: [
          272
        ],
        fantasyProsAverage: 386
      },
      "isaac guerendo": {
        name: "Isaac Guerendo",
        team: "SF",
        position: "RB",
        fantasyProsRank: 387,
        fantasyProsExpertRanks: [
          332,
          316
        ],
        fantasyProsAverage: 387
      },
      "jalen royals": {
        name: "Jalen Royals",
        team: "KC",
        position: "WR",
        fantasyProsRank: 388,
        fantasyProsExpertRanks: [
          273
        ],
        fantasyProsAverage: 388
      },
      "zach ertz": {
        name: "Zach Ertz",
        team: null,
        position: "TE",
        fantasyProsRank: 389,
        fantasyProsExpertRanks: [
          353
        ],
        fantasyProsAverage: 389
      },
      "kaelon black": {
        name: "Kaelon Black",
        team: "SF",
        position: "RB",
        fantasyProsRank: 390,
        fantasyProsExpertRanks: [
          340,
          318
        ],
        fantasyProsAverage: 390
      },
      "tyreek hill": {
        name: "Tyreek Hill",
        team: null,
        position: "WR",
        fantasyProsRank: 391,
        fantasyProsExpertRanks: [
          358,
          303
        ],
        fantasyProsAverage: 391
      },
      "bam knight": {
        name: "Bam Knight",
        team: "ARI",
        position: "RB",
        fantasyProsRank: 392,
        fantasyProsExpertRanks: [
          384,
          276
        ],
        fantasyProsAverage: 392
      },
      "john metchie iii": {
        name: "John Metchie III",
        team: "CAR",
        position: "WR",
        fantasyProsRank: 393,
        fantasyProsExpertRanks: [
          277
        ],
        fantasyProsAverage: 393
      },
      "tommy myers": {
        name: "Tommy Myers",
        team: null,
        position: "TE",
        fantasyProsRank: 394,
        fantasyProsExpertRanks: [
          255
        ],
        fantasyProsAverage: 394
      },
      "colbie young": {
        name: "Colbie Young",
        team: "CIN",
        position: "WR",
        fantasyProsRank: 395,
        fantasyProsExpertRanks: [
          361,
          301
        ],
        fantasyProsAverage: 395
      },
      "dylan laube": {
        name: "Dylan Laube",
        team: "LV",
        position: "RB",
        fantasyProsRank: 396,
        fantasyProsExpertRanks: [
          392,
          274
        ],
        fantasyProsAverage: 396
      },
      "joshua palmer": {
        name: "Joshua Palmer",
        team: "BUF",
        position: "WR",
        fantasyProsRank: 397,
        fantasyProsExpertRanks: [
          279
        ],
        fantasyProsAverage: 397
      },
      "tahj brooks": {
        name: "Tahj Brooks",
        team: "CIN",
        position: "RB",
        fantasyProsRank: 398,
        fantasyProsExpertRanks: [
          364,
          304
        ],
        fantasyProsAverage: 398
      },
      "john bates": {
        name: "John Bates",
        team: "WAS",
        position: "TE",
        fantasyProsRank: 399,
        fantasyProsExpertRanks: [
          260
        ],
        fantasyProsAverage: 399
      },
      "jaylin lane": {
        name: "Jaylin Lane",
        team: "WAS",
        position: "WR",
        fantasyProsRank: 400,
        fantasyProsExpertRanks: [
          282
        ],
        fantasyProsAverage: 400
      },
      "trey benson": {
        name: "Trey Benson",
        team: "ARI",
        position: "RB",
        fantasyProsRank: 401,
        fantasyProsExpertRanks: [
          356,
          314
        ],
        fantasyProsAverage: 401
      },
      "xavier restrepo": {
        name: "Xavier Restrepo",
        team: "TEN",
        position: "WR",
        fantasyProsRank: 402,
        fantasyProsExpertRanks: [
          286
        ],
        fantasyProsAverage: 402
      },
      "theo wease jr.": {
        name: "Theo Wease Jr.",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 403,
        fantasyProsExpertRanks: [
          287
        ],
        fantasyProsAverage: 403
      },
      "kareem hunt": {
        name: "Kareem Hunt",
        team: null,
        position: "RB",
        fantasyProsRank: 404,
        fantasyProsExpertRanks: [
          376,
          295
        ],
        fantasyProsAverage: 404
      },
      "noah fant": {
        name: "Noah Fant",
        team: "NO",
        position: "TE",
        fantasyProsRank: 405,
        fantasyProsExpertRanks: [
          360
        ],
        fantasyProsAverage: 405
      },
      "brandin cooks": {
        name: "Brandin Cooks",
        team: null,
        position: "WR",
        fantasyProsRank: 406,
        fantasyProsExpertRanks: [
          291
        ],
        fantasyProsAverage: 406
      },
      "joe mixon": {
        name: "Joe Mixon",
        team: null,
        position: "RB",
        fantasyProsRank: 407,
        fantasyProsExpertRanks: [
          388,
          288
        ],
        fantasyProsAverage: 407
      },
      "chris brazzell ii": {
        name: "Chris Brazzell II",
        team: "CAR",
        position: "WR",
        fantasyProsRank: 408,
        fantasyProsExpertRanks: [
          367,
          311
        ],
        fantasyProsAverage: 408
      },
      "michael trigg": {
        name: "Michael Trigg",
        team: "DAL",
        position: "TE",
        fantasyProsRank: 409,
        fantasyProsExpertRanks: [
          395,
          282
        ],
        fantasyProsAverage: 409
      },
      "michael carter": {
        name: "Michael Carter",
        team: "TEN",
        position: "RB",
        fantasyProsRank: 410,
        fantasyProsExpertRanks: [
          297
        ],
        fantasyProsAverage: 410
      },
      "tai felton": {
        name: "Tai Felton",
        team: "MIN",
        position: "WR",
        fantasyProsRank: 411,
        fantasyProsExpertRanks: [
          296
        ],
        fantasyProsAverage: 411
      },
      "antwane wells jr.": {
        name: "Antwane Wells Jr.",
        team: "ATL",
        position: "WR",
        fantasyProsRank: 412,
        fantasyProsExpertRanks: [
          298
        ],
        fantasyProsAverage: 412
      },
      "nick chubb": {
        name: "Nick Chubb",
        team: null,
        position: "RB",
        fantasyProsRank: 413,
        fantasyProsExpertRanks: [
          302
        ],
        fantasyProsAverage: 413
      },
      "sam roush": {
        name: "Sam Roush",
        team: "CHI",
        position: "TE",
        fantasyProsRank: 414,
        fantasyProsExpertRanks: [
          402,
          278
        ],
        fantasyProsAverage: 414
      },
      "julian fleming": {
        name: "Julian Fleming",
        team: null,
        position: "WR",
        fantasyProsRank: 415,
        fantasyProsExpertRanks: [
          300
        ],
        fantasyProsAverage: 415
      },
      "jawhar jordan": {
        name: "Jawhar Jordan",
        team: "HOU",
        position: "RB",
        fantasyProsRank: 416,
        fantasyProsExpertRanks: [
          306
        ],
        fantasyProsAverage: 416
      },
      "jalen tolbert": {
        name: "Jalen Tolbert",
        team: "MIA",
        position: "WR",
        fantasyProsRank: 417,
        fantasyProsExpertRanks: [
          349
        ],
        fantasyProsAverage: 417
      },
      "will shipley": {
        name: "Will Shipley",
        team: "PHI",
        position: "RB",
        fantasyProsRank: 418,
        fantasyProsExpertRanks: [
          308
        ],
        fantasyProsAverage: 418
      },
      "kavontae turpin": {
        name: "KaVontae Turpin",
        team: "DAL",
        position: "WR",
        fantasyProsRank: 419,
        fantasyProsExpertRanks: [
          355
        ],
        fantasyProsAverage: 419
      },
      "dawson knox": {
        name: "Dawson Knox",
        team: "BUF",
        position: "TE",
        fantasyProsRank: 420,
        fantasyProsExpertRanks: [
          381
        ],
        fantasyProsAverage: 420
      },
      "eric mcalister": {
        name: "Eric McAlister",
        team: null,
        position: "WR",
        fantasyProsRank: 421,
        fantasyProsExpertRanks: [
          373,
          323
        ],
        fantasyProsAverage: 421
      },
      "austin ekeler": {
        name: "Austin Ekeler",
        team: null,
        position: "RB",
        fantasyProsRank: 422,
        fantasyProsExpertRanks: [
          309
        ],
        fantasyProsAverage: 422
      },
      "zavion thomas": {
        name: "Zavion Thomas",
        team: "CHI",
        position: "WR",
        fantasyProsRank: 423,
        fantasyProsExpertRanks: [
          364,
          337
        ],
        fantasyProsAverage: 423
      },
      "eli heidenreich": {
        name: "Eli Heidenreich",
        team: "PIT",
        position: "RB",
        fantasyProsRank: 424,
        fantasyProsExpertRanks: [
          396,
          325
        ],
        fantasyProsAverage: 424
      },
      "cole kmet": {
        name: "Cole Kmet",
        team: "CHI",
        position: "TE",
        fantasyProsRank: 425,
        fantasyProsExpertRanks: [
          388
        ],
        fantasyProsAverage: 425
      },
      "deion burks": {
        name: "Deion Burks",
        team: "IND",
        position: "WR",
        fantasyProsRank: 426,
        fantasyProsExpertRanks: [
          376,
          329
        ],
        fantasyProsAverage: 426
      },
      "dameon pierce": {
        name: "Dameon Pierce",
        team: "PHI",
        position: "RB",
        fantasyProsRank: 427,
        fantasyProsExpertRanks: [
          311
        ],
        fantasyProsAverage: 427
      },
      "bryce lance": {
        name: "Bryce Lance",
        team: "NO",
        position: "WR",
        fantasyProsRank: 428,
        fantasyProsExpertRanks: [
          370,
          335
        ],
        fantasyProsAverage: 428
      },
      "barion brown": {
        name: "Barion Brown",
        team: "NO",
        position: "WR",
        fantasyProsRank: 429,
        fantasyProsExpertRanks: [
          379,
          331
        ],
        fantasyProsAverage: 429
      },
      "antonio gibson": {
        name: "Antonio Gibson",
        team: null,
        position: "RB",
        fantasyProsRank: 430,
        fantasyProsExpertRanks: [
          312
        ],
        fantasyProsAverage: 430
      },
      "tanner koziol": {
        name: "Tanner Koziol",
        team: "JAX",
        position: "TE",
        fantasyProsRank: 431,
        fantasyProsExpertRanks: [
          290
        ],
        fantasyProsAverage: 431
      },
      "cyrus allen": {
        name: "Cyrus Allen",
        team: "KC",
        position: "WR",
        fantasyProsRank: 432,
        fantasyProsExpertRanks: [
          327
        ],
        fantasyProsAverage: 432
      },
      "raheim sanders": {
        name: "Raheim Sanders",
        team: "CLE",
        position: "RB",
        fantasyProsRank: 433,
        fantasyProsExpertRanks: [
          313
        ],
        fantasyProsAverage: 433
      },
      "reggie virgil": {
        name: "Reggie Virgil",
        team: "ARI",
        position: "WR",
        fantasyProsRank: 434,
        fantasyProsExpertRanks: [
          382,
          333
        ],
        fantasyProsAverage: 434
      },
      "jack endries": {
        name: "Jack Endries",
        team: "CIN",
        position: "TE",
        fantasyProsRank: 435,
        fantasyProsExpertRanks: [
          294
        ],
        fantasyProsAverage: 435
      },
      "terrell jennings": {
        name: "Terrell Jennings",
        team: null,
        position: "RB",
        fantasyProsRank: 436,
        fantasyProsExpertRanks: [
          315
        ],
        fantasyProsAverage: 436
      },
      "jam miller": {
        name: "Jam Miller",
        team: "NE",
        position: "RB",
        fantasyProsRank: 437,
        fantasyProsExpertRanks: [
          400,
          327
        ],
        fantasyProsAverage: 437
      },
      "joe royer": {
        name: "Joe Royer",
        team: "CLE",
        position: "TE",
        fantasyProsRank: 438,
        fantasyProsExpertRanks: [
          298
        ],
        fantasyProsAverage: 438
      },
      "roman hemby": {
        name: "Roman Hemby",
        team: "LV",
        position: "RB",
        fantasyProsRank: 439,
        fantasyProsExpertRanks: [
          320
        ],
        fantasyProsAverage: 439
      },
      "jaydn ott": {
        name: "Jaydn Ott",
        team: "KC",
        position: "RB",
        fantasyProsRank: 440,
        fantasyProsExpertRanks: [
          321
        ],
        fantasyProsAverage: 440
      },
      "dallen bentley": {
        name: "Dallen Bentley",
        team: "DEN",
        position: "TE",
        fantasyProsRank: 441,
        fantasyProsExpertRanks: [
          302
        ],
        fantasyProsAverage: 441
      },
      "desmond reid": {
        name: "Desmond Reid",
        team: null,
        position: "RB",
        fantasyProsRank: 442,
        fantasyProsExpertRanks: [
          404,
          329
        ],
        fantasyProsAverage: 442
      },
      "j'mari taylor": {
        name: "J'Mari Taylor",
        team: "JAX",
        position: "RB",
        fantasyProsRank: 443,
        fantasyProsExpertRanks: [
          408,
          326
        ],
        fantasyProsAverage: 443
      },
      "rj maryland": {
        name: "RJ Maryland",
        team: "GB",
        position: "TE",
        fantasyProsRank: 444,
        fantasyProsExpertRanks: [
          306
        ],
        fantasyProsAverage: 444
      },
      "robert henry jr.": {
        name: "Robert Henry Jr.",
        team: "WAS",
        position: "RB",
        fantasyProsRank: 445,
        fantasyProsExpertRanks: [
          323
        ],
        fantasyProsAverage: 445
      },
      "le'veon moss": {
        name: "Le'Veon Moss",
        team: null,
        position: "RB",
        fantasyProsRank: 446,
        fantasyProsExpertRanks: [
          324
        ],
        fantasyProsAverage: 446
      }
    }
  };

  // src/rankingSnapshot.js
  function normalizeName2(name) {
    return String(name || "").toLowerCase().replace(/[’]/g, "'").replace(/[.,]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "").replace(/\s+/g, " ").trim();
  }
  function addRank(byName, player, field) {
    const rank = Number(player?.[field]);
    if (!Number.isFinite(rank) || rank <= 0) return;
    byName[normalizeName2(player.name)] = rank;
  }
  function buildExternalRankingsFromSnapshot(rankingSnapshot = draft_final_default) {
    const fantasyPros = { byName: {} };
    const pfn = { byName: {} };
    const espnDraftRank = { byName: {} };
    for (const player of Object.values(rankingSnapshot?.players || {})) {
      addRank(fantasyPros.byName, player, "fantasyProsRank");
      addRank(pfn.byName, player, "pfnRank");
      addRank(espnDraftRank.byName, player, "espnDraftRank");
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
        espnDraftRank: Object.keys(espnDraftRank.byName).length
      }
    };
  }

  // src/recommendationEngine.js
  var CORE_POSITIONS = ["QB", "RB", "WR", "TE"];
  var FLEX_POSITIONS = /* @__PURE__ */ new Set(["RB", "WR", "TE"]);
  function clamp2(value, min = 0, max = 100) {
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
      Math.max((counts.RB || 0) - config.roster.RB, 0) + Math.max((counts.WR || 0) - config.roster.WR, 0) + Math.max((counts.TE || 0) - config.roster.TE, 0)
    );
  }
  function starterNeed(position, counts, config) {
    const required = config.roster[position] || 0;
    if (!required) return 0;
    const missing = Math.max(required - (counts[position] || 0), 0);
    return clamp2(missing / required * 100);
  }
  function flexNeed(position, counts, config) {
    if (!FLEX_POSITIONS.has(position) || !config.roster.FLEX) return 0;
    if (position === "TE" && (counts.TE || 0) >= config.roster.TE) return 0;
    const missingFlex = Math.max(config.roster.FLEX - flexFilled(counts, config), 0);
    if (missingFlex <= 0) return 0;
    if (position === "TE") return config.strategy.tightEndStrategy?.unfilledFlexNeed ?? 25;
    return 100;
  }
  function depthNeed(position, counts, config) {
    const have = counts[position] || 0;
    if (position === "QB") {
      if (have < config.roster.QB) return 100;
      if (have === config.roster.QB) return 35;
      if (have === config.roster.QB + 1) return 2;
      return 0;
    }
    if (position === "RB") {
      if (have < config.roster.RB) return 100;
      if (have === config.roster.RB) return 55;
      if (have === config.roster.RB + 1) return 45;
      if (have === config.roster.RB + 2) return 30;
      if (have === config.roster.RB + 3) return 8;
      return 0;
    }
    if (position === "WR") {
      if (have < config.roster.WR) return 100;
      if (have === config.roster.WR) return 60;
      if (have <= config.roster.WR + 2) return 50;
      if (have === config.roster.WR + 3) return 35;
      return 18;
    }
    if (position === "TE") {
      if (have < config.roster.TE) return config.strategy.tightEndStrategy?.unfilledDepthNeed ?? 70;
      if (have === config.roster.TE) return 10;
      return 0;
    }
    if (position === "DST") return have < config.roster.DST ? 20 : 0;
    if (position === "K") return have < config.roster.K ? 10 : 0;
    return 0;
  }
  function marketDepletion(position, draftedPicks, config) {
    const drafted = draftedPicks.filter((pick) => normalizePosition(pick.position) === position).length;
    const starterDemand = Math.max(config.teams * (config.roster[position] || 1), 1);
    return clamp2(drafted / starterDemand * 100);
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
    return clamp2(teamsStillNeeding / opponentCount * 100);
  }
  function positionTurnPressure(position, picksUntilFollowingTurn, draftedPicks, myTeamName, config) {
    if (!Number.isFinite(picksUntilFollowingTurn) || picksUntilFollowingTurn <= 0) return 0;
    const demand = opponentDemand(position, draftedPicks, myTeamName, config) / 100;
    const exposure = Math.min(picksUntilFollowingTurn / Math.max(config.teams * 2 - 2, 1), 1);
    return clamp2(demand * exposure * 100);
  }
  function earliestRoundForPosition(position, config) {
    return config.strategy.specialTeamsEarliestRound?.[position] ?? 1;
  }
  function maxRecommendedForPosition(position, config) {
    return config.strategy.maxRecommendedByPosition?.[position] ?? Infinity;
  }
  function isPositionEligible(position, currentRound, config, counts = {}) {
    if (["DST", "K"].includes(position) && currentRound < earliestRoundForPosition(position, config)) return false;
    return (counts[position] || 0) < maxRecommendedForPosition(position, config);
  }
  function findPlayerForPick(pick, players) {
    return players.find(
      (player) => pick.playerId && player.id === pick.playerId || pick.playerName && player.name?.toLowerCase() === pick.playerName.toLowerCase()
    );
  }
  function bestRosterTePositionRank(myPicks, players) {
    const rosteredTeIds = new Set(
      myPicks.filter((pick) => normalizePosition(pick.position) === "TE").map((pick) => findPlayerForPick(pick, players)?.id).filter(Boolean)
    );
    if (!rosteredTeIds.size) return null;
    const rankedTes = players.filter((player) => normalizePosition(player.position) === "TE").sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0));
    let bestRank = Infinity;
    rankedTes.forEach((player, index) => {
      if (rosteredTeIds.has(player.id)) bestRank = Math.min(bestRank, index + 1);
    });
    return Number.isFinite(bestRank) ? bestRank : null;
  }
  function saturationMultiplier(position, counts, config) {
    const settings = config.strategy.saturation?.[position];
    if (!settings) return 1;
    const have = counts[position] || 0;
    if (have < settings.softTarget) return 1;
    return settings.multiplierAfterTarget ?? 1;
  }
  function missingStarterUrgencyMultiplier(position, counts, currentRound, config) {
    const required = config.roster[position] || 0;
    if (!required || (counts[position] || 0) >= required) return 1;
    if (position !== "TE") return 1;
    const curve = config.strategy.tightEndStrategy?.missingStarterUrgency || [];
    const match = curve.find((step) => currentRound <= step.throughRound);
    return match?.multiplier ?? 1;
  }
  function computePositionPriorities({
    draftedPicks,
    myTeamName,
    config,
    players = [],
    picksUntilNextTurn = 0,
    currentRound = 1
  }) {
    const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
    const counts = rosterCounts(myPicks);
    const weights = config.strategy.positionWeights;
    const priorities = {};
    const bestTeRank = bestRosterTePositionRank(myPicks, players);
    for (const position of ["QB", "RB", "WR", "TE", "DST", "K"]) {
      const components = {
        starterNeed: starterNeed(position, counts, config),
        flexNeed: flexNeed(position, counts, config),
        depthNeed: depthNeed(position, counts, config),
        depletion: marketDepletion(position, draftedPicks, config),
        opponentDemand: opponentDemand(position, draftedPicks, myTeamName, config),
        turnPressure: positionTurnPressure(position, picksUntilNextTurn, draftedPicks, myTeamName, config)
      };
      const rawPriority = Object.entries(weights).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0
      );
      const eligible = isPositionEligible(position, currentRound, config, counts);
      const missingStarterUrgency = missingStarterUrgencyMultiplier(position, counts, currentRound, config);
      let priority = eligible ? rawPriority * missingStarterUrgency : 0;
      if (position === "TE" && (counts.TE || 0) >= 1 && eligible) {
        const teStrategy = config.strategy.tightEndStrategy || {};
        const elite = Number.isFinite(bestTeRank) && bestTeRank <= (teStrategy.elitePositionRank ?? 5);
        const cap = elite ? teStrategy.eliteStarterPriorityCap ?? 8 : teStrategy.normalStarterPriorityCap ?? 20;
        priority = Math.min(priority, cap);
        if (currentRound < (teStrategy.backupEarliestRound ?? 10)) priority *= 0.25;
      }
      const saturation = saturationMultiplier(position, counts, config);
      priority *= saturation;
      priorities[position] = {
        position,
        priority: Number(priority.toFixed(2)),
        rawPriority: Number(rawPriority.toFixed(2)),
        missingStarterUrgencyMultiplier: missingStarterUrgency,
        eligible,
        eligibleRound: earliestRoundForPosition(position, config),
        have: counts[position] || 0,
        required: config.roster[position] || 0,
        saturationMultiplier: saturation,
        bestRosterTePositionRank: position === "TE" ? bestTeRank : null,
        components
      };
    }
    return priorities;
  }
  function withinPositionValue(player, positionPlayers) {
    const projected = positionPlayers.filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    const projectionIndex = projected.findIndex((p) => p.id === player.id);
    const projectionScore = projectionIndex < 0 || projected.length <= 1 ? 50 : 100 - projectionIndex / (projected.length - 1) * 100;
    const consensusScore = Number.isFinite(player.consensusValue) ? player.consensusValue : null;
    if (consensusScore === null) return clamp2(projectionScore);
    return clamp2(projectionScore * 0.55 + consensusScore * 0.45);
  }
  function valueOverReplacement(player, positionPlayers, replacementRank) {
    if (!Number.isFinite(player.projectedPoints)) return 50;
    const sorted = [...positionPlayers].filter((p) => Number.isFinite(p.projectedPoints)).sort((a, b) => b.projectedPoints - a.projectedPoints);
    if (!sorted.length) return 50;
    const replacementIndex = Math.min(Math.max(replacementRank - 1, 0), sorted.length - 1);
    const replacement = sorted[replacementIndex]?.projectedPoints ?? 0;
    const leader = sorted[0]?.projectedPoints ?? replacement;
    const range = Math.max(leader - replacement, 1);
    return clamp2((player.projectedPoints - replacement) / range * 100);
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
    return clamp2((current - next) / range * 600);
  }
  function estimateWaitRisk(player, picksUntilFollowingTurn, positionPlayers, positionPriority) {
    if (!Number.isFinite(picksUntilFollowingTurn) || picksUntilFollowingTurn <= 0) return 0;
    const group = [...positionPlayers].sort((a, b) => {
      const aRank = a.consensusRank ?? a.espnRank;
      const bRank = b.consensusRank ?? b.espnRank;
      if (Number.isFinite(aRank) && Number.isFinite(bRank)) return aRank - bRank;
      return (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0);
    });
    const rankWithinPosition = Math.max(group.findIndex((p) => p.id === player.id) + 1, 1);
    const pressure = positionPriority / 100;
    const expectedAtPosition = Math.max(1, picksUntilFollowingTurn * (0.1 + pressure * 0.35));
    if (rankWithinPosition <= expectedAtPosition) return 95;
    return clamp2(95 - (rankWithinPosition - expectedAtPosition) * 11, 5, 95);
  }
  function upsideScore(player, currentRound) {
    let score = 30;
    const outlook = String(player.seasonOutlook || "").toLowerCase();
    const positiveTerms = [
      ["sleeper", 20],
      ["breakout", 20],
      ["upside", 16],
      ["high ceiling", 18],
      ["lottery", 14],
      ["emerge", 10],
      ["rookie", 10],
      ["starting role", 10],
      ["featured", 10]
    ];
    const negativeTerms = [
      ["low ceiling", -18],
      ["limited ceiling", -15],
      ["no more than", -10],
      ["off the short-term fantasy radar", -25],
      ["unlikely to be a fantasy option", -25]
    ];
    for (const [term, points] of positiveTerms) if (outlook.includes(term)) score += points;
    for (const [term, points] of negativeTerms) if (outlook.includes(term)) score += points;
    if (Number.isFinite(player.marketGap)) score += clamp2(player.marketGap, -20, 40) * 0.75;
    if (Number.isFinite(player.percentOwned) && player.percentOwned < 55 && currentRound >= 10) score += 8;
    return clamp2(score);
  }
  function byeTiebreakScore(player, myPicks, players, config) {
    if (!Number.isFinite(player.byeWeek)) return 50;
    let conflicts = 0;
    for (const pick of myPicks) {
      const rostered = findPlayerForPick(pick, players);
      if (rostered?.byeWeek === player.byeWeek) conflicts += 1;
    }
    const settings = config.strategy.byeTiebreaker || {};
    const counted = Math.min(conflicts, settings.maxConflictsCounted ?? 3);
    return clamp2(100 - counted * (settings.conflictPenalty ?? 25));
  }
  function phaseWeights(currentRound, config) {
    const phases = config.strategy.phaseWeights || {};
    if (currentRound <= (phases.early?.throughRound ?? 6)) return phases.early;
    if (currentRound <= (phases.middle?.throughRound ?? 11)) return phases.middle;
    return phases.late;
  }
  function needQualityMultiplier(position, counts, player, withinValue, config) {
    const required = config.roster[position] || 0;
    if (!required || (counts[position] || 0) >= required) return 1;
    if (position !== "TE") return 1;
    const gate = config.strategy.tightEndStrategy?.playerQualityGate;
    if (!gate) return 1;
    const consensus = Number.isFinite(player.consensusValue) ? player.consensusValue : 50;
    const quality = clamp2(consensus * 0.65 + withinValue * 0.35);
    const minimum = gate.minimum ?? 52;
    const fullCredit = Math.max(gate.fullCredit ?? 78, minimum + 1);
    const minimumMultiplier = gate.minimumMultiplier ?? 0.35;
    if (quality >= fullCredit) return 1;
    if (quality <= minimum) return minimumMultiplier;
    const progress = (quality - minimum) / (fullCredit - minimum);
    return minimumMultiplier + progress * (1 - minimumMultiplier);
  }
  function buildDraftState({ players, draftedPicks, myTeamName }) {
    const draftedIds = new Set(draftedPicks.filter((pick) => pick.playerId).map((pick) => pick.playerId));
    const draftedNames = new Set(draftedPicks.map((pick) => pick.playerName?.toLowerCase()).filter(Boolean));
    const available = players.filter(
      (player) => !draftedIds.has(player.id) && !draftedNames.has(player.name?.toLowerCase())
    );
    const myPicks = draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName);
    return { available, myPicks, draftedPicks, lastOverallPick: draftedPicks.at(-1)?.overallPick || 0 };
  }
  function getPicksUntilNextTurn(lastOverallPick, myOverallPicks) {
    const next = myOverallPicks.find((pick) => pick > lastOverallPick);
    if (!next) return { nextPick: null, picksUntil: null };
    return { nextPick: next, picksUntil: Math.max(next - lastOverallPick - 1, 0) };
  }
  function getFollowingPickContext(nextPick, myOverallPicks) {
    if (!Number.isFinite(nextPick)) return { followingPick: null, picksUntilFollowing: null };
    const followingPick = myOverallPicks.find((pick) => pick > nextPick) ?? null;
    if (!Number.isFinite(followingPick)) return { followingPick: null, picksUntilFollowing: null };
    return {
      followingPick,
      picksUntilFollowing: Math.max(followingPick - nextPick - 1, 0)
    };
  }
  function scoreAvailablePlayers({
    players,
    draftedPicks,
    myTeamName,
    config,
    myOverallPicks = []
  }) {
    const state = buildDraftState({ players, draftedPicks, myTeamName });
    const turn = getPicksUntilNextTurn(state.lastOverallPick, myOverallPicks);
    const targetOverallPick = turn.nextPick ?? Math.max(state.lastOverallPick + 1, 1);
    const following = getFollowingPickContext(turn.nextPick, myOverallPicks);
    const currentRound = Math.floor((targetOverallPick - 1) / config.teams) + 1;
    const counts = rosterCounts(state.myPicks);
    const eligibleAvailable = state.available.filter(
      (player) => isPositionEligible(normalizePosition(player.position), currentRound, config, counts)
    );
    const availableByPosition = sortByPosition(eligibleAvailable);
    const baselineByPosition = sortByPosition(players);
    const positionPriorities = computePositionPriorities({
      draftedPicks,
      myTeamName,
      config,
      players,
      picksUntilNextTurn: following.picksUntilFollowing,
      currentRound
    });
    const weights = phaseWeights(currentRound, config);
    const scored = eligibleAvailable.map((player) => {
      const position = normalizePosition(player.position);
      const availablePositionPlayers = availableByPosition[position] || [];
      const baselinePositionPlayers = baselineByPosition[position] || [];
      const basePositionPriority = positionPriorities[position]?.priority || 0;
      const saturation = positionPriorities[position]?.saturationMultiplier ?? 1;
      const withinValue = withinPositionValue(player, baselinePositionPlayers);
      const qualityGate = needQualityMultiplier(position, counts, player, withinValue, config);
      const effectivePositionPriority = basePositionPriority * qualityGate;
      const components = {
        positionPriority: effectivePositionPriority,
        basePositionPriority,
        needQualityMultiplier: qualityGate,
        withinPositionValue: withinValue,
        vor: valueOverReplacement(player, baselinePositionPlayers, config.strategy.replacementRanks[position] || 8),
        consensusValue: Number.isFinite(player.consensusValue) ? player.consensusValue : 50,
        upside: upsideScore(player, currentRound),
        tierDrop: tierDropScore(player, baselinePositionPlayers),
        waitRisk: estimateWaitRisk(
          player,
          following.picksUntilFollowing,
          availablePositionPlayers,
          effectivePositionPriority
        ),
        byeTiebreak: byeTiebreakScore(player, state.myPicks, players, config)
      };
      const baseScore = Object.entries(weights || {}).reduce(
        (total, [key, weight]) => total + (components[key] || 0) * weight,
        0
      );
      const draftScore = baseScore * saturation;
      return {
        ...player,
        position,
        draftScore: Number(draftScore.toFixed(2)),
        components,
        positionPriority: effectivePositionPriority,
        basePositionPriority,
        needQualityMultiplier: qualityGate,
        saturationMultiplier: saturation,
        currentRound,
        nextPick: turn.nextPick,
        picksUntilNextTurn: turn.picksUntil,
        followingPick: following.followingPick,
        picksUntilFollowing: following.picksUntilFollowing
      };
    });
    const waitRiskWindow = config.strategy.decisionContext?.waitRiskScoreWindow ?? 0.75;
    const byeWindow = config.strategy.byeTiebreaker?.scoreWindow ?? 0.75;
    const upsideTiebreakStartsRound = config.strategy.decisionContext?.upsideTiebreakStartsRound ?? 7;
    scored.sort((a, b) => {
      const delta = b.draftScore - a.draftScore;
      if (Math.abs(delta) > waitRiskWindow) return delta;
      const waitDelta = b.components.waitRisk - a.components.waitRisk;
      if (waitDelta !== 0) return waitDelta;
      if (Math.abs(delta) <= byeWindow) {
        const byeDelta = b.components.byeTiebreak - a.components.byeTiebreak;
        if (byeDelta !== 0) return byeDelta;
      }
      if (currentRound >= upsideTiebreakStartsRound) {
        const upsideDelta = b.components.upside - a.components.upside;
        if (upsideDelta !== 0) return upsideDelta;
      }
      return delta;
    });
    scored.positionPriorities = positionPriorities;
    scored.currentRound = currentRound;
    scored.phaseWeights = weights;
    scored.nextPick = turn.nextPick;
    scored.followingPick = following.followingPick;
    scored.picksUntilFollowing = following.picksUntilFollowing;
    return scored;
  }

  // src/strategyRecommendationEngine.js
  var TEAM_DIVERSITY_POSITIONS = /* @__PURE__ */ new Set(["RB", "WR", "TE"]);
  function normalizePosition2(position) {
    return position === "D/ST" ? "DST" : position;
  }
  function normalizeNflTeam(team) {
    return typeof team === "string" ? team.trim().toUpperCase() : "";
  }
  function rosterCounts2(draftedPicks, myTeamName) {
    return draftedPicks.filter((pick) => pick.fantasyTeam === myTeamName).reduce((counts, pick) => {
      const position = normalizePosition2(pick.position);
      counts[position] = (counts[position] || 0) + 1;
      return counts;
    }, {});
  }
  function occupiedSkillPositionTeams(draftedPicks, myTeamName) {
    const occupied = /* @__PURE__ */ new Set();
    for (const pick of draftedPicks || []) {
      if (pick.fantasyTeam !== myTeamName) continue;
      const position = normalizePosition2(pick.position);
      const nflTeam = normalizeNflTeam(pick.nflTeam);
      if (!TEAM_DIVERSITY_POSITIONS.has(position) || !nflTeam) continue;
      occupied.add(`${position}|${nflTeam}`);
    }
    return occupied;
  }
  function violatesSkillPositionTeamDiversity(player, occupied) {
    const position = normalizePosition2(player.position);
    const nflTeam = normalizeNflTeam(player.nflTeam);
    if (!TEAM_DIVERSITY_POSITIONS.has(position) || !nflTeam) return false;
    return occupied.has(`${position}|${nflTeam}`);
  }
  function depthUpsideMultiplier(position, have, config) {
    const rules = config.strategy.depthUpside?.[position] || [];
    const match = rules.find((rule) => have >= (rule.minHave ?? 0) && have <= (rule.maxHave ?? Infinity));
    return match?.multiplier ?? 1;
  }
  function resort(scored, config) {
    const waitRiskWindow = config.strategy.decisionContext?.waitRiskScoreWindow ?? 0.75;
    const byeWindow = config.strategy.byeTiebreaker?.scoreWindow ?? 0.75;
    const upsideTiebreakStartsRound = config.strategy.decisionContext?.upsideTiebreakStartsRound ?? 7;
    const currentRound = scored.currentRound ?? 1;
    scored.sort((a, b) => {
      const delta = b.draftScore - a.draftScore;
      if (Math.abs(delta) > waitRiskWindow) return delta;
      const waitDelta = b.components.waitRisk - a.components.waitRisk;
      if (waitDelta !== 0) return waitDelta;
      if (Math.abs(delta) <= byeWindow) {
        const byeDelta = b.components.byeTiebreak - a.components.byeTiebreak;
        if (byeDelta !== 0) return byeDelta;
      }
      if (currentRound >= upsideTiebreakStartsRound) {
        const upsideDelta = b.components.upside - a.components.upside;
        if (upsideDelta !== 0) return upsideDelta;
      }
      return delta;
    });
  }
  function scoreAvailablePlayers2(args) {
    const scored = scoreAvailablePlayers(args);
    const { draftedPicks, myTeamName, config } = args;
    const counts = rosterCounts2(draftedPicks, myTeamName);
    const occupied = occupiedSkillPositionTeams(draftedPicks, myTeamName);
    const upsideWeight = Number(scored.phaseWeights?.upside || 0);
    for (let index = scored.length - 1; index >= 0; index -= 1) {
      if (violatesSkillPositionTeamDiversity(scored[index], occupied)) scored.splice(index, 1);
    }
    for (const player of scored) {
      const position = normalizePosition2(player.position);
      const have = counts[position] || 0;
      const baseUpside = Number(player.components.upside || 0);
      const multiplier = depthUpsideMultiplier(position, have, config);
      const adjustedUpside = Math.max(0, Math.min(100, baseUpside * multiplier));
      const saturation = Number(player.saturationMultiplier ?? 1);
      const delta = (adjustedUpside - baseUpside) * upsideWeight * saturation;
      player.draftScore = Number((player.draftScore + delta).toFixed(2));
      player.components.upsideBase = baseUpside;
      player.components.upsideMultiplier = multiplier;
      player.components.upside = adjustedUpside;
    }
    resort(scored, config);
    return scored;
  }
  function simulatedPick(player, overallPick, myTeamName, config) {
    const round = Math.floor((overallPick - 1) / config.teams) + 1;
    const roundPick = (overallPick - 1) % config.teams + 1;
    return {
      overallPick,
      round,
      roundPick,
      playerId: player.id,
      playerName: player.name,
      nflTeam: player.nflTeam,
      position: player.position,
      fantasyTeam: myTeamName,
      simulated: true
    };
  }
  function recommendPairs({
    scoredPlayers,
    players,
    draftedPicks,
    myTeamName,
    config,
    myOverallPicks = [],
    limit = 14,
    secondCandidateLimit = 8
  }) {
    const nextPick = scoredPlayers.nextPick ?? scoredPlayers[0]?.nextPick ?? null;
    if (!Number.isFinite(nextPick)) return [];
    const followingPick = myOverallPicks.find((pick) => pick > nextPick) ?? null;
    if (followingPick !== nextPick + 1) return [];
    const firstCandidates = scoredPlayers.slice(0, limit);
    const pairs = [];
    for (const first of firstCandidates) {
      const simulatedDraft = [
        ...draftedPicks,
        simulatedPick(first, nextPick, myTeamName, config)
      ];
      const secondBoard = scoreAvailablePlayers2({
        players,
        draftedPicks: simulatedDraft,
        myTeamName,
        config,
        myOverallPicks
      });
      for (const second of secondBoard.slice(0, secondCandidateLimit)) {
        if (second.id === first.id) continue;
        let synergy = 0;
        if (first.position !== second.position) synergy += 2;
        if (["DST", "K"].includes(first.position) || ["DST", "K"].includes(second.position)) synergy -= 15;
        const pairScore = first.draftScore + second.draftScore + synergy;
        pairs.push({
          first,
          second,
          pairScore: Number(pairScore.toFixed(2)),
          secondScoreAfterFirst: second.draftScore,
          simulatedAfterFirst: true
        });
      }
    }
    return pairs.sort((a, b) => b.pairScore - a.pairScore);
  }

  // src/aiReranker.js
  var DEFAULT_POLICY = [
    "Reorder only the supplied candidates. Never introduce another player.",
    "Respect deterministic eligibility and roster caps. The deterministic engine remains authoritative for who is eligible.",
    "QB1/QB2 prioritize reliable starter quality and consensus; QB3 may favor upside.",
    "RB1/RB2 prioritize starter quality; RB3/RB4 may favor ceiling and breakout paths; RB5+ requires exceptional value.",
    "WR1-WR3 prioritize starter quality; WR4+ may favor ceiling and breakout paths.",
    "TE2 is value/insurance, not a default priority.",
    "DST and K remain subject to deterministic round gates.",
    "Prefer the candidate that best improves this roster now when deterministic scores are close."
  ];
  function normalizePosition3(position) {
    return position === "D/ST" ? "DST" : position;
  }
  function rosterCounts3(draftedPicks, myTeamName) {
    const counts = {};
    for (const pick of draftedPicks || []) {
      if (pick.fantasyTeam !== myTeamName) continue;
      const position = normalizePosition3(pick.position);
      counts[position] = (counts[position] || 0) + 1;
    }
    return counts;
  }
  function latestDraftPick(draftedPicks) {
    let latest = null;
    for (const pick of draftedPicks || []) {
      const overallPick = Number(pick?.overallPick);
      if (!Number.isFinite(overallPick)) continue;
      if (!latest || overallPick > Number(latest.overallPick)) latest = pick;
    }
    return latest;
  }
  function isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config }) {
    if (String(config?.draftType || "").toUpperCase() !== "SNAKE") return false;
    const latest = latestDraftPick(draftedPicks);
    if (!latest || latest.fantasyTeam !== config?.myTeamName) return false;
    const nextPick = Number(scoredPlayers?.nextPick ?? scoredPlayers?.[0]?.nextPick);
    const latestOverallPick = Number(latest.overallPick);
    return Number.isFinite(nextPick) && Number.isFinite(latestOverallPick) && nextPick === latestOverallPick + 1;
  }
  function shouldRunAiRerank({ scoredPlayers, draftedPicks, config }) {
    if (String(config?.draftType || "").toUpperCase() !== "SNAKE") return false;
    const nextPick = Number(scoredPlayers?.nextPick ?? scoredPlayers?.[0]?.nextPick);
    if (!Number.isFinite(nextPick)) return false;
    const latest = latestDraftPick(draftedPicks);
    const latestOverallPick = Number(latest?.overallPick ?? 0);
    const onClock = nextPick === latestOverallPick + 1;
    if (!onClock) return false;
    return !isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config });
  }
  function candidatePayload(player, deterministicRank) {
    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      deterministicRank,
      draftScore: player.draftScore,
      consensusRank: player.consensusRank,
      consensusValue: player.consensusValue,
      projectedPoints: player.projectedPoints,
      averageDraftPosition: player.averageDraftPosition,
      marketGap: player.marketGap,
      positionPriority: player.positionPriority,
      upside: player.components?.upside,
      upsideBase: player.components?.upsideBase,
      upsideMultiplier: player.components?.upsideMultiplier,
      vor: player.components?.vor,
      withinPositionValue: player.components?.withinPositionValue,
      tierDrop: player.components?.tierDrop,
      waitRisk: player.components?.waitRisk,
      byeWeek: player.byeWeek
    };
  }
  function buildAiRerankPayload({
    scoredPlayers,
    draftedPicks,
    myTeamName,
    config,
    candidateLimit = 8
  }) {
    const candidates = scoredPlayers.slice(0, candidateLimit);
    const counts = rosterCounts3(draftedPicks, myTeamName);
    const myRoster = (draftedPicks || []).filter((pick) => pick.fantasyTeam === myTeamName).map((pick) => ({
      playerId: pick.playerId,
      playerName: pick.playerName,
      position: normalizePosition3(pick.position),
      overallPick: pick.overallPick
    }));
    return {
      task: "Rerank these fantasy-football draft candidates for the current roster state. Rank the players independently; the application will build the two-pick snake-turn pair after your ranking.",
      rules: DEFAULT_POLICY,
      responseFormat: {
        rankings: [{ playerId: "candidate playerId", reason: "short reason", confidence: 0 }],
        summary: "optional short explanation of the player ranking"
      },
      league: {
        teams: config.teams,
        draftType: config.draftType,
        roster: config.roster,
        scoring: config.scoring
      },
      draftContext: {
        currentRound: scoredPlayers.currentRound ?? candidates[0]?.currentRound ?? null,
        nextPick: scoredPlayers.nextPick ?? candidates[0]?.nextPick ?? null,
        followingPick: scoredPlayers.followingPick ?? candidates[0]?.followingPick ?? null,
        picksUntilFollowing: scoredPlayers.picksUntilFollowing ?? candidates[0]?.picksUntilFollowing ?? null,
        rosterCounts: counts,
        myRoster
      },
      candidates: candidates.map((player, index) => candidatePayload(player, index + 1))
    };
  }
  function normalizeRankingItems(response) {
    if (Array.isArray(response)) return response.map((item) => typeof item === "object" ? item : { playerId: item });
    if (Array.isArray(response?.rankings)) return response.rankings;
    return [];
  }
  function applyAiRerank(scoredPlayers, response, candidateLimit = 8) {
    const candidateSlice = scoredPlayers.slice(0, candidateLimit);
    const tail = scoredPlayers.slice(candidateLimit);
    const candidateById = new Map(candidateSlice.map((player) => [String(player.id), player]));
    const used = /* @__PURE__ */ new Set();
    const reranked = [];
    const decisions = [];
    for (const item of normalizeRankingItems(response)) {
      const key = String(item?.playerId ?? "");
      if (!candidateById.has(key) || used.has(key)) continue;
      const player = candidateById.get(key);
      used.add(key);
      reranked.push(player);
      decisions.push({
        playerId: player.id,
        playerName: player.name,
        reason: typeof item?.reason === "string" ? item.reason : null,
        confidence: Number.isFinite(Number(item?.confidence)) ? Number(item.confidence) : null
      });
    }
    for (const player of candidateSlice) {
      const key = String(player.id);
      if (used.has(key)) continue;
      reranked.push(player);
      decisions.push({ playerId: player.id, playerName: player.name, reason: null, confidence: null });
    }
    const combined = [...reranked, ...tail];
    for (const key of ["positionPriorities", "currentRound", "phaseWeights", "nextPick", "followingPick", "picksUntilFollowing"]) combined[key] = scoredPlayers[key];
    return {
      scoredPlayers: combined,
      decisions: decisions.map((decision, index) => ({ ...decision, aiRank: index + 1 })),
      summary: typeof response?.summary === "string" ? response.summary : null
    };
  }
  function deriveTurnPairFromAiRanking(scoredPlayers, pairs = []) {
    const first = scoredPlayers?.[0];
    if (!first || !pairs.length) return null;
    const matching = pairs.filter((pair) => String(pair.first?.id) === String(first.id));
    if (!matching.length) return null;
    return matching.reduce((best, pair) => !best || pair.pairScore > best.pairScore ? pair : best, null);
  }
  function withTurnPairSummary(applied, pairs, modelSummary) {
    const recommendedPair = deriveTurnPairFromAiRanking(applied.scoredPlayers, pairs);
    if (!recommendedPair) {
      return { ...applied, recommendedPair: null, summary: modelSummary || applied.summary };
    }
    const pairSummary = `Recommended turn: ${recommendedPair.first.name} + ${recommendedPair.second.name}.`;
    return {
      ...applied,
      recommendedPair,
      summary: modelSummary ? `${pairSummary} ${modelSummary}` : pairSummary
    };
  }
  async function endpointProvider(endpoint, payload, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`AI reranker timed out after ${timeoutMs}ms`)), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const text = await response.text();
      let body = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = null;
        }
      }
      if (!response.ok) {
        const detail = body?.error || text || `HTTP ${response.status}`;
        throw new Error(`AI reranker endpoint returned ${response.status}: ${detail}`);
      }
      if (!body) throw new Error("AI reranker endpoint returned an empty or invalid JSON response.");
      return body;
    } finally {
      clearTimeout(timer);
    }
  }
  async function rerankWithAi({ scoredPlayers, pairs = [], draftedPicks, myTeamName, config, provider = null }) {
    const settings = config.strategy?.aiReranker || {};
    const candidateLimit = settings.candidateLimit ?? 8;
    if (settings.enabled === false) return { status: "disabled", scoredPlayers, payload: null, decisions: [], recommendedPair: null, summary: null };
    if (isSecondPickOfSnakeTurn({ scoredPlayers, draftedPicks, config })) {
      return { status: "skipped_pair_followup", scoredPlayers, payload: null, decisions: [], recommendedPair: null, summary: null };
    }
    if (!shouldRunAiRerank({ scoredPlayers, draftedPicks, config })) {
      return { status: "skipped_not_on_clock", scoredPlayers, payload: null, decisions: [], recommendedPair: null, summary: null };
    }
    const livePairs = pairs.length ? pairs : typeof window !== "undefined" ? window.__fantasyDraftHelper?.state?.pairs || [] : [];
    const payload = buildAiRerankPayload({ scoredPlayers, draftedPicks, myTeamName, config, candidateLimit });
    const effectiveProvider = typeof provider === "function" ? provider : settings.endpoint ? (input) => endpointProvider(settings.endpoint, input, settings.timeoutMs ?? 1e4) : null;
    if (!effectiveProvider) return { status: "unavailable", scoredPlayers, payload, decisions: [], recommendedPair: null, summary: null };
    try {
      const response = await effectiveProvider(payload);
      const applied = applyAiRerank(scoredPlayers, response, candidateLimit);
      const paired = withTurnPairSummary(applied, livePairs, response?.summary);
      return { status: "applied", payload, rawResponse: response, ...paired };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        scoredPlayers,
        payload,
        decisions: [],
        recommendedPair: null,
        summary: null
      };
    }
  }

  // src/index.js
  var HELPER_VERSION = "0.5.0-ai-reranker";
  function printRecommendations(scored, pairs, count = 10) {
    console.group(`Fantasy Draft Helper ${HELPER_VERSION}`);
    console.log(`Round ${scored.currentRound} scoring phase`, scored.phaseWeights);
    const positionPriorities = scored.positionPriorities || {};
    console.log("Position priorities");
    console.table(
      Object.values(positionPriorities).sort((a, b) => b.priority - a.priority).map((item) => ({
        position: item.position,
        priority: item.priority,
        have: item.have,
        required: item.required,
        starterUrgency: item.missingStarterUrgencyMultiplier,
        saturation: item.saturationMultiplier,
        starterNeed: Number(item.components.starterNeed.toFixed(1)),
        flexNeed: Number(item.components.flexNeed.toFixed(1)),
        depthNeed: Number(item.components.depthNeed.toFixed(1)),
        depletion: Number(item.components.depletion.toFixed(1)),
        opponentDemand: Number(item.components.opponentDemand.toFixed(1)),
        turnPressure: Number(item.components.turnPressure.toFixed(1))
      }))
    );
    console.log("Deterministic recommendations");
    console.table(
      scored.slice(0, count).map((player, index) => ({
        rank: index + 1,
        player: player.name,
        position: player.position,
        bye: player.byeWeek,
        score: player.draftScore,
        positionPriority: Number(player.positionPriority.toFixed(1)),
        basePositionPriority: Number((player.basePositionPriority ?? player.positionPriority).toFixed(1)),
        needQuality: Number((player.needQualityMultiplier ?? 1).toFixed(2)),
        consensusRank: player.consensusRank,
        sources: player.consensusSourceCount,
        fantasyPros: player.consensusSourceRanks?.fantasyPros ?? null,
        espnBoard: player.consensusSourceRanks?.espnDraftRank ?? null,
        espnApi: player.consensusSourceRanks?.espnRank ?? null,
        projected: player.projectedPoints,
        adp: player.averageDraftPosition,
        upside: Number(player.components.upside.toFixed(1)),
        upsideBase: Number((player.components.upsideBase ?? player.components.upside).toFixed(1)),
        upsideMult: Number((player.components.upsideMultiplier ?? 1).toFixed(2)),
        vor: Number(player.components.vor.toFixed(1)),
        waitRisk: Number(player.components.waitRisk.toFixed(1)),
        byeTie: Number(player.components.byeTiebreak.toFixed(1)),
        saturation: player.saturationMultiplier
      }))
    );
    if (pairs.length) {
      console.log("Best sequential turn pairs");
      console.table(
        pairs.slice(0, 5).map((pair, index) => ({
          rank: index + 1,
          pair: `${pair.first.name} + ${pair.second.name}`,
          positions: `${pair.first.position}/${pair.second.position}`,
          firstScore: pair.first.draftScore,
          secondScoreAfterFirst: pair.secondScoreAfterFirst,
          pairScore: pair.pairScore
        }))
      );
    } else {
      console.log("No immediate two-pick turn pair at this selection.");
    }
    console.groupEnd();
  }
  function printAiRerank(aiResult, deterministicScored) {
    if (aiResult.status !== "applied") return;
    const deterministicRank = new Map(
      deterministicScored.map((player, index) => [String(player.id), index + 1])
    );
    const decisionById = new Map(
      (aiResult.decisions || []).map((decision) => [String(decision.playerId), decision])
    );
    console.group(`AI reranker \u2014 Round ${aiResult.scoredPlayers.currentRound}`);
    console.table(
      aiResult.scoredPlayers.slice(0, aiResult.decisions.length || 8).map((player, index) => {
        const decision = decisionById.get(String(player.id));
        return {
          aiRank: index + 1,
          deterministicRank: deterministicRank.get(String(player.id)),
          player: player.name,
          position: player.position,
          score: player.draftScore,
          consensusRank: player.consensusRank,
          upside: Number(player.components.upside.toFixed(1)),
          reason: decision?.reason || "",
          confidence: decision?.confidence ?? ""
        };
      })
    );
    if (aiResult.summary) console.log(aiResult.summary);
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
      rawPriority: item.rawPriority,
      missingStarterUrgencyMultiplier: item.missingStarterUrgencyMultiplier,
      have: item.have,
      required: item.required,
      saturationMultiplier: item.saturationMultiplier,
      ...item.components
    }));
    const recommendations = scored.slice(0, 20).map((player, index) => ({
      rank: index + 1,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      byeWeek: player.byeWeek,
      projectedPoints: player.projectedPoints,
      espnRank: player.espnRank,
      averageDraftPosition: player.averageDraftPosition,
      consensusRank: player.consensusRank,
      consensusValue: player.consensusValue,
      consensusSourceCount: player.consensusSourceCount,
      consensusSourceRanks: player.consensusSourceRanks,
      marketGap: player.marketGap,
      draftScore: player.draftScore,
      positionPriority: player.positionPriority,
      basePositionPriority: player.basePositionPriority,
      needQualityMultiplier: player.needQualityMultiplier,
      saturationMultiplier: player.saturationMultiplier,
      ...player.components
    }));
    const pairRecommendations = pairs.slice(0, 10).map((pair, index) => ({
      rank: index + 1,
      firstPlayer: pair.first.name,
      firstPosition: pair.first.position,
      firstScore: pair.first.draftScore,
      secondPlayer: pair.second.name,
      secondPosition: pair.second.position,
      secondScoreAfterFirst: pair.secondScoreAfterFirst,
      pairScore: pair.pairScore,
      sequentialSimulation: pair.simulatedAfterFirst === true
    }));
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      afterOverallPick: lastPick?.overallPick ?? 0,
      lastPick,
      nextPick,
      picksUntilNextTurn,
      followingPick: scored.followingPick ?? null,
      picksUntilFollowing: scored.picksUntilFollowing ?? null,
      currentRound: scored.currentRound,
      scoringPhaseWeights: scored.phaseWeights,
      myRoster,
      positionPriorities,
      recommendations,
      pairRecommendations,
      aiRerank: null
    };
  }
  function serializeAiRerank(aiResult, deterministicScored) {
    if (!aiResult) return null;
    const deterministicRank = new Map(
      deterministicScored.map((player, index) => [String(player.id), index + 1])
    );
    return {
      status: aiResult.status,
      error: aiResult.error || null,
      summary: aiResult.summary || null,
      candidateLimit: aiResult.payload?.candidates?.length ?? 0,
      rankings: aiResult.status === "applied" ? aiResult.scoredPlayers.slice(0, aiResult.decisions.length).map((player, index) => {
        const decision = aiResult.decisions.find((item) => String(item.playerId) === String(player.id));
        return {
          aiRank: index + 1,
          deterministicRank: deterministicRank.get(String(player.id)) ?? null,
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          draftScore: player.draftScore,
          reason: decision?.reason || null,
          confidence: decision?.confidence ?? null
        };
      }) : []
    };
  }
  function historyToCsv(history) {
    const headers = [
      "timestamp",
      "afterOverallPick",
      "nextPick",
      "picksUntilNextTurn",
      "followingPick",
      "picksUntilFollowing",
      "currentRound",
      "recommendationRank",
      "playerId",
      "playerName",
      "position",
      "byeWeek",
      "draftScore",
      "positionPriority",
      "basePositionPriority",
      "needQualityMultiplier",
      "saturationMultiplier",
      "projectedPoints",
      "espnRank",
      "averageDraftPosition",
      "consensusRank",
      "consensusValue",
      "consensusSourceCount",
      "fantasyProsRank",
      "espnDraftRank",
      "marketGap",
      "upside",
      "upsideBase",
      "upsideMultiplier",
      "vor",
      "withinPositionValue",
      "tierDrop",
      "waitRisk",
      "byeTiebreak",
      "aiRank",
      "aiReason",
      "aiConfidence"
    ];
    const rows = [headers.join(",")];
    for (const snapshot of history) {
      const aiById = new Map((snapshot.aiRerank?.rankings || []).map((item) => [String(item.playerId), item]));
      for (const rec of snapshot.recommendations) {
        const ai = aiById.get(String(rec.playerId));
        rows.push([
          snapshot.timestamp,
          snapshot.afterOverallPick,
          snapshot.nextPick,
          snapshot.picksUntilNextTurn,
          snapshot.followingPick,
          snapshot.picksUntilFollowing,
          snapshot.currentRound,
          rec.rank,
          rec.playerId,
          rec.playerName,
          rec.position,
          rec.byeWeek,
          rec.draftScore,
          rec.positionPriority,
          rec.basePositionPriority,
          rec.needQualityMultiplier,
          rec.saturationMultiplier,
          rec.projectedPoints,
          rec.espnRank,
          rec.averageDraftPosition,
          rec.consensusRank,
          rec.consensusValue,
          rec.consensusSourceCount,
          rec.consensusSourceRanks?.fantasyPros,
          rec.consensusSourceRanks?.espnDraftRank,
          rec.marketGap,
          rec.upside,
          rec.upsideBase,
          rec.upsideMultiplier,
          rec.vor,
          rec.withinPositionValue,
          rec.tierDrop,
          rec.waitRisk,
          rec.byeTiebreak,
          ai?.aiRank,
          ai?.reason,
          ai?.confidence
        ].map(csvEscape).join(","));
      }
    }
    return rows.join("\n");
  }
  function mergeConfig(overrides = {}) {
    return {
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
        replacementRanks: {
          ...LEAGUE_CONFIG.strategy.replacementRanks,
          ...overrides.strategy?.replacementRanks || {}
        },
        depthUpside: {
          ...LEAGUE_CONFIG.strategy.depthUpside,
          ...overrides.strategy?.depthUpside || {}
        },
        aiReranker: {
          ...LEAGUE_CONFIG.strategy.aiReranker,
          ...overrides.strategy?.aiReranker || {}
        },
        consensus: {
          ...LEAGUE_CONFIG.strategy.consensus,
          ...overrides.strategy?.consensus || {},
          sourceWeights: {
            ...LEAGUE_CONFIG.strategy.consensus.sourceWeights,
            ...overrides.strategy?.consensus?.sourceWeights || {}
          }
        },
        tightEndStrategy: {
          ...LEAGUE_CONFIG.strategy.tightEndStrategy,
          ...overrides.strategy?.tightEndStrategy || {},
          playerQualityGate: {
            ...LEAGUE_CONFIG.strategy.tightEndStrategy.playerQualityGate,
            ...overrides.strategy?.tightEndStrategy?.playerQualityGate || {}
          }
        },
        phaseWeights: {
          ...LEAGUE_CONFIG.strategy.phaseWeights,
          ...overrides.strategy?.phaseWeights || {}
        },
        decisionContext: {
          ...LEAGUE_CONFIG.strategy.decisionContext,
          ...overrides.strategy?.decisionContext || {}
        }
      }
    };
  }
  function mergeExternalRankings(base = {}, override = {}) {
    const merged = { ...base };
    for (const [sourceName, source] of Object.entries(override || {})) {
      merged[sourceName] = {
        ...merged[sourceName] || {},
        ...source || {},
        byId: { ...merged[sourceName]?.byId || {}, ...source?.byId || {} },
        byName: { ...merged[sourceName]?.byName || {}, ...source?.byName || {} }
      };
    }
    return merged;
  }
  async function startDraftHelper(overrides = {}) {
    const config = mergeConfig(overrides);
    console.log(`Starting Fantasy Draft Helper ${HELPER_VERSION}`);
    console.log("Loading ESPN player pool...");
    const espnPlayers = await fetchEspnPlayerPool({ leagueId: config.leagueId, season: config.season });
    const snapshotBundle = buildExternalRankingsFromSnapshot(overrides.rankingSnapshot || draft_final_default);
    const runtimeRankings = overrides.externalRankings || window.__fantasyConsensusData || {};
    const externalRankings = mergeExternalRankings(snapshotBundle.externalRankings, runtimeRankings);
    const players = applyConsensusModel(espnPlayers, {
      sourceWeights: config.strategy.consensus.sourceWeights,
      rankCeiling: config.strategy.consensus.rankCeiling,
      externalRankings
    });
    console.log(
      `Loaded ${players.length} players. Static ranking snapshot ${snapshotBundle.rankingSnapshot.generatedAt || "unknown date"}; FantasyPros matches: ${snapshotBundle.sourceSummary.fantasyPros}; ESPN-board matches: ${snapshotBundle.sourceSummary.espnDraftRank}.`
    );
    console.log(`Consensus sources configured: ${["fantasyPros", "espnDraftRank", "marketAdp", "espnRank"].join(", ")}.`);
    const myOverallPicks = getMySnakePicks(18, config);
    const history = [];
    let watcher;
    let rerankRequestId = 0;
    let rerankerAvailabilityLogged = false;
    const getAiProvider = () => overrides.aiReranker || window.__fantasyAiReranker || null;
    const runAiRerank = async ({ requestId, draftedPicks, deterministicScored, pairs, afterOverallPick }) => {
      const aiResult = await rerankWithAi({
        scoredPlayers: deterministicScored,
        draftedPicks,
        myTeamName: config.myTeamName,
        config,
        provider: getAiProvider()
      });
      if (requestId !== rerankRequestId) return;
      if (window.__fantasyDraftHelper.state?.afterOverallPick !== afterOverallPick) return;
      if (aiResult.status === "unavailable") {
        if (!rerankerAvailabilityLogged) {
          console.info(
            "AI reranker is wired but no provider is configured. Set window.__fantasyAiReranker(payload) before starting, pass { aiReranker } to startFantasyDraftHelper(), or configure strategy.aiReranker.endpoint."
          );
          rerankerAvailabilityLogged = true;
        }
        return;
      }
      const currentSnapshot = history.find((item) => item.afterOverallPick === afterOverallPick);
      if (currentSnapshot) currentSnapshot.aiRerank = serializeAiRerank(aiResult, deterministicScored);
      const activeScored = aiResult.status === "applied" ? aiResult.scoredPlayers : deterministicScored;
      window.__fantasyDraftHelper.state = {
        ...window.__fantasyDraftHelper.state,
        scored: activeScored,
        deterministicScored,
        aiRerank: serializeAiRerank(aiResult, deterministicScored),
        pairs,
        history
      };
      if (aiResult.status === "applied") printAiRerank(aiResult, deterministicScored);
      else if (aiResult.status === "error") console.warn("AI reranker failed; deterministic ranking preserved:", aiResult.error);
    };
    const recalculate = () => {
      const requestId = ++rerankRequestId;
      const draftedPicks = watcher.getPicks();
      const deterministicScored = scoreAvailablePlayers2({
        players,
        draftedPicks,
        myTeamName: config.myTeamName,
        config,
        myOverallPicks
      });
      const pairs = recommendPairs({
        scoredPlayers: deterministicScored,
        players,
        draftedPicks,
        myTeamName: config.myTeamName,
        config,
        myOverallPicks
      });
      const snapshot = buildHistorySnapshot({
        draftedPicks,
        scored: deterministicScored,
        pairs,
        myTeamName: config.myTeamName
      });
      const prior = history.at(-1);
      if (!prior || prior.afterOverallPick !== snapshot.afterOverallPick) history.push(snapshot);
      else history[history.length - 1] = snapshot;
      window.__fantasyDraftHelper.state = {
        version: HELPER_VERSION,
        afterOverallPick: snapshot.afterOverallPick,
        draftedPicks,
        scored: deterministicScored,
        deterministicScored,
        aiRerank: null,
        pairs,
        positionPriorities: deterministicScored.positionPriorities,
        myOverallPicks,
        history
      };
      printRecommendations(deterministicScored, pairs);
      void runAiRerank({
        requestId,
        draftedPicks,
        deterministicScored,
        pairs,
        afterOverallPick: snapshot.afterOverallPick
      });
      return window.__fantasyDraftHelper.state;
    };
    watcher = createEspnDraftWatcher({ teams: config.teams, onPick: () => recalculate() });
    watcher.start();
    window.__fantasyDraftHelper = {
      version: HELPER_VERSION,
      config,
      players,
      rankingSnapshot: snapshotBundle.rankingSnapshot,
      externalRankings,
      watcher,
      state: null,
      history,
      recalculate,
      exportLogs(filename = `fantasy-draft-${Date.now()}.json`) {
        const payload = {
          version: HELPER_VERSION,
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          rankingSnapshot: {
            generatedAt: snapshotBundle.rankingSnapshot.generatedAt,
            format: snapshotBundle.rankingSnapshot.format,
            sourceSummary: snapshotBundle.sourceSummary
          },
          consensusSources: ["fantasyPros", "espnDraftRank", "marketAdp", "espnRank"],
          aiReranker: {
            enabled: config.strategy.aiReranker?.enabled !== false,
            candidateLimit: config.strategy.aiReranker?.candidateLimit ?? 8,
            endpointConfigured: Boolean(config.strategy.aiReranker?.endpoint),
            providerConfigured: Boolean(getAiProvider())
          },
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
        rerankRequestId += 1;
        console.log(`Fantasy Draft Helper ${HELPER_VERSION} stopped.`);
      }
    };
    recalculate();
    return window.__fantasyDraftHelper;
  }
  if (typeof window !== "undefined") window.startFantasyDraftHelper = startDraftHelper;
  return __toCommonJS(index_exports);
})();
