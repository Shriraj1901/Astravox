import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-white font-medium mb-2">Invalid reset link</p>
          <p className="text-slate-400 text-sm mb-6">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Astra<span className="text-cyan-400">Vox</span>
          </h1>
          <p className="text-slate-400 mt-2">Set a new password</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!done ? (
            <form onSubmit={handleSubmit}>
              <label className="block text-sm text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition mb-6"
                placeholder="At least 6 characters"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold transition"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-white font-medium mb-1">Password reset successful</p>
              <p className="text-slate-400 text-sm mb-6">You can now log in with your new password.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;