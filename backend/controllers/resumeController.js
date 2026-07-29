const pdfParse = require('pdf-parse');
const User = require('../models/User');
const { analyzeResume } = require('../services/aiService');

// @route  POST /api/resume/upload
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are supported' });
    }

    const parsed = await pdfParse(req.file.buffer);
    const rawText = parsed.text.trim();

    if (!rawText || rawText.length < 50) {
      return res.status(400).json({
        message: 'Could not extract enough text from this PDF. Please try a different file.',
      });
    }

    const analysis = await analyzeResume(rawText);

    const user = await User.findById(req.user._id);
    user.resume = {
      fileName: req.file.originalname,
      rawText,
      uploadedAt: new Date(),
      analysis,
    };
    await user.save();

    res.status(200).json({ resume: user.resume });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  GET /api/resume
const getResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('resume');
    res.status(200).json(user.resume);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @route  DELETE /api/resume
const deleteResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.resume = {
      fileName: null,
      rawText: null,
      uploadedAt: null,
      analysis: { skills: [], strengths: [], gaps: [], summary: '' },
    };
    await user.save();
    res.status(200).json({ message: 'Resume removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { uploadResume, getResume, deleteResume };