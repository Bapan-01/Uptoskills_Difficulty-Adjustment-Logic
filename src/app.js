/**
 * @file app.js
 * @description Express application factory and entry point.
 *              Registers middleware, routes, and error handlers.
 */

require('dotenv').config();

const express = require('express');
const morgan  = require('morgan');

const difficultyRoutes              = require('./routes/difficultyRoutes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());                         // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/difficulty', difficultyRoutes);

// ─── Error Handlers (must be last) ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀  Difficulty-Adjustment API running on http://localhost:${PORT}`);
    console.log(`   ENV : ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app; // Export for supertest
