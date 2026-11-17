require('dotenv').config();

// Fail at boot with a clear message instead of on the first request that needs the value.
const missingEnv = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'OPENAI_API_KEY'].filter(
  (name) => !process.env[name]
);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}
if (!process.env.CLIENT_URL) {
  console.warn('CLIENT_URL is not set: email links and cross-origin requests will not work.');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const serverError = require('./utils/serverError');

const app = express();

app.set('trust proxy', 1);

connectDB();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.CLIENT_URL, 'https://cdn.jsdelivr.net'].filter(Boolean),
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "blob:"],
    },
  },
}));

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// Express 5 leaves req.body undefined when a request has no body; handlers destructure it.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use('/api/resume', resumeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AstraVox API is running' });
});

// Unknown API paths get a JSON 404 rather than falling through to the SPA's index.html.
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
  });
}

// Catches everything the controllers do not: bad JSON, oversized uploads, middleware failures.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => serverError(res, err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
