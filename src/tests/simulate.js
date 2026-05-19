/**
 * @file simulate.js
 * @description Manual simulation runner — shows expected outputs for all
 *              documented test scenarios. Run with: node src/tests/simulate.js
 */

const difficultyService = require('../service/DifficultyService');

const LINE = '─'.repeat(70);

function run(label, scores) {
  const result = difficultyService.computeNextDifficulty(scores);
  console.log(LINE);
  console.log(`📋  Scenario : ${label}`);
  console.log(`📥  Input    : [${scores.join(', ')}]`);
  console.log(`🎯  Difficulty: ${result.next_difficulty.toUpperCase()}`);
  console.log(`💬  Reason   : ${result.reason}`);
  console.log(`📊  Meta     :`, JSON.stringify(result.meta, null, 2));
}

console.log('\n🚀  DIFFICULTY ADJUSTMENT — SIMULATION REPORT\n');

// ── 1. Empty scores ────────────────────────────────────────────────────────
run('Empty score list (cold start)', []);

// ── 2. Very few attempts ────────────────────────────────────────────────────
run('Insufficient attempts (only 2 scores)', [80, 90]);

// ── 3. Weak performer ──────────────────────────────────────────────────────
run('Weak performer (consistent low scores)', [22, 30, 18, 25, 28]);

// ── 4. Average performer ───────────────────────────────────────────────────
run('Average performer (stable mid scores)', [55, 62, 58, 61, 65]);

// ── 5. Strong performer ────────────────────────────────────────────────────
run('Strong performer (consistent high scores)', [82, 88, 91, 85, 93]);

// ── 6. Sudden spike ────────────────────────────────────────────────────────
run('Sudden spike (was average, one outlier high)', [55, 58, 60, 62, 97]);

// ── 7. Sudden drop ─────────────────────────────────────────────────────────
run('Sudden drop (was strong, one outlier low)', [88, 90, 85, 92, 15]);

// ── 8. Fluctuating / oscillating ───────────────────────────────────────────
run('Oscillating scores (high-low alternating)', [40, 80, 40, 80, 40, 80]);

// ── 9. Strong upward trend ─────────────────────────────────────────────────
run('Strong upward trend (medium zone climbing)', [50, 57, 64, 71, 78]);

// ── 10. Strong downward trend ──────────────────────────────────────────────
run('Strong downward trend (medium zone falling)', [72, 65, 58, 50, 43]);

// ── 11. Borderline easy/medium ─────────────────────────────────────────────
run('Borderline easy↔medium (WMA near 40)', [38, 40, 42, 39, 41]);

// ── 12. Borderline medium/hard ─────────────────────────────────────────────
run('Borderline medium↔hard (WMA near 75)', [74, 75, 76, 74, 75]);

// ── 13. All scores at 100 ──────────────────────────────────────────────────
run('Perfect scores', [100, 100, 100, 100, 100]);

// ── 14. All scores at 0 ────────────────────────────────────────────────────
run('All-zero scores', [0, 0, 0, 0, 0]);

// ── 15. Real-world example from spec ───────────────────────────────────────
run('Spec example (user_id: 123)', [72, 81, 90, 88, 95]);

console.log('\n' + LINE);
console.log('✅  Simulation complete.\n');
