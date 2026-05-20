# Difficulty Adjustment System

A production-ready **adaptive difficulty adjustment API** built with **Node.js + Express.js**.  
It analyses a user's score history and recommends the next question difficulty level (`easy`, `medium`, or `hard`) using a multi-layer intelligent algorithm.

---

## Table of Contents

1. [Architecture & Algorithm](#architecture--algorithm)
2. [Project Structure](#project-structure)
3. [Setup & Installation](#setup--installation)
4. [API Reference](#api-reference)
5. [Sample Requests & Responses](#sample-requests--responses)
6. [Running Tests](#running-tests)
7. [Running Simulations](#running-simulations)
8. [Configuration](#configuration)
9. [Future Improvements](#future-improvements)

---

## Architecture & Algorithm

### Decision Pipeline

```
Raw Scores
    │
    ▼
① Sanitise & Validate
    │
    ▼
② Cold-Start Guard  ──── < 3 attempts? ──► return MEDIUM
    │
    ▼
③ Compute Statistics
    │   • Arithmetic Average
    │   • Weighted Moving Average (WMA)  ← more weight on recent scores
    │   • Trend Slope                   ← improving / declining
    │   • Standard Deviation            ← consistency measure
    │   • Anomaly Detection             ← spike / sudden drop
    │
    ▼
④ Determine Raw Zone from WMA
    │   WMA < 40  → EASY
    │   40–75     → MEDIUM
    │   > 75      → HARD
    │
    ▼
⑤ Streak Check  ────── streak < 2? ──► hold current zone (anti-oscillation)
    │
    ▼
⑥ Trend Adjustment
    │   slope ≥ +5 → nudge up one level
    │   slope ≤ −5 → nudge down one level
    │
    ▼
⑦ Hysteresis Dead-band  ──── WMA within ±3 pts of a boundary? ──► hold zone
    │
    ▼
⑧ Final Decision + Reason String
```

### Anti-Oscillation Strategy

| Mechanism | Description |
|---|---|
| **Streak Logic** | Requires ≥ 2 consecutive out-of-zone scores before changing level |
| **Weighted Moving Average** | Recent scores matter more; single anomalies are diluted |
| **Anomaly Detection** | Flags spike/drop but does NOT trigger an immediate change |
| **Hysteresis Buffer** | ±3 pt dead-band around each boundary prevents boundary thrashing |

### Fairness Strategy

- WMA ensures a single bad attempt does not unfairly demote a student.
- Trend slope rewards consistent improvement even before the score crosses a hard threshold.
- Standard deviation is surfaced in `meta` for downstream fairness auditing.

### Scalability

- The service is **stateless** — all state is passed in the request body.
- Can be deployed as a **horizontal cluster** with no shared state.
- Thresholds are **centralised** in `src/config/thresholds.js` — tune without touching logic.
- Service is a **singleton** module, safe to share across concurrent requests.

---

## Project Structure

```
difficulty-adjustment/
│
├── src/
│   ├── app.js                        ← Express app & server entry point
│   │
│   ├── config/
│   │   └── thresholds.js             ← All tunable constants (single source of truth)
│   │
│   ├── controller/
│   │   └── difficultyController.js   ← HTTP layer (thin, no business logic)
│   │
│   ├── middleware/
│   │   ├── validate.js               ← Input validation (express-validator)
│   │   └── errorHandler.js           ← Global 404 + error handler
│   │
│   ├── routes/
│   │   └── difficultyRoutes.js       ← Route definitions
│   │
│   ├── service/
│   │   └── DifficultyService.js      ← Core algorithm (all business logic)
│   │
│   ├── utils/
│   │   └── scoreStats.js             ← Pure statistical utility functions
│   │
│   └── tests/
│       ├── scoreStats.test.js        ← Unit tests: statistical utilities
│       ├── difficultyService.test.js ← Unit tests: service / algorithm
│       ├── difficultyApi.test.js     ← Integration tests: full HTTP API
│       └── simulate.js              ← Manual simulation runner
│
├── .env                              ← Environment variables
├── package.json
└── README.md
```

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x

### Steps

```bash
# 1. Navigate into the project
cd difficulty-adjustment

# 2. Install dependencies
npm install

# 3. Start the dev server (auto-restarts on change)
npm run dev

# 4. Or start in production mode
npm start
```

The server starts at **http://localhost:3000**

---

## API Reference

### `POST /api/difficulty/next`

Computes the recommended next difficulty level based on score history.

#### Request

| Field | Type | Required | Description |
|---|---|---|---|
| `scores` | `number[]` | ✅ Yes | Array of past scores (0–100 each) |
| `user_id` | `string` | ❌ No | Optional user identifier (echoed back) |

#### Response

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Always `true` on 200 |
| `user_id` | `string\|null` | Echoed from request |
| `next_difficulty` | `string` | `"easy"`, `"medium"`, or `"hard"` |
| `reason` | `string` | Human-readable explanation |
| `meta` | `object` | Statistical details (for debugging/audit) |

#### Error Responses

| Status | Cause |
|---|---|
| `422` | Validation failed (missing/invalid scores) |
| `404` | Route not found |
| `500` | Internal server error |

---

## Sample Requests & Responses

### 1. Strong Performer → `hard`

```bash
curl -X POST http://localhost:3000/api/difficulty/next \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u001","scores":[82,88,91,85,93]}'
```

```json
{
  "success": true,
  "user_id": "u001",
  "next_difficulty": "hard",
  "reason": "WMA = 89.3 → base zone: hard | Consistent performance | Trend slope: +2 pts/attempt | → Assigned difficulty: HARD",
  "meta": {
    "attempts": 5,
    "average": 87.8,
    "weightedAverage": 89.3,
    "trendSlope": 2.3,
    "standardDeviation": 3.7,
    "streak": 5,
    "anomaly": { "isAnomaly": false, "direction": null }
  }
}
```

### 2. Weak Performer → `easy`

```bash
curl -X POST http://localhost:3000/api/difficulty/next \
  -H "Content-Type: application/json" \
  -d '{"scores":[22,30,18,25,28]}'
```

```json
{
  "success": true,
  "user_id": null,
  "next_difficulty": "easy",
  "reason": "WMA = 25.9 → base zone: easy | Consistent performance | Trend slope: +1 pts/attempt | → Assigned difficulty: EASY",
  "meta": {
    "attempts": 5,
    "average": 24.6,
    "weightedAverage": 25.9,
    "trendSlope": 1.3,
    "standardDeviation": 4.2,
    "streak": 5,
    "anomaly": { "isAnomaly": false, "direction": null }
  }
}
```

### 3. Insufficient Data → `medium`

```bash
curl -X POST http://localhost:3000/api/difficulty/next \
  -H "Content-Type: application/json" \
  -d '{"scores":[95,98]}'
```

```json
{
  "success": true,
  "user_id": null,
  "next_difficulty": "medium",
  "reason": "Insufficient attempts (2/3) — defaulting to medium",
  "meta": { "attempts": 2 }
}
```

### 4. Sudden Spike Detected

```bash
curl -X POST http://localhost:3000/api/difficulty/next \
  -H "Content-Type: application/json" \
  -d '{"scores":[55,58,60,62,97]}'
```

```json
{
  "success": true,
  "user_id": null,
  "next_difficulty": "medium",
  "reason": "WMA = 79.7 → base zone: hard | Recent score anomaly detected (spike) — ignored for stability | ...",
  "meta": {
    "anomaly": { "isAnomaly": true, "direction": "spike" }
  }
}
```

### 5. Validation Error

```bash
curl -X POST http://localhost:3000/api/difficulty/next \
  -H "Content-Type: application/json" \
  -d '{"scores":[50,-10,70]}'
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "scores[1]", "message": "Each score must be a number between 0 and 100" }
  ]
}
```

---

## Running Tests

```bash
# Run all tests with coverage report
npm test

# Watch mode (re-runs on save)
npm run test:watch
```

### Test Coverage Areas

| File | Coverage Focus |
|---|---|
| `scoreStats.test.js` | Unit tests for all 6 statistical functions |
| `difficultyService.test.js` | Algorithm logic — 15 scenarios including all edge cases |
| `difficultyApi.test.js` | HTTP integration — happy paths + all validation errors |

---

## Running Simulations

```bash
node src/tests/simulate.js
```

Shows all 15 scenarios printed to the console with full output including difficulty, reason, and meta stats.

---

## Configuration

All thresholds live in `src/config/thresholds.js`:

| Constant | Default | Description |
|---|---|---|
| `MIN_ATTEMPTS` | `3` | Scores needed before leaving cold-start |
| `EASY_MAX` | `40` | Score ceiling for easy zone |
| `MEDIUM_MAX` | `75` | Score ceiling for medium zone |
| `WMA_WINDOW` | `5` | Scores used in weighted average |
| `STREAK_THRESHOLD` | `2` | Consecutive scores needed to change zone |
| `SPIKE_DELTA` | `20` | Minimum jump to classify as anomaly |
| `HYSTERESIS` | `3` | Dead-band size around boundaries |
| `TREND_STRONG_UP` | `5` | Slope (pts/attempt) for upward nudge |
| `TREND_STRONG_DOWN` | `-5` | Slope (pts/attempt) for downward nudge |

---

## Future Improvements

| Feature | Description |
|---|---|
| **Persistence** | Store score history in Redis/MongoDB per `user_id` |
| **Cooldown Timer** | Time-based cooldown (e.g., no change within 10 min) |
| **Per-Subject Difficulty** | Separate difficulty per topic (Math, Science, etc.) |
| **Confidence Score** | Return a 0–1 confidence alongside the difficulty |
| **Feedback Loop** | Incorporate time-taken and retry-count into scoring |
| **Admin API** | Endpoint to update thresholds at runtime without restart |
| **Prometheus Metrics** | Track difficulty distribution and anomaly rate |
| **TypeScript Migration** | Type-safe interfaces for all service contracts |
