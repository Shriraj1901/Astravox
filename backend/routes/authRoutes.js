const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window for these routes
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;