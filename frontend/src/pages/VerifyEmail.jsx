import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-8">
          Astra<span className="text-cyan-400">Vox</span>
        </h1>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          {status === 'verifying' && (
            <>
              <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <p className="text-white font-medium mb-2">Email verified!</p>
              <p className="text-slate-400 text-sm mb-6">
                Your email has been successfully verified.
              </p>
              <Link
                to="/dashboard"
                className="inline-block px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
              >
                Go to Dashboard
              </Link>
            </>
          )}

          {(status === 'error' || status === 'invalid') && (
            <>
              <p className="text-white font-medium mb-2">Verification failed</p>
              <p className="text-slate-400 text-sm mb-6">
                This verification link is invalid or has expired.
              </p>
              <Link
                to="/dashboard"
                className="inline-block px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
              >
                Go to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;