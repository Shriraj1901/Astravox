const Interview = require('../models/Interview');
const User = require('../models/User');
const { generateNextQuestion, generateFeedback } = require('../services/aiService');
const serverError = require('../utils/serverError');

const MAX_QUESTIONS = 5;
// ~10 minutes of continuous speech; anything longer is not a real answer.
const MAX_ANSWER_CHARS = 10000;
const MAX_LABEL_CHARS = 100;
const DIFFICULTIES = Interview.schema.path('difficulty').enumValues;
const INTERVIEW_TYPES = Interview.schema.path('interviewType').enumValues;
const NUMERIC_METRICS = [
  'durationSeconds',
  'wordsPerMinute',
  'fillerWordCount',
  'pauseCount',
  'facePresentPercent',
  'multipleFacesCount',
  'noFaceCount',
];

const isLabel = (value) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_LABEL_CHARS;

// Scoping the query to the owner means someone else's interview is simply "not found".
const findOwnInterview = async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) res.status(404).json({ message: 'Interview not found' });
  return interview;
};

const getResumeContext = async (userId) => {
  const user = await User.findById(userId).select('resume');
  return user?.resume?.rawText ? user.resume.analysis : null;
};

// Metrics come from the browser and are quoted in the feedback prompt, so only
// well-typed values are kept.
const cleanSpeechMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') return null;
  const clean = {};
  NUMERIC_METRICS.forEach((key) => {
    if (Number.isFinite(metrics[key]) && metrics[key] >= 0) clean[key] = metrics[key];
  });
  if (typeof metrics.dominantExpression === 'string') {
    clean.dominantExpression =
      metrics.dominantExpression.replace(/[^a-z]/gi, '').slice(0, 20) || null;
  }
  return clean;
};

const calculateReadiness = (scores) => {
  if (scores.length === 0) {
    return { readinessScore: 0, consistency: 0, avgScore: 0 };
  }

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, Math.round(100 - stdDev * 2));

  const volumeBonus = Math.min(10, scores.length * 2);

  const readinessScore = Math.min(
    100,
    Math.round(avg * 0.7 + consistency * 0.2 + volumeBonus * 0.1)
  );

  return { readinessScore, consistency, avgScore: Math.round(avg) };
};

const calculateStreak = (dates) => {
  if (dates.length === 0) return 0;

  const dayStrings = [...new Set(dates.map((d) => new Date(d).toDateString()))];
  const sortedDays = dayStrings.map((d) => new Date(d)).sort((a, b) => b - a);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = sortedDays[0];
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let streak = 1;
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const current = new Date(sortedDays[i]);
    current.setHours(0, 0, 0, 0);
    const next = new Date(sortedDays[i + 1]);
    next.setHours(0, 0, 0, 0);

    const diffDays = Math.round((current - next) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// @route  POST /api/interviews/start
const startInterview = async (req, res) => {
  try {
    const { company, role, difficulty, interviewType = 'Technical' } = req.body;

    if (!isLabel(company) || !isLabel(role) || !difficulty) {
      return res.status(400).json({ message: 'Please provide company, role and difficulty' });
    }
    if (!DIFFICULTIES.includes(difficulty) || !INTERVIEW_TYPES.includes(interviewType)) {
      return res.status(400).json({ message: 'Invalid difficulty or interview type' });
    }

    // Generate the question before saving, so an AI failure never leaves an
    // empty, unusable interview behind in the user's history.
    const firstQuestion = await generateNextQuestion({
      company,
      role,
      difficulty,
      interviewType,
      qaPairs: [],
      resumeContext: await getResumeContext(req.user._id),
    });

    const interview = await Interview.create({
      user: req.user._id,
      company: company.trim(),
      role: role.trim(),
      difficulty,
      interviewType,
      qaPairs: [{ question: firstQuestion, answer: '' }],
      status: 'in-progress',
    });

    res.status(201).json(interview);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/interviews/:id/answer
const submitAnswer = async (req, res) => {
  try {
    const { answer, speechMetrics } = req.body;

    if (typeof answer !== 'string' || !answer.trim()) {
      return res.status(400).json({ message: 'Please provide an answer' });
    }
    if (answer.length > MAX_ANSWER_CHARS) {
      return res
        .status(400)
        .json({ message: `Answer is too long (maximum ${MAX_ANSWER_CHARS} characters)` });
    }

    const interview = await findOwnInterview(req, res);
    if (!interview) return;

    if (interview.status === 'completed') {
      return res.status(400).json({ message: 'This interview is already completed' });
    }

    const lastQA = interview.qaPairs[interview.qaPairs.length - 1];
    if (!lastQA) {
      return res
        .status(400)
        .json({ message: 'This interview has no questions. Please start a new one.' });
    }

    lastQA.answer = answer.trim();
    const metrics = cleanSpeechMetrics(speechMetrics);
    if (metrics) {
      lastQA.speechMetrics = metrics;
    }

    if (interview.qaPairs.length >= MAX_QUESTIONS) {
      interview.status = 'completed';
      await interview.save();
      return res.status(200).json({ interview, done: true });
    }

    // Nothing is saved until the next question exists: if the AI call fails,
    // the client still has the answer and can simply resubmit.
    const nextQuestion = await generateNextQuestion({
      company: interview.company,
      role: interview.role,
      difficulty: interview.difficulty,
      interviewType: interview.interviewType,
      qaPairs: interview.qaPairs,
      resumeContext: await getResumeContext(req.user._id),
    });

    interview.qaPairs.push({ question: nextQuestion, answer: '' });
    await interview.save();

    res.status(200).json({ interview, done: false });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/interviews/:id/end
const endInterview = async (req, res) => {
  try {
    const interview = await findOwnInterview(req, res);
    if (!interview) return;

    // Idempotent: a retry or duplicate request must not call the model again
    // or change a score the user has already seen.
    if (interview.feedback?.score != null) {
      return res.status(200).json(interview);
    }

    if (!interview.qaPairs.some((qa) => qa.answer)) {
      return res
        .status(400)
        .json({ message: 'Answer at least one question before ending the interview' });
    }

    interview.feedback = await generateFeedback({
      company: interview.company,
      role: interview.role,
      difficulty: interview.difficulty,
      interviewType: interview.interviewType,
      qaPairs: interview.qaPairs,
      focusLossCount: interview.focusLossCount,
    });
    interview.status = 'completed';
    await interview.save();

    // Only interviews that actually received a score count towards the average.
    const scored = await Interview.find({
      user: req.user._id,
      'feedback.score': { $ne: null },
    }).select('feedback.score');
    await User.updateOne(
      { _id: req.user._id },
      {
        totalInterviews: scored.length,
        averageScore: scored.reduce((sum, i) => sum + i.feedback.score, 0) / scored.length,
      }
    );

    res.status(200).json(interview);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  GET /api/interviews
const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('company role difficulty interviewType status feedback.score createdAt');

    res.status(200).json(interviews);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  GET /api/interviews/readiness
const getReadiness = async (req, res) => {
  try {
    const interviews = await Interview.find({
      user: req.user._id,
      status: 'completed',
    }).select('feedback.score createdAt');

    const scores = interviews.map((i) => i.feedback.score).filter((s) => s != null);
    const result = calculateReadiness(scores);

    res.status(200).json({ ...result, totalInterviews: scores.length });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  GET /api/interviews/activity
const getActivity = async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const interviews = await Interview.find({
      user: req.user._id,
      status: 'completed',
      createdAt: { $gte: ninetyDaysAgo },
    }).select('createdAt');

    const dates = interviews.map((i) => i.createdAt);

    const countsByDay = {};
    dates.forEach((d) => {
      const key = new Date(d).toISOString().split('T')[0];
      countsByDay[key] = (countsByDay[key] || 0) + 1;
    });

    const streak = calculateStreak(dates);

    res.status(200).json({ countsByDay, streak });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  GET /api/interviews/:id
const getInterviewById = async (req, res) => {
  try {
    const interview = await findOwnInterview(req, res);
    if (!interview) return;

    res.status(200).json(interview);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/interviews/:id/focus-loss
const recordFocusLoss = async (req, res) => {
  try {
    // Atomic increment: this fires while answers are being saved, and a
    // read-modify-write here could overwrite or lose a concurrent update.
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, status: 'in-progress' },
      { $inc: { focusLossCount: 1 } },
      { returnDocument: 'after' }
    ).select('focusLossCount');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.status(200).json({ focusLossCount: interview.focusLossCount });
  } catch (error) {
    serverError(res, error);
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  endInterview,
  getMyInterviews,
  getReadiness,
  getActivity,
  getInterviewById,
  recordFocusLoss,
  calculateReadiness,
  calculateStreak,
};
