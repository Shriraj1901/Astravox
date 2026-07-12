const mongoose = require('mongoose');

const questionAnswerSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    company: { type: String, required: true },
    role: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: true,
    },
    qaPairs: [questionAnswerSchema],
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress',
    },
    feedback: {
      score: { type: Number, default: null },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      suggestedTopics: [{ type: String }],
      summary: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', interviewSchema);