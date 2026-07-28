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

const ActivityHeatmap = ({ countsByDay }) => {
  const days = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ key, count: countsByDay[key] || 0 });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const intensity = (count) => {
    if (count === 0) return 'bg-slate-800';
    if (count === 1) return 'bg-cyan-900';
    if (count === 2) return 'bg-cyan-700';
    return 'bg-cyan-400';
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day.key}
              title={`${day.key}: ${day.count} interview${day.count !== 1 ? 's' : ''}`}
              className={`w-3 h-3 rounded-sm ${intensity(day.count)}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [readiness, setReadiness] = useState(null);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get('/interviews/readiness')
      .then((res) => {
        if (!cancelled) setReadiness(res.data);
      })
      .catch(() => {});

    api
      .get('/interviews/activity')
      .then((res) => {
        if (!cancelled) setActivity(res.data);
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
        <div className="flex items-center justify-between flex-wrap gap-4 mb-1">
          <h2 className="text-3xl font-semibold text-white">
            Welcome back, {user?.name?.split(' ')[0]}
          </h2>
          {activity && activity.streak > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-400 text-sm font-medium">
                🔥 {activity.streak} day streak
              </span>
            </div>
          )}
        </div>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {activity && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-white font-medium mb-1">Practice Activity</p>
            <p className="text-slate-400 text-sm mb-4">Last 90 days</p>
            <ActivityHeatmap countsByDay={activity.countsByDay} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;