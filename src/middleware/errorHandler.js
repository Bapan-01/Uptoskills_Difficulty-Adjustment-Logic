/**
 * @file errorHandler.js
 * @description Global error-handling middleware.
 *              Catches any unhandled errors and returns a structured JSON response.
 */

/**
 * 404 handler — placed before the global error handler.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

/**
 * Global error handler (must have exactly 4 params for Express to recognise it).
 */
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the full stack in development only
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err.stack || err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
