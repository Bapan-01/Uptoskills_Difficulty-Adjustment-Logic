/**
 * @file scoreStats.js
 * @description Pure statistical utility functions.
 *              All functions are stateless and side-effect-free,
 *              making them trivially unit-testable.
 */

/**
 * Compute the arithmetic mean of an array of numbers.
 * @param {number[]} scores
 * @returns {number} average, or 0 for empty array
 */
function average(scores) {
  if (!scores || scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return sum / scores.length;
}

/**
 * Compute a Weighted Moving Average (WMA) for the last `window` scores.
 * Newer scores receive linearly higher weights.
 *
 * Weight scheme for window = 3: [1, 2, 3]  (oldest → newest)
 *
 * @param {number[]} scores  Full score history (oldest → newest)
 * @param {number}   window  How many recent scores to consider
 * @returns {number} WMA value
 */
function weightedMovingAverage(scores, window) {
  if (!scores || scores.length === 0) return 0;

  // Take only the most recent `window` scores
  const slice = scores.slice(-window);
  const n = slice.length;

  let weightedSum = 0;
  let totalWeight = 0;

  slice.forEach((score, i) => {
    const weight = i + 1; // weight: 1, 2, … n  (higher for newer)
    weightedSum += score * weight;
    totalWeight += weight;
  });

  return weightedSum / totalWeight;
}

/**
 * Calculate the linear trend slope over the last `window` scores.
 * A positive slope means improving; negative means declining.
 *
 * Uses simple finite-difference:
 *   slope = average of consecutive differences
 *
 * @param {number[]} scores
 * @param {number}   window
 * @returns {number} average per-step change (slope)
 */
function trendSlope(scores, window) {
  if (!scores || scores.length < 2) return 0;

  const slice = scores.slice(-window);
  if (slice.length < 2) return 0;

  const deltas = [];
  for (let i = 1; i < slice.length; i++) {
    deltas.push(slice[i] - slice[i - 1]);
  }

  return average(deltas);
}

/**
 * Count how many *consecutive trailing* scores fall inside a given range.
 * Stops counting as soon as a score falls outside the range.
 *
 * @param {number[]} scores
 * @param {number}   min   inclusive lower bound
 * @param {number}   max   inclusive upper bound
 * @returns {number} streak length
 */
function consecutiveStreak(scores, min, max) {
  let streak = 0;
  // Walk backwards from the newest score
  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] >= min && scores[i] <= max) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Detect whether the most recent score is an anomaly (spike or drop)
 * relative to the previous rolling average.
 *
 * @param {number[]} scores
 * @param {number}   deltaTreshold  Minimum absolute change to be a spike
 * @returns {{ isAnomaly: boolean, direction: 'spike'|'drop'|null }}
 */
function detectAnomaly(scores, deltaTreshold) {
  if (!scores || scores.length < 2) return { isAnomaly: false, direction: null };

  const latest = scores[scores.length - 1];
  const prevAvg = average(scores.slice(0, -1)); // average without the latest
  const delta = latest - prevAvg;

  if (Math.abs(delta) >= deltaTreshold) {
    return {
      isAnomaly: true,
      direction: delta > 0 ? 'spike' : 'drop',
    };
  }

  return { isAnomaly: false, direction: null };
}

/**
 * Compute simple standard deviation to measure score consistency.
 * @param {number[]} scores
 * @returns {number} standard deviation
 */
function standardDeviation(scores) {
  if (!scores || scores.length < 2) return 0;
  const mean = average(scores);
  const variance = scores.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

module.exports = {
  average,
  weightedMovingAverage,
  trendSlope,
  consecutiveStreak,
  detectAnomaly,
  standardDeviation,
};
