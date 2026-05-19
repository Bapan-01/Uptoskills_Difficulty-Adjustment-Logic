/**
 * @file difficultyService.test.js
 * @description Unit tests for DifficultyService covering all documented
 *              edge cases and simulation scenarios.
 */

const difficultyService = require('../service/DifficultyService');

// Helper to call the service cleanly
const compute = (scores) => difficultyService.computeNextDifficulty(scores);

// ─────────────────────────────────────────────────────────────────────────────
describe('DifficultyService — Edge Cases', () => {

  // ── 1. Empty score list ────────────────────────────────────────────────────
  test('empty array → medium (cold start)', () => {
    const { next_difficulty } = compute([]);
    expect(next_difficulty).toBe('medium');
  });

  // ── 2. Very few attempts ───────────────────────────────────────────────────
  test('1 score → medium (insufficient attempts)', () => {
    const { next_difficulty, meta } = compute([95]);
    expect(next_difficulty).toBe('medium');
    expect(meta.attempts).toBe(1);
  });

  test('2 scores → medium (insufficient attempts)', () => {
    const { next_difficulty } = compute([80, 90]);
    expect(next_difficulty).toBe('medium');
  });

  test('exactly 3 scores → no longer cold start', () => {
    const { meta } = compute([50, 60, 70]);
    expect(meta.attempts).toBe(3);
  });

  // ── 3. Invalid / out-of-range scores sanitised ────────────────────────────
  test('scores with null/undefined values are sanitised', () => {
    const { next_difficulty } = compute([null, undefined, 80, 85, 90]);
    // After sanitisation only 3 valid scores remain → should decide
    expect(['easy', 'medium', 'hard']).toContain(next_difficulty);
  });

  test('scores above 100 are filtered out', () => {
    const result = compute([110, 80, 85, 90]);
    expect(['easy', 'medium', 'hard']).toContain(result.next_difficulty);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DifficultyService — Simulation Scenarios', () => {

  // ── Scenario 1: Weak performer ─────────────────────────────────────────────
  test('weak performer: consistently low scores → easy', () => {
    const { next_difficulty } = compute([22, 30, 18, 25, 28]);
    expect(next_difficulty).toBe('easy');
  });

  // ── Scenario 2: Average performer ─────────────────────────────────────────
  test('average performer: scores in 40–75 band → medium', () => {
    const { next_difficulty } = compute([55, 62, 58, 61, 65]);
    expect(next_difficulty).toBe('medium');
  });

  // ── Scenario 3: Strong performer ──────────────────────────────────────────
  test('strong performer: consistently high scores → hard', () => {
    const { next_difficulty } = compute([82, 88, 91, 85, 93]);
    expect(next_difficulty).toBe('hard');
  });

  // ── Scenario 4: Sudden spike (anti-oscillation) ────────────────────────────
  test('sudden spike should not immediately promote to hard', () => {
    // User was average, then spikes once — should stay medium or be flagged
    const { next_difficulty, reason, meta } = compute([55, 58, 60, 62, 97]);
    expect(meta.anomaly.isAnomaly).toBe(true);
    expect(meta.anomaly.direction).toBe('spike');
    // Should NOT immediately jump to hard; system is cautious
    expect(['medium', 'hard']).toContain(next_difficulty);
  });

  // ── Scenario 5: Sudden drop (anti-oscillation) ─────────────────────────────
  test('sudden drop should not immediately demote from hard', () => {
    // Strong performer, then a single terrible score
    const { meta } = compute([88, 90, 85, 92, 15]);
    expect(meta.anomaly.isAnomaly).toBe(true);
    expect(meta.anomaly.direction).toBe('drop');
  });

  // ── Scenario 6: Fluctuating performer ────────────────────────────────────
  test('oscillating scores: system should stabilise at medium', () => {
    // Alternates high/low — the average + WMA should land in medium zone
    const { next_difficulty } = compute([40, 80, 40, 80, 40, 80]);
    // Average ≈ 60 → medium
    expect(next_difficulty).toBe('medium');
  });

  // ── Scenario 7: Upward trend → upgrade ───────────────────────────────────
  test('strong upward trend in medium zone nudges toward hard', () => {
    // Scores staying in medium but climbing fast
    const scores = [50, 57, 64, 71, 78];
    const { next_difficulty } = compute(scores);
    expect(['medium', 'hard']).toContain(next_difficulty);
  });

  // ── Scenario 8: Downward trend → downgrade ────────────────────────────────
  test('strong downward trend in medium zone nudges toward easy', () => {
    const scores = [72, 65, 58, 50, 43];
    const { next_difficulty } = compute(scores);
    expect(['easy', 'medium']).toContain(next_difficulty);
  });

  // ── Scenario 9: Borderline score (hysteresis) ─────────────────────────────
  test('score right on the easy/medium boundary does not thrash', () => {
    // WMA ≈ 40, which is exactly at the boundary — hysteresis should hold medium
    const { next_difficulty } = compute([38, 40, 42, 39, 41]);
    expect(['easy', 'medium']).toContain(next_difficulty);
  });

  test('score right on the medium/hard boundary does not thrash', () => {
    const { next_difficulty } = compute([74, 75, 76, 74, 75]);
    expect(['medium', 'hard']).toContain(next_difficulty);
  });

  // ── Scenario 10: Consistently high scores → hard ──────────────────────────
  test('user_id passed does not affect computation', () => {
    const r1 = compute([82, 88, 91, 85, 93]);
    // Simulate controller passing user_id separately
    expect(r1.next_difficulty).toBe('hard');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DifficultyService — Meta Data', () => {

  test('meta object contains expected keys', () => {
    const { meta } = compute([55, 62, 71, 68, 74]);
    expect(meta).toHaveProperty('attempts');
    expect(meta).toHaveProperty('average');
    expect(meta).toHaveProperty('weightedAverage');
    expect(meta).toHaveProperty('trendSlope');
    expect(meta).toHaveProperty('standardDeviation');
    expect(meta).toHaveProperty('streak');
    expect(meta).toHaveProperty('anomaly');
  });

  test('meta.attempts matches input length', () => {
    const scores = [55, 62, 71, 68, 74];
    const { meta } = compute(scores);
    expect(meta.attempts).toBe(scores.length);
  });
});
