import { AUCTION_LEAGUE_CONFIG, getActiveRosterSize } from './config.js';

export function getRemainingRosterSpots({ playersRostered = 0, config = AUCTION_LEAGUE_CONFIG } = {}) {
  return Math.max(0, getActiveRosterSize(config) - playersRostered);
}

export function getMaximumBid({
  remainingBudget,
  playersRostered = 0,
  config = AUCTION_LEAGUE_CONFIG,
}) {
  const spotsLeft = getRemainingRosterSpots({ playersRostered, config });
  if (spotsLeft <= 0) return 0;

  const reserveForOtherSpots = Math.max(0, spotsLeft - 1) * config.minimumBid;
  return Math.max(0, remainingBudget - reserveForOtherSpots);
}

export function getDiscretionaryBudget({
  remainingBudget,
  playersRostered = 0,
  config = AUCTION_LEAGUE_CONFIG,
}) {
  const spotsLeft = getRemainingRosterSpots({ playersRostered, config });
  const minimumRequired = spotsLeft * config.minimumBid;
  return Math.max(0, remainingBudget - minimumRequired);
}

export function isTrustedBehaviorSample(sample) {
  return sample?.behaviorSource === 'human' && sample?.isAutodraft !== true;
}

export function filterTrustedBehaviorSamples(samples = []) {
  return samples.filter(isTrustedBehaviorSample);
}
