/**
 * @file scoreStats.test.js
 * @description Unit tests for all statistical utility functions.
 */

const {
  average,
  weightedMovingAverage,
  trendSlope,
  consecutiveStreak,
  detectAnomaly,
  standardDeviation,
} = require('../utils/scoreStats');

// ─────────────────────────────────────────────────────────────────────────────
describe('average()', () => {
  test('returns correct mean for a normal array', () => {
    expect(average([60, 70, 80])).toBeCloseTo(70);
  });

  test('returns 0 for empty array', () => {
    expect(average([])).toBe(0);
  });

  test('returns 0 for null/undefined', () => {
    expect(average(null)).toBe(0);
    expect(average(undefined)).toBe(0);
  });

  test('handles single element', () => {
    expect(average([50])).toBe(50);
  });

  test('handles all-zero scores', () => {
    expect(average([0, 0, 0])).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('weightedMovingAverage()', () => {
  test('gives more weight to recent scores', () => {
    // Scores: [10, 10, 100] — WMA should be much closer to 100
    const wma = weightedMovingAverage([10, 10, 100], 3);
    expect(wma).toBeGreaterThan(50); // Should heavily favour 100
  });

  test('equals the score itself for a single-element array', () => {
    expect(weightedMovingAverage([75], 5)).toBe(75);
  });

  test('returns 0 for empty array', () => {
    expect(weightedMovingAverage([], 5)).toBe(0);
  });

  test('uses only the last `window` scores', () => {
    // First scores should be ignored
    const wma = weightedMovingAverage([5, 5, 5, 80, 90], 2);
    // Only [80, 90] used; weights: [1,2]; wma = (80*1 + 90*2)/3 = 86.67
    expect(wma).toBeCloseTo(86.67, 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('trendSlope()', () => {
  test('positive slope for steadily increasing scores', () => {
    expect(trendSlope([50, 60, 70, 80], 4)).toBeGreaterThan(0);
  });

  test('negative slope for steadily decreasing scores', () => {
    expect(trendSlope([80, 70, 60, 50], 4)).toBeLessThan(0);
  });

  test('near-zero slope for flat scores', () => {
    expect(Math.abs(trendSlope([70, 70, 70], 3))).toBeCloseTo(0);
  });

  test('returns 0 for single score', () => {
    expect(trendSlope([80], 3)).toBe(0);
  });

  test('returns 0 for empty array', () => {
    expect(trendSlope([], 3)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('consecutiveStreak()', () => {
  test('counts trailing scores in range', () => {
    // Last 3 scores [80, 85, 90] are all in [76,100] (hard zone)
    expect(consecutiveStreak([30, 50, 80, 85, 90], 76, 100)).toBe(3);
  });

  test('streak breaks when a score is out of range', () => {
    // Score 50 breaks the streak of high scores
    expect(consecutiveStreak([80, 50, 85, 90], 76, 100)).toBe(2);
  });

  test('returns 0 when last score is out of range', () => {
    expect(consecutiveStreak([80, 85, 40], 76, 100)).toBe(0);
  });

  test('returns 0 for empty array', () => {
    expect(consecutiveStreak([], 0, 100)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('detectAnomaly()', () => {
  test('detects a spike when latest score is much higher than average', () => {
    const result = detectAnomaly([50, 55, 52, 95], 20);
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe('spike');
  });

  test('detects a drop when latest score is much lower than average', () => {
    const result = detectAnomaly([80, 82, 85, 20], 20);
    expect(result.isAnomaly).toBe(true);
    expect(result.direction).toBe('drop');
  });

  test('no anomaly for normal variance', () => {
    const result = detectAnomaly([70, 72, 75, 73], 20);
    expect(result.isAnomaly).toBe(false);
    expect(result.direction).toBeNull();
  });

  test('no anomaly for single score', () => {
    const result = detectAnomaly([80], 20);
    expect(result.isAnomaly).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('standardDeviation()', () => {
  test('returns 0 for identical scores', () => {
    expect(standardDeviation([70, 70, 70])).toBe(0);
  });

  test('returns a positive value for varied scores', () => {
    expect(standardDeviation([20, 80])).toBeGreaterThan(0);
  });

  test('returns 0 for single score', () => {
    expect(standardDeviation([50])).toBe(0);
  });

  test('returns 0 for empty array', () => {
    expect(standardDeviation([])).toBe(0);
  });
});
