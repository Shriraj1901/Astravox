const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { refreshCookieOptions } = require('../utils/cookieOptions');
const serverError = require('../utils/serverError');
const { sendEmail } = require('../services/emailService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 80;
const RESET_SENT_MESSAGE = 'If an account with that email exists, a reset link has been sent.';

// Type checks matter as much as format checks: a JSON body can carry objects
// like {"$ne": null}, which Mongoose would otherwise treat as a query operator.
const isValidName = (name) =>
  typeof name === 'string' && name.trim().length > 0 && name.length <= MAX_NAME_LENGTH;
const isValidEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && EMAIL_PATTERN.test(email);
const isValidPassword = (password) =>
  typeof password === 'string' &&
  password.length >= MIN_PASSWORD_LENGTH &&
  password.length <= MAX_PASSWORD_LENGTH;

const PASSWORD_RULE_MESSAGE = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`;

const hashPassword = async (password) => bcrypt.hash(password, await bcrypt.genSalt(10));
const newToken = () => crypto.randomBytes(32).toString('hex');
// Reset tokens are stored hashed so a database leak cannot be used to take over accounts.
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sendVerificationEmail = (user) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${user.verificationToken}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your AstraVox email',
    html: `
      <p>Hi ${escapeHtml(user.name)},</p>
      <p>Welcome to AstraVox! Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    `,
  });
};

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isVerified: user.isVerified,
  totalInterviews: user.totalInterviews,
  averageScore: user.averageScore,
});

// Starts a session: refresh token in an httpOnly cookie, short-lived access token in the body.
const sendSession = (res, user, status) => {
  res.cookie('refreshToken', generateRefreshToken(user._id), refreshCookieOptions);
  res.status(status).json({ ...publicUser(user), token: generateAccessToken(user._id) });
};

// @route  POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ message: `Name must be ${MAX_NAME_LENGTH} characters or fewer` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      password: await hashPassword(password),
      verificationToken: newToken(),
    });

    sendVerificationEmail(user).catch((err) =>
      console.error('Verification email failed:', err.message)
    );

    sendSession(res, user, 201);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    sendSession(res, user, 200);
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/refresh
// shortcut: refresh tokens are stateless, so a password change does not revoke
// sessions on other devices until they expire (7 days). Add a per-user token
// version if that becomes a requirement.
const refresh = async (req, res) => {
  try {
    let decoded;
    try {
      decoded = jwt.verify(req.cookies.refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    const user = await User.exists({ _id: decoded.id });
    if (!user) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    res.status(200).json({ token: generateAccessToken(decoded.id) });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/logout
const logout = (req, res) => {
  res.clearCookie('refreshToken', refreshCookieOptions);
  res.status(200).json({ message: 'Logged out' });
};

// @route  GET /api/auth/profile
const getProfile = async (req, res) => {
  res.status(200).json(req.user);
};

// @route  PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) {
      if (!isValidName(name)) {
        return res.status(400).json({ message: 'Please enter a valid name' });
      }
      user.name = name.trim();
    }

    let emailChanged = false;
    if (email !== undefined) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        if (await User.exists({ email: normalizedEmail })) {
          return res.status(400).json({ message: 'That email is already in use' });
        }
        // A new address has not been proven to belong to this user yet.
        user.email = normalizedEmail;
        user.isVerified = false;
        user.verificationToken = newToken();
        emailChanged = true;
      }
    }

    const updatedUser = await user.save();

    if (emailChanged) {
      sendVerificationEmail(updatedUser).catch((err) =>
        console.error('Verification email failed:', err.message)
      );
    }

    res.status(200).json(publicUser(updatedUser));
  } catch (error) {
    serverError(res, error);
  }
};

// @route  PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== 'string' || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    }

    const user = await User.findById(req.user._id);

    // 400, not 401: the session is fine, only the submitted password is wrong.
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email });

    if (user) {
      const resetToken = newToken();
      user.resetPasswordToken = hashToken(resetToken);
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

      // The response is the same whether or not the account exists or the
      // email could be sent, so this endpoint cannot be used to find accounts.
      await sendEmail({
        to: user.email,
        subject: 'Reset your AstraVox password',
        html: `
          <p>Hi ${escapeHtml(user.name)},</p>
          <p>We received a request to reset your AstraVox password. Click the link below to set a new password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        `,
      }).catch((err) => console.error('Password reset email failed:', err.message));
    }

    res.status(200).json({ message: RESET_SENT_MESSAGE });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (typeof resetToken !== 'string' || !resetToken) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(resetToken),
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = await hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    serverError(res, error);
  }
};

// @route  POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    user.verificationToken = newToken();
    await user.save();

    try {
      await sendVerificationEmail(user);
    } catch (err) {
      console.error('Verification email failed:', err.message);
      return res
        .status(502)
        .json({ message: 'We could not send the verification email. Please try again later.' });
    }

    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    serverError(res, error);
  }
};

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
