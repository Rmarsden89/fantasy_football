const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE', 'DP', 'DST', 'K'];

function quantile(sortedValues, q) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function freshAuctionRecords(records = []) {
  return records.filter((record) => record && record.isKeeper !== true && Number.isFinite(Number(record.price)));
}

export function keeperRecords(records = []) {
  return records.filter((record) => record && record.isKeeper === true && Number.isFinite(Number(record.price)));
}

export function buildPositionMarketSummary(records = []) {
  const fresh = freshAuctionRecords(records);
  const positions = [...new Set(fresh.map((record) => record.position).filter(Boolean))]
    .sort((a, b) => {
      const aIndex = POSITION_ORDER.indexOf(a);
      const bIndex = POSITION_ORDER.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  return positions.map((position) => {
    const positionRecords = fresh.filter((record) => record.position === position);
    const prices = positionRecords.map((record) => Number(record.price)).sort((a, b) => a - b);
    const descending = [...prices].sort((a, b) => b - a);

    return {
      position,
      sampleSize: prices.length,
      seasons: [...new Set(positionRecords.map((record) => record.season))].sort((a, b) => a - b),
      minimum: prices[0] ?? null,
      q25: quantile(prices, 0.25),
      median: quantile(prices, 0.5),
      q75: quantile(prices, 0.75),
      maximum: prices.at(-1) ?? null,
      average: mean(prices),
      top1: descending[0] ?? null,
      top3Average: mean(descending.slice(0, 3)),
      top5Average: mean(descending.slice(0, 5)),
      top10Average: mean(descending.slice(0, 10)),
      count50Plus: prices.filter((price) => price >= 50).length,
      count70Plus: prices.filter((price) => price >= 70).length,
      count80Plus: prices.filter((price) => price >= 80).length,
      countDollarPlayers: prices.filter((price) => price === 1).length,
    };
  });
}

export function buildSeasonMarketSummary(records = []) {
  const fresh = freshAuctionRecords(records);
  const seasons = [...new Set(fresh.map((record) => record.season))].sort((a, b) => a - b);

  return seasons.map((season) => {
    const seasonRecords = fresh.filter((record) => record.season === season);
    const prices = seasonRecords.map((record) => Number(record.price)).sort((a, b) => a - b);
    const totalSpend = prices.reduce((sum, value) => sum + value, 0);

    return {
      season,
      players: prices.length,
      totalSpend,
      averagePrice: mean(prices),
      medianPrice: quantile(prices, 0.5),
      q75Price: quantile(prices, 0.75),
      maximumPrice: prices.at(-1) ?? null,
      count50Plus: prices.filter((price) => price >= 50).length,
      count70Plus: prices.filter((price) => price >= 70).length,
      count80Plus: prices.filter((price) => price >= 80).length,
      countDollarPlayers: prices.filter((price) => price === 1).length,
    };
  });
}

export function buildTopEndBands(records = []) {
  const fresh = freshAuctionRecords(records);
  const byPosition = new Map();

  for (const record of fresh) {
    if (!record.position) continue;
    const bucket = byPosition.get(record.position) ?? [];
    bucket.push(Number(record.price));
    byPosition.set(record.position, bucket);
  }

  const result = {};
  for (const [position, values] of byPosition.entries()) {
    const sorted = values.sort((a, b) => b - a);
    const eliteSampleSize = Math.max(1, Math.ceil(sorted.length * 0.15));
    const elite = sorted.slice(0, eliteSampleSize).sort((a, b) => a - b);

    result[position] = {
      sampleSize: elite.length,
      low: quantile(elite, 0.25),
      expected: quantile(elite, 0.5),
      high: quantile(elite, 0.75),
      ceiling: elite.at(-1) ?? null,
    };
  }

  return result;
}

export function estimateClearingPrice({
  intrinsicPrice,
  interestedManagerMaxBids = [],
  minimumBid = 1,
  increment = 1,
} = {}) {
  if (!Number.isFinite(Number(intrinsicPrice))) return null;

  const intrinsic = Math.max(minimumBid, Number(intrinsicPrice));
  const caps = interestedManagerMaxBids
    .map(Number)
    .filter(Number.isFinite)
    .filter((value) => value >= minimumBid)
    .sort((a, b) => b - a);

  if (!caps.length) return minimumBid;
  if (caps.length === 1) return Math.min(intrinsic, caps[0]);

  const winnerCap = caps[0];
  const secondCap = caps[1];
  const competitivePrice = secondCap + increment;
  return Math.min(intrinsic, winnerCap, competitivePrice);
}

export function buildMarketProfile(records = []) {
  return {
    freshAuctionSamples: freshAuctionRecords(records).length,
    keeperSamples: keeperRecords(records).length,
    positions: buildPositionMarketSummary(records),
    seasons: buildSeasonMarketSummary(records),
    topEndBands: buildTopEndBands(records),
  };
}
