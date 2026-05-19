/**
 * @file validate.js
 * @description Request validation middleware using express-validator.
 *              Keeps validation rules out of controllers and routes.
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for POST /api/difficulty/next
 *
 * Rules:
 *  - scores must be present and be an array
 *  - each element must be a number between 0 and 100
 *  - user_id is optional but if present must be a non-empty string
 */
const difficultyRequestRules = [
  body('scores')
    .exists({ checkNull: true })
    .withMessage('scores is required')
    .isArray()
    .withMessage('scores must be an array'),

  body('scores.*')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Each score must be a number between 0 and 100'),

  body('user_id')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('user_id must be a non-empty string if provided'),
];

/**
 * Middleware that runs after rules to collect & return errors.
 * If any validation error exists, responds with 422 and error details.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

module.exports = { difficultyRequestRules, handleValidationErrors };
