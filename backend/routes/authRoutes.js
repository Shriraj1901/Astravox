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
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', protect, resendVerification);

module.exports = router;