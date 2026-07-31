# AstraVox — Verified Implementation Documentation

This document is based on the implementation currently present in this repository. It is written from the code in [backend](backend), [frontend](frontend), and the root project configuration.

## 1. What the application does

AstraVox is a mock-interview preparation platform with:

- user authentication and profile management
- AI-generated interview questions
- voice-style interview sessions with speech-to-text input and camera access
- focus-loss tracking during interviews
- AI-generated interview feedback and scoring
- resume upload and analysis for tailored interview questions
- dashboards for readiness, activity streaks, interview history, and profile management

The implementation is split between a Node.js/Express backend and a React/Vite frontend.

## 2. Repository structure

### Root

- [package.json](package.json) — root scripts for installing dependencies and running the app.
- [README.md](README.md) — this implementation documentation.
- [backend](backend) — Express server, API routes, database models, and AI/email services.
- [frontend](frontend) — React application and UI pages.

### Backend folders

- [backend/config](backend/config) — database connection setup.
- [backend/controllers](backend/controllers) — request handlers for auth, interviews, and resumes.
- [backend/middleware](backend/middleware) — authentication middleware.
- [backend/models](backend/models) — Mongoose schemas.
- [backend/routes](backend/routes) — API route definitions.
- [backend/services](backend/services) — AI and email integration.
- [backend/utils](backend/utils) — token generation utility.

### Frontend folders

- [frontend/src](frontend/src) — app entry, routing, context, pages, API utility, and face-detection logic.
- [frontend/src/api](frontend/src/api) — shared Axios instance.
- [frontend/src/components](frontend/src/components) — shared layout and route protection components.
- [frontend/src/context](frontend/src/context) — authentication context.
- [frontend/src/pages](frontend/src/pages) — page-level React components.
- [frontend/src/utils](frontend/src/utils) — browser-based face detection helpers.
- [frontend/public](frontend/public) — static assets.

## 3. Architecture and request flow

### Backend runtime

The backend entry point is [backend/server.js](backend/server.js). It:

- loads environment variables with dotenv
- connects to MongoDB through [backend/config/db.js](backend/config/db.js)
- mounts API routers for auth, interviews, and resumes
- serves the frontend build from [frontend/dist](frontend/dist) when present

### Frontend runtime

The frontend entry point is [frontend/src/main.jsx](frontend/src/main.jsx), which renders [frontend/src/App.jsx](frontend/src/App.jsx). The app uses React Router and an auth context.

### Authentication flow

1. The user signs up or logs in through the frontend pages.
2. The frontend sends requests to the backend API under /api.
3. The backend validates a JWT from the Authorization header using [backend/middleware/authMiddleware.js](backend/middleware/authMiddleware.js).
4. The frontend stores the token in localStorage and restores the session via [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx).

## 4. Backend implementation

### 4.1 Server and middleware

- [backend/server.js](backend/server.js)
  - configures Express
  - enables CORS from the CLIENT_URL environment variable
  - applies JSON parsing and security middleware
  - exposes the health endpoint at /api/health
  - mounts /api/auth, /api/interviews, and /api/resume

- [backend/middleware/authMiddleware.js](backend/middleware/authMiddleware.js)
  - validates Bearer tokens with jsonwebtoken
  - loads the authenticated user from MongoDB
  - rejects missing or invalid tokens with 401 responses

### 4.2 Routes and API endpoints

#### Auth routes

Defined in [backend/routes/authRoutes.js](backend/routes/authRoutes.js):

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/auth/profile
- PUT /api/auth/profile
- PUT /api/auth/change-password
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- GET /api/auth/verify-email
- POST /api/auth/resend-verification

Implemented in [backend/controllers/authController.js](backend/controllers/authController.js).

#### Interview routes

Defined in [backend/routes/interviewRoutes.js](backend/routes/interviewRoutes.js):

- POST /api/interviews/start
- POST /api/interviews/:id/answer
- POST /api/interviews/:id/end
- POST /api/interviews/:id/focus-loss
- GET /api/interviews/readiness
- GET /api/interviews/activity
- GET /api/interviews
- GET /api/interviews/:id

Implemented in [backend/controllers/interviewController.js](backend/controllers/interviewController.js).

#### Resume routes

Defined in [backend/routes/resumeRoutes.js](backend/routes/resumeRoutes.js):

- POST /api/resume/upload
- GET /api/resume
- DELETE /api/resume

Implemented in [backend/controllers/resumeController.js](backend/controllers/resumeController.js).

### 4.3 Models

- [backend/models/User.js](backend/models/User.js)
  - stores name, email, password hash, interview stats, password-reset fields, email-verification fields, and resume data
  - includes a nested resume object with fileName, rawText, uploadedAt, and AI analysis fields

- [backend/models/Interview.js](backend/models/Interview.js)
  - stores the user reference, company, role, difficulty, interview type, QA pairs, status, focus-loss count, and feedback
  - QA pairs include the interviewer question, candidate answer, and speech metrics

### 4.4 Services

- [backend/services/aiService.js](backend/services/aiService.js)
  - creates an OpenAI-compatible client using the OPENAI_API_KEY and OPENAI_BASE_URL environment variables
  - generates the next interview question based on company, role, difficulty, interview type, prior answers, and resume context
  - generates structured feedback from the completed transcript
  - analyzes uploaded resumes into skills, strengths, gaps, and summary

- [backend/services/emailService.js](backend/services/emailService.js)
  - sends email notifications for account verification and password reset using nodemailer and Gmail credentials

- [backend/utils/generateToken.js](backend/utils/generateToken.js)
  - creates JWTs for authenticated users using the JWT_SECRET and JWT_EXPIRES_IN environment variables

### 4.5 Database interaction

- [backend/config/db.js](backend/config/db.js) connects to MongoDB using Mongoose.
- The backend uses MongoDB for:
  - user accounts and authentication state
  - interview sessions and answers
  - resume documents and analysis metadata

## 5. Frontend implementation

### 5.1 App routing

The top-level router is defined in [frontend/src/App.jsx](frontend/src/App.jsx). The implemented routes are:

- / — landing page
- /signup — signup page
- /login — login page
- /forgot-password — password reset request page
- /reset-password — password reset form
- /verify-email — email verification confirmation page
- /dashboard — protected dashboard
- /interview/new — protected interview setup page
- /interview/:id — protected live interview page
- /interview/:id/feedback — protected feedback page
- /history — protected interview history page
- /history/:id — protected interview detail page
- /profile — protected profile page
- /interview/:id/prep — protected interview preparation page
- /interview/:id/completing — protected completion transition page

### 5.2 Shared frontend infrastructure

- [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx)
  - provides authentication state and login/logout helpers
  - restores the current user from the backend /api/auth/profile endpoint if a token exists

- [frontend/src/api/axios.js](frontend/src/api/axios.js)
  - creates a shared Axios instance with baseURL /api
  - attaches the Authorization header for Bearer tokens automatically

- [frontend/src/components/ProtectedRoute.jsx](frontend/src/components/ProtectedRoute.jsx)
  - blocks access to protected pages until auth is resolved

- [frontend/src/components/Layout.jsx](frontend/src/components/Layout.jsx)
  - provides the common shell with navigation and logout behavior

- [frontend/src/components/ErrorBoundary.jsx](frontend/src/components/ErrorBoundary.jsx)
  - catches rendering errors and routes the user back to the dashboard

### 5.3 Pages and their implemented behavior

- [frontend/src/pages/Landing.jsx](frontend/src/pages/Landing.jsx)
  - marketing/home page with feature highlights and FAQ content

- [frontend/src/pages/Signup.jsx](frontend/src/pages/Signup.jsx)
  - submits signup data to /api/auth/signup and stores the returned token

- [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)
  - submits login credentials to /api/auth/login and stores the returned token

- [frontend/src/pages/ForgotPassword.jsx](frontend/src/pages/ForgotPassword.jsx)
  - sends a password-reset email request to /api/auth/forgot-password

- [frontend/src/pages/ResetPassword.jsx](frontend/src/pages/ResetPassword.jsx)
  - submits a reset token and new password to /api/auth/reset-password

- [frontend/src/pages/VerifyEmail.jsx](frontend/src/pages/VerifyEmail.jsx)
  - verifies the email token via /api/auth/verify-email

- [frontend/src/pages/Dashboard.jsx](frontend/src/pages/Dashboard.jsx)
  - fetches readiness and activity metrics from /api/interviews/readiness and /api/interviews/activity
  - displays a readiness ring and a 90-day activity heatmap

- [frontend/src/pages/NewInterview.jsx](frontend/src/pages/NewInterview.jsx)
  - collects company, role, difficulty, and interview type
  - starts a new interview via /api/interviews/start

- [frontend/src/pages/InterviewPrep.jsx](frontend/src/pages/InterviewPrep.jsx)
  - asks for camera and microphone access before the live interview begins
  - transitions into the interview session after a countdown

- [frontend/src/pages/InterviewSession.jsx](frontend/src/pages/InterviewSession.jsx)
  - loads the interview from /api/interviews/:id
  - uses speech recognition for voice input when supported by the browser
  - uses camera input and face-api.js for delivery metrics
  - submits answers to /api/interviews/:id/answer
  - records tab-switching focus loss via /api/interviews/:id/focus-loss

- [frontend/src/pages/InterviewCompleting.jsx](frontend/src/pages/InterviewCompleting.jsx)
  - triggers /api/interviews/:id/end and navigates to the feedback page

- [frontend/src/pages/InterviewFeedback.jsx](frontend/src/pages/InterviewFeedback.jsx)
  - displays the AI-generated feedback and score from the completed interview

- [frontend/src/pages/InterviewHistory.jsx](frontend/src/pages/InterviewHistory.jsx)
  - loads the user’s interview history from /api/interviews

- [frontend/src/pages/InterviewDetail.jsx](frontend/src/pages/InterviewDetail.jsx)
  - loads an individual interview and shows its questions and answers

- [frontend/src/pages/Profile.jsx](frontend/src/pages/Profile.jsx)
  - updates profile details, changes the password, uploads a resume, and displays achievements based on interview stats

- [frontend/src/pages/NotFound.jsx](frontend/src/pages/NotFound.jsx)
  - renders the 404 fallback route

### 5.4 Face detection and browser features

- [frontend/src/utils/faceDetection.js](frontend/src/utils/faceDetection.js)
  - loads face-api.js models from a remote CDN
  - detects faces and expressions from a video element
  - aggregates samples into a summary used for interview metrics

## 6. Environment variables

The application expects the following environment variables in [backend/.env](backend/.env):

- PORT — server port, defaulting to 5000 when not set
- MONGO_URI — MongoDB connection string
- JWT_SECRET — secret used to sign JWTs
- JWT_EXPIRES_IN — JWT lifetime, defaulting to 7d
- OPENAI_API_KEY — API key for the OpenAI-compatible client
- OPENAI_BASE_URL — base URL for the AI provider
- OPENAI_MODEL — model name used for question generation and feedback
- CLIENT_URL — frontend URL used in email links and CORS configuration
- EMAIL_USER — Gmail account used by nodemailer
- EMAIL_APP_PASSWORD — app-specific Gmail password

## 7. Dependencies

### Backend dependencies

Defined in [backend/package.json](backend/package.json):

- express
- cors
- dotenv
- helmet
- jsonwebtoken
- mongoose
- multer
- nodemailer
- openai
- pdf-parse
- bcryptjs
- express-rate-limit

### Frontend dependencies

Defined in [frontend/package.json](frontend/package.json):

- react
- react-dom
- react-router-dom
- axios
- face-api.js
- tailwindcss
- vite

## 8. Verified implementation notes

- The repository currently implements a working authentication flow, interview lifecycle, AI-assisted question generation, AI-based feedback generation, resume analysis, and protected frontend routes.
- The code uses MongoDB as the persistence layer and JWTs for backend authentication.
- The live interview page includes browser-based voice input and camera-based delivery metrics, but it depends on browser support for speech recognition and camera access.
- The frontend is served from the backend in production-style mode, with the backend serving the built frontend files when available.

