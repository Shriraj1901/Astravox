import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const ReadinessRing = ({ score }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-slate-500 text-xs">/ 100</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/interviews/readiness')
      .then((res) => {
        if (!cancelled) setReadiness(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-1">
          Welcome back, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-slate-400 mb-10">Ready for your next practice interview?</p>

        {readiness && readiness.totalInterviews > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 flex items-center gap-6 flex-wrap">
            <ReadinessRing score={readiness.readinessScore} />
            <div>
              <p className="text-white font-medium mb-1">Interview Readiness</p>
              <p className="text-slate-400 text-sm mb-3 max-w-sm">
                A combined view of your average score and consistency across{' '}
                {readiness.totalInterviews} completed interview
                {readiness.totalInterviews !== 1 ? 's' : ''}.
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-400">
                  Avg score: <span className="text-white font-medium">{readiness.avgScore}</span>
                </span>
                <span className="text-slate-400">
                  Consistency:{' '}
                  <span className="text-white font-medium">{readiness.consistency}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Total Interviews</p>
            <p className="text-3xl font-bold text-white">{user?.totalInterviews ?? 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Average Score</p>
            <p className="text-3xl font-bold text-cyan-400">
              {user?.averageScore ? Math.round(user.averageScore) : 0}%
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center">
            <button
              onClick={() => navigate('/interview/new')}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;