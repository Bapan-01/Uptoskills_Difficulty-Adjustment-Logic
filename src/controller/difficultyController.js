/**
 * @file difficultyController.js
 * @description Handles HTTP request/response for the difficulty endpoint.
 *              Delegates all business logic to DifficultyService.
 *              Keeps controller thin — only parses input and formats output.
 */

const difficultyService = require('../service/DifficultyService');

/**
 * POST /api/difficulty/next
 *
 * Request body:
 *   { "user_id": "123" (optional), "scores": [72, 81, 90] }
 *
 * Response:
 *   { "success": true, "next_difficulty": "hard", "reason": "...", "meta": { ... } }
 */
async function getNextDifficulty(req, res, next) {
  try {
    const { scores = [], user_id } = req.body;

    // Delegate to service — controller stays logic-free
    const result = difficultyService.computeNextDifficulty(scores);

    return res.status(200).json({
      success: true,
      user_id: user_id || null,
      next_difficulty: result.next_difficulty,
      reason: result.reason,
      meta: result.meta,
    });
  } catch (err) {
    next(err); // Forward to global error handler
  }
}

module.exports = { getNextDifficulty };
