require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');

const app = express();

connectDB();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/api/resume', resumeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AstraVox API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const path = require('path');

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});