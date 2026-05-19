/**
 * @file thresholds.js
 * @description Centralised configuration for all difficulty-adjustment thresholds.
 *              Keeping values here (not scattered across logic) makes the system
 *              easy to tune without touching business logic code.
 */

const THRESHOLDS = {
  // ──────────────────────────────────────────────
  // Minimum attempts before any real decision
  // ──────────────────────────────────────────────
  MIN_ATTEMPTS: 3,           // Fewer than this → default to "medium"

  // ──────────────────────────────────────────────
  // Score band boundaries  (0 – 100 scale)
  // ──────────────────────────────────────────────
  EASY_MAX: 40,              // avg < 40  → easy
  MEDIUM_MIN: 40,            // avg ≥ 40  → at least medium
  MEDIUM_MAX: 75,            // avg ≤ 75  → medium
  HARD_MIN: 75,              // avg > 75  → hard

  // ──────────────────────────────────────────────
  // Weighted Moving Average (WMA) window
  // ──────────────────────────────────────────────
  WMA_WINDOW: 5,             // How many recent scores to include in WMA

  // ──────────────────────────────────────────────
  // Streak logic: consecutive scores in a zone
  // before we allow a difficulty change
  // ──────────────────────────────────────────────
  STREAK_THRESHOLD: 2,       // Need ≥ 2 consecutive out-of-zone scores

  // ──────────────────────────────────────────────
  // Spike / drop detection
  // ──────────────────────────────────────────────
  SPIKE_DELTA: 20,           // A single score jumping ±20 pts = spike/drop

  // ──────────────────────────────────────────────
  // Hysteresis buffer (dead-band)
  // Prevents flipping at the exact boundary
  // ──────────────────────────────────────────────
  HYSTERESIS: 3,             // ±3 pts around each boundary is a neutral zone

  // ──────────────────────────────────────────────
  // Trend sensitivity
  // ──────────────────────────────────────────────
  TREND_WINDOW: 3,           // How many trailing scores to measure trend slope
  TREND_STRONG_UP: 5,        // Avg gain per step that qualifies as "strong uptrend"
  TREND_STRONG_DOWN: -5,     // Avg loss per step that qualifies as "strong downtrend"

  // ──────────────────────────────────────────────
  // Difficulty levels (canonical strings)
  // ──────────────────────────────────────────────
  LEVELS: Object.freeze({
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  }),
};

module.exports = THRESHOLDS;
