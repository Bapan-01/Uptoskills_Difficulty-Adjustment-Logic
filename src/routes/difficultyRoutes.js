/**
 * @file difficultyRoutes.js
 * @description Route definitions for the difficulty adjustment API.
 *              Attaches validation middleware before the controller.
 */

const { Router } = require('express');
const { getNextDifficulty } = require('../controller/difficultyController');
const { difficultyRequestRules, handleValidationErrors } = require('../middleware/validate');

const router = Router();

/**
 * POST /api/difficulty/next
 * Pipeline: validate input → handle errors → run controller
 */
router.post(
  '/next',
  difficultyRequestRules,
  handleValidationErrors,
  getNextDifficulty
);

module.exports = router;
