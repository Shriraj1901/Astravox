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

const router = express.Router();

router.post('/start', protect, startInterview);
router.post('/:id/answer', protect, submitAnswer);
router.post('/:id/end', protect, endInterview);
router.post('/:id/focus-loss', protect, recordFocusLoss);
router.get('/readiness', protect, getReadiness);
router.get('/activity', protect, getActivity);
router.get('/', protect, getMyInterviews);
router.get('/:id', protect, getInterviewById);

module.exports = router;