const Interview = require('../models/Interview');
const User = require('../models/User');
const { generateNextQuestion, generateFeedback } = require('../services/aiService');

const MAX_QUESTIONS = 5;

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

// @route  POST /api/interviews/start
const startInterview = async (req, res) => {
  try {
    const { company, role, difficulty, interviewType } = req.body;

    if (!company || !role || !difficulty) {
      return res.status(400).json({ message: 'Please provide company, role and difficulty' });
    }

    const interview = await Interview.create({
      user: req.user._id,
      company,
      role,
      difficulty,
      interviewType: interviewType || 'Technical',
      qaPairs: [],
      status: 'in-progress',
    });

    const firstQuestion = await generateNextQuestion({
      company,
      role,
      difficulty,
      interviewType: interview.interviewType,
      qaPairs: [],
    });

    interview.qaPairs.push({ question: firstQuestion, answer: '' });
    await interview.save();

    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/interviews/:id/answer
const submitAnswer = async (req, res) => {
  try {
    const { answer, speechMetrics } = req.body;
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this interview' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ message: 'This interview is already completed' });
    }

    const lastQA = interview.qaPairs[interview.qaPairs.length - 1];
    lastQA.answer = answer;
    if (speechMetrics) {
      lastQA.speechMetrics = speechMetrics;
    }

    if (interview.qaPairs.length >= MAX_QUESTIONS) {
      interview.status = 'completed';
      await interview.save();
      return res.status(200).json({ interview, done: true });
    }

    const nextQuestion = await generateNextQuestion({
      company: interview.company,
      role: interview.role,
      difficulty: interview.difficulty,
      interviewType: interview.interviewType,
      qaPairs: interview.qaPairs,
    });

    interview.qaPairs.push({ question: nextQuestion, answer: '' });
    await interview.save();

    res.status(200).json({ interview, done: false });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/interviews/:id/end
const endInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this interview' });
    }

    const feedback = await generateFeedback({
      company: interview.company,
      role: interview.role,
      difficulty: interview.difficulty,
      interviewType: interview.interviewType,
      qaPairs: interview.qaPairs,
      focusLossCount: interview.focusLossCount,
    });

    interview.feedback = feedback;
    interview.status = 'completed';
    await interview.save();

    const user = await User.findById(req.user._id);
    const allInterviews = await Interview.find({ user: req.user._id, status: 'completed' });
    user.totalInterviews = allInterviews.length;
    user.averageScore =
      allInterviews.reduce((sum, i) => sum + (i.feedback.score || 0), 0) / allInterviews.length;
    await user.save();

    res.status(200).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/interviews/readiness
const getReadiness = async (req, res) => {
  try {
    const interviews = await Interview.find({
      user: req.user._id,
      status: 'completed',
    }).select('feedback.score createdAt');

    const scores = interviews
      .map((i) => i.feedback.score)
      .filter((s) => s != null);

    const result = calculateReadiness(scores);

    res.status(200).json({
      ...result,
      totalInterviews: interviews.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/interviews/:id
const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this interview' });
    }

    res.status(200).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/interviews/:id/focus-loss
const recordFocusLoss = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this interview' });
    }

    interview.focusLossCount += 1;
    await interview.save();

    res.status(200).json({ focusLossCount: interview.focusLossCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  startInterview,
  submitAnswer,
  endInterview,
  getMyInterviews,
  getReadiness,
  getInterviewById,
  recordFocusLoss,
};