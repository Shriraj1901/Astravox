const { PDFParse } = require('pdf-parse');
const User = require('../models/User');
const { analyzeResume } = require('../services/aiService');
const serverError = require('../utils/serverError');

const MAX_RESUME_CHARS = 5000;

const INJECTION_PATTERNS = [
  /ignore (all|previous|the above)\s+instructions/gi,
  /disregard (all|previous|the above)\s+instructions/gi,
  /you are now/gi,
  /^system:/gim,
  /^assistant:/gim,
  /new instructions:/gi,
];

const sanitizeResumeText = (text) => {
  let cleaned = text;
  INJECTION_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '[removed]');
  });
  return cleaned.slice(0, MAX_RESUME_CHARS);
};

// @route  POST /api/resume/upload
const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a PDF file' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are supported' });
    }

    let extractedText;
    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      extractedText = parsed.text.trim();
    } catch {
      // A corrupt or password-protected file is the user's to fix, not a server fault.
      return res
        .status(400)
        .json({ message: 'This PDF could not be read. Please try a different file.' });
    }

    if (!extractedText || extractedText.length < 50) {
      return res.status(400).json({
        message: 'Could not extract enough text from this PDF. Please try a different file.',
      });
    }

    const rawText = sanitizeResumeText(extractedText);

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
    serverError(res, error);
  }
};

// @route  GET /api/resume
const getResume = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('resume');
    res.status(200).json(user.resume);
  } catch (error) {
    serverError(res, error);
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
    serverError(res, error);
  }
};

module.exports = { uploadResume, getResume, deleteResume };