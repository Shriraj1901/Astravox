import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Astra<span className="text-cyan-400">Vox</span>
          </h1>
          <p className="text-slate-400 mt-2">Reset your password</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <p className="text-slate-400 text-sm mb-5">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <label className="block text-sm text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition mb-6"
                placeholder="jane@example.com"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold transition"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p className="text-center text-sm text-slate-400 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-cyan-400 hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
                  <path d="M4 4h16v16H4V4z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">Check your email</p>
              <p className="text-slate-400 text-sm mb-6">
                If an account with that email exists, we&apos;ve sent a password reset link. It
                will expire in 15 minutes.
              </p>
              <Link
                to="/login"
                className="inline-block px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;