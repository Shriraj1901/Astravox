const express = require('express');
const {
  startInterview,
  submitAnswer,
  endInterview,
  getMyInterviews,
  getReadiness,
  getActivity,
  getInterviewById,
  recordFocusLoss,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/aiLimiter');

const router = express.Router();

router.post('/start', protect, aiLimiter, startInterview);
router.post('/:id/answer', protect, aiLimiter, submitAnswer);
router.post('/:id/end', protect, aiLimiter, endInterview);
router.post('/:id/focus-loss', protect, recordFocusLoss);
router.get('/readiness', protect, getReadiness);
router.get('/activity', protect, getActivity);
router.get('/', protect, getMyInterviews);
router.get('/:id', protect, getInterviewById);

module.exports = router;