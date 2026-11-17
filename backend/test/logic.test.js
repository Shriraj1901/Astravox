// Run with: npm test   (Node's built-in test runner, no database or network needed)
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.OPENAI_API_KEY ??= 'test-key';

const { parseJsonReply, normalizeFeedback } = require('../services/aiService');
const { calculateReadiness, calculateStreak } = require('../controllers/interviewController');
const serverError = require('../utils/serverError');

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const fakeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

test('parseJsonReply reads JSON wrapped in markdown fences and prose', () => {
  const reply = 'Here is the evaluation:\n```json\n{"score": 72, "summary": "ok"}\n```\nThanks!';
  assert.deepEqual(parseJsonReply(reply), { score: 72, summary: 'ok' });
});

test('parseJsonReply turns a non-JSON reply into a user-safe 503', () => {
  assert.throws(() => parseJsonReply('I cannot help with that.'), (err) => {
    return err.status === 503 && typeof err.publicMessage === 'string';
  });
});

test('normalizeFeedback clamps the score and drops malformed list items', () => {
  const feedback = normalizeFeedback({
    score: '140.4',
    strengths: ['Clear structure', 42, '   ', null],
    improvements: 'not an array',
    summary: 7,
  });
  assert.deepEqual(feedback, {
    score: 100,
    strengths: ['Clear structure'],
    improvements: [],
    suggestedTopics: [],
    summary: '',
  });
});

test('normalizeFeedback rejects a reply with no usable score', () => {
  assert.throws(() => normalizeFeedback({ strengths: [] }), (err) => err.status === 503);
});

test('calculateReadiness handles no interviews and a normal history', () => {
  assert.deepEqual(calculateReadiness([]), { readinessScore: 0, consistency: 0, avgScore: 0 });
  // avg 70, std dev 10 -> consistency 80, volume bonus 4 -> 49 + 16 + 0.4
  assert.deepEqual(calculateReadiness([60, 80]), {
    readinessScore: 65,
    consistency: 80,
    avgScore: 70,
  });
});

test('calculateStreak counts consecutive days ending today or yesterday', () => {
  assert.equal(calculateStreak([]), 0);
  assert.equal(calculateStreak([daysAgo(0), daysAgo(0), daysAgo(1), daysAgo(2)]), 3);
  assert.equal(calculateStreak([daysAgo(1), daysAgo(2)]), 2);
  assert.equal(calculateStreak([daysAgo(0), daysAgo(2)]), 1);
  assert.equal(calculateStreak([daysAgo(3), daysAgo(4)]), 0);
});

test('serverError never leaks internal error details to the client', () => {
  const res = fakeRes();
  const original = console.error;
  console.error = () => {};
  serverError(res, new Error('connect ECONNREFUSED 10.0.0.5:27017 user=admin'));
  console.error = original;
  assert.equal(res.statusCode, 500);
  assert.equal(JSON.stringify(res.body).includes('ECONNREFUSED'), false);
});

test('serverError maps known error shapes to client errors', () => {
  assert.equal(serverError(fakeRes(), { name: 'CastError' }).statusCode, 404);
  assert.equal(serverError(fakeRes(), { code: 'LIMIT_FILE_SIZE' }).statusCode, 400);
  assert.equal(serverError(fakeRes(), { type: 'entity.parse.failed' }).statusCode, 400);
  assert.equal(serverError(fakeRes(), { status: 503, publicMessage: 'AI down' }).body.message, 'AI down');
});
