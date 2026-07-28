import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import InterviewSession from './pages/InterviewSession';
import InterviewFeedback from './pages/InterviewFeedback';
import InterviewHistory from './pages/InterviewHistory';
import InterviewDetail from './pages/InterviewDetail';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import Landing from './pages/Landing';
import InterviewPrep from './pages/InterviewPrep';
import NotFound from './pages/NotFound';
import InterviewCompleting from './pages/InterviewCompleting';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/interview/new" element={<NewInterview />} />
              <Route path="/interview/:id" element={<InterviewSession />} />
              <Route path="/interview/:id/feedback" element={<InterviewFeedback />} />
              <Route path="/history" element={<InterviewHistory />} />
              <Route path="/history/:id" element={<InterviewDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/interview/:id/prep" element={<InterviewPrep />} />
              <Route path="/interview/:id/completing" element={<InterviewCompleting />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;