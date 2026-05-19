/**
 * @file difficultyApi.test.js
 * @description Integration tests for POST /api/difficulty/next
 *              Uses supertest to hit the actual Express app.
 */

const request = require('supertest');
const app     = require('../app');

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/difficulty/next — Happy paths', () => {

  test('returns 200 with correct shape', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [72, 81, 90, 88, 95] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('next_difficulty');
    expect(res.body).toHaveProperty('reason');
    expect(res.body).toHaveProperty('meta');
    expect(['easy', 'medium', 'hard']).toContain(res.body.next_difficulty);
  });

  test('strong performer → hard', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [82, 88, 91, 85, 93] });

    expect(res.status).toBe(200);
    expect(res.body.next_difficulty).toBe('hard');
  });

  test('weak performer → easy', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [20, 25, 18, 30, 22] });

    expect(res.status).toBe(200);
    expect(res.body.next_difficulty).toBe('easy');
  });

  test('average performer → medium', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [55, 60, 65, 62, 58] });

    expect(res.status).toBe(200);
    expect(res.body.next_difficulty).toBe('medium');
  });

  test('empty scores → medium (cold start)', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [] });

    expect(res.status).toBe(200);
    expect(res.body.next_difficulty).toBe('medium');
  });

  test('fewer than 3 scores → medium', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [90, 95] });

    expect(res.status).toBe(200);
    expect(res.body.next_difficulty).toBe('medium');
  });

  test('optional user_id is echoed back', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ user_id: '123', scores: [72, 81, 90, 88, 95] });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe('123');
  });

  test('user_id omitted → null in response', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [72, 81, 90] });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/difficulty/next — Validation errors', () => {

  test('missing scores field → 422', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body).toHaveProperty('errors');
  });

  test('scores is not an array → 422', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: 'bad-input' });

    expect(res.status).toBe(422);
  });

  test('score out of range (> 100) → 422', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [50, 60, 150] });

    expect(res.status).toBe(422);
  });

  test('score out of range (< 0) → 422', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [50, -10, 70] });

    expect(res.status).toBe(422);
  });

  test('non-numeric score → 422', async () => {
    const res = await request(app)
      .post('/api/difficulty/next')
      .send({ scores: [50, 'abc', 70] });

    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('returns 200 with ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Unknown route', () => {
  test('returns 404 for unknown endpoint', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
