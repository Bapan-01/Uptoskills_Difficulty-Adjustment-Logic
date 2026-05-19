/**
 * @file DifficultyService.js
 * @description Core business logic for adaptive difficulty adjustment.
 *
 * Algorithm Overview
 * ──────────────────
 * 1.  GUARD: If fewer than MIN_ATTEMPTS scores → return "medium" (cold start).
 * 2.  ANOMALY CHECK: If the latest score is a spike/drop, note it but don't
 *     change difficulty solely because of it (anti-oscillation).
 * 3.  WEIGHTED MOVING AVERAGE (WMA): Gives more influence to recent scores.
 * 4.  TREND SLOPE: Measures direction (improving / declining / stable).
 * 5.  STREAK CHECK: Require STREAK_THRESHOLD consecutive scores in a new zone
 *     before allowing a level change.
 * 6.  HYSTERESIS: Dead-band of ±HYSTERESIS pts around each boundary prevents
 *     constant flipping at the border.
 * 7.  FINAL DECISION: Combine WMA + trend to emit a difficulty level + reason.
 */

const THRESHOLDS = require('../config/thresholds');
const {
  average,
  weightedMovingAverage,
  trendSlope,
  consecutiveStreak,
  detectAnomaly,
  standardDeviation,
} = require('../utils/scoreStats');

const { EASY, MEDIUM, HARD } = THRESHOLDS.LEVELS;

class DifficultyService {
  /**
   * Compute the next recommended difficulty level.
   *
   * @param {number[]} scores  Array of raw scores (oldest → newest)
   * @returns {{
   *   next_difficulty: string,
   *   reason: string,
   *   meta: object
   * }}
   */
  computeNextDifficulty(scores) {
    // ── 0. Normalise input ───────────────────────────────────────────────────
    const cleanScores = this._sanitise(scores);

    // ── 1. Cold-start guard ──────────────────────────────────────────────────
    if (cleanScores.length === 0) {
      return this._result(MEDIUM, 'No score history available — defaulting to medium', {
        attempts: 0,
      });
    }

    if (cleanScores.length < THRESHOLDS.MIN_ATTEMPTS) {
      return this._result(
        MEDIUM,
        `Insufficient attempts (${cleanScores.length}/${THRESHOLDS.MIN_ATTEMPTS}) — defaulting to medium`,
        { attempts: cleanScores.length }
      );
    }

    // ── 2. Compute statistics ────────────────────────────────────────────────
    const avg   = average(cleanScores);
    const wma   = weightedMovingAverage(cleanScores, THRESHOLDS.WMA_WINDOW);
    const slope = trendSlope(cleanScores, THRESHOLDS.TREND_WINDOW);
    const stdDev = standardDeviation(cleanScores);
    const anomaly = detectAnomaly(cleanScores, THRESHOLDS.SPIKE_DELTA);

    // ── 3. Determine raw target zone from WMA ───────────────────────────────
    const rawZone = this._zoneFromScore(wma);

    // ── 4. Streak check: require consecutive scores in the raw zone ──────────
    const [zoneMin, zoneMax] = this._zoneBounds(rawZone);
    const streak = consecutiveStreak(cleanScores, zoneMin, zoneMax);
    const streakSatisfied = streak >= THRESHOLDS.STREAK_THRESHOLD;

    // ── 5. Trend adjustment (only when streak is satisfied) ──────────────────
    let adjustedZone = rawZone;
    let trendNote = '';

    if (streakSatisfied) {
      if (slope >= THRESHOLDS.TREND_STRONG_UP && rawZone !== HARD) {
        // Strong upward trend → nudge one level up
        adjustedZone = rawZone === EASY ? MEDIUM : HARD;
        trendNote = 'Strong upward trend detected — bumping difficulty up';
      } else if (slope <= THRESHOLDS.TREND_STRONG_DOWN && rawZone !== EASY) {
        // Strong downward trend → nudge one level down
        adjustedZone = rawZone === HARD ? MEDIUM : EASY;
        trendNote = 'Strong downward trend detected — dropping difficulty down';
      }
    }

    // ── 6. Hysteresis: suppress change if WMA sits in a dead-band ───────────
    const finalZone = this._applyHysteresis(wma, adjustedZone);

    // ── 7. Build human-readable reason ──────────────────────────────────────
    const reason = this._buildReason({
      cleanScores,
      avg,
      wma,
      slope,
      stdDev,
      anomaly,
      streak,
      streakSatisfied,
      rawZone,
      adjustedZone,
      finalZone,
      trendNote,
    });

    return this._result(finalZone, reason, {
      attempts: cleanScores.length,
      average: Math.round(avg * 10) / 10,
      weightedAverage: Math.round(wma * 10) / 10,
      trendSlope: Math.round(slope * 10) / 10,
      standardDeviation: Math.round(stdDev * 10) / 10,
      streak,
      anomaly,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Remove invalid values (non-numbers, NaN, out-of-range) from the array.
   */
  _sanitise(scores) {
    if (!Array.isArray(scores)) return [];
    return scores.filter(
      (s) => typeof s === 'number' && !isNaN(s) && s >= 0 && s <= 100
    );
  }

  /**
   * Map a numeric score to a difficulty zone string.
   */
  _zoneFromScore(score) {
    if (score < THRESHOLDS.EASY_MAX) return EASY;
    if (score <= THRESHOLDS.MEDIUM_MAX) return MEDIUM;
    return HARD;
  }

  /**
   * Return the inclusive [min, max] score range for a given zone.
   * Used by streak detection to know when a score "belongs" to a zone.
   */
  _zoneBounds(zone) {
    switch (zone) {
      case EASY:   return [0,   THRESHOLDS.EASY_MAX - 1];
      case HARD:   return [THRESHOLDS.HARD_MIN + 1, 100];
      default:     return [THRESHOLDS.MEDIUM_MIN, THRESHOLDS.MEDIUM_MAX];
    }
  }

  /**
   * Apply hysteresis dead-band around zone boundaries.
   * If the WMA sits within HYSTERESIS pts of a boundary, keep the current
   * (adjusted) zone instead of flipping.
   *
   * Boundaries:  EASY|MEDIUM at EASY_MAX (40)
   *              MEDIUM|HARD at HARD_MIN (75)
   */
  _applyHysteresis(wma, zone) {
    const H = THRESHOLDS.HYSTERESIS;

    // Near EASY↔MEDIUM boundary
    if (Math.abs(wma - THRESHOLDS.EASY_MAX) <= H) return zone; // hold
    // Near MEDIUM↔HARD boundary
    if (Math.abs(wma - THRESHOLDS.HARD_MIN) <= H) return zone; // hold

    return zone;
  }

  /**
   * Construct a concise, human-readable reason string.
   */
  _buildReason({ avg, wma, slope, stdDev, anomaly, streak, streakSatisfied, rawZone, finalZone, trendNote }) {
    const parts = [];

    parts.push(`WMA = ${Math.round(wma * 10) / 10} → base zone: ${rawZone}`);

    if (anomaly.isAnomaly) {
      parts.push(`Recent score anomaly detected (${anomaly.direction}) — ignored for stability`);
    }

    if (!streakSatisfied) {
      parts.push(`Streak only ${streak}/${THRESHOLDS.STREAK_THRESHOLD} — holding zone`);
    }

    if (trendNote) parts.push(trendNote);

    if (stdDev > 15) {
      parts.push(`High score variance (σ = ${Math.round(stdDev)})`);
    } else if (stdDev < 6) {
      parts.push('Consistent performance');
    }

    const slopeLabel = slope > 0 ? `+${Math.round(slope)}` : `${Math.round(slope)}`;
    parts.push(`Trend slope: ${slopeLabel} pts/attempt`);

    parts.push(`→ Assigned difficulty: ${finalZone.toUpperCase()}`);

    return parts.join(' | ');
  }

  /**
   * Standardised return shape.
   */
  _result(level, reason, meta = {}) {
    return {
      next_difficulty: level,
      reason,
      meta,
    };
  }
}

module.exports = new DifficultyService(); // Singleton — safe since service is stateless
