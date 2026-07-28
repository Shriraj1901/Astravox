const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../services/emailService');

// @route  POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });

    const token = generateToken(user._id);
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    sendEmail({
      to: user.email,
      subject: 'Verify your AstraVox email',
      html: `
        <p>Hi ${user.name},</p>
        <p>Welcome to AstraVox! Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
      `,
    }).catch((err) => console.error('Verification email failed:', err.message));

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/auth/profile
const getProfile = async (req, res) => {
  res.status(200).json(req.user);
};

// @route  PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      totalInterviews: updatedUser.totalInterviews,
      averageScore: updatedUser.averageScore,
      isVerified: updatedUser.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your AstraVox password',
      html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your AstraVox password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    res.status(200).json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Verify your AstraVox email',
      html: `
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      `,
    });

    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};