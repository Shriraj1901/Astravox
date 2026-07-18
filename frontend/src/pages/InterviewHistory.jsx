import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const InterviewHistory = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get('/interviews')
      .then((res) => {
        if (!cancelled) setInterviews(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your interview history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-1">Interview History</h2>
        <p className="text-slate-400 mb-10">Review your past practice sessions</p>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {interviews.length === 0 && !error ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">You haven&apos;t completed any interviews yet.</p>
            <Link
              to="/interview/new"
              className="inline-block px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
            >
              Start Your First Interview
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((interview) => (
              <Link
                key={interview._id}
                to={`/history/${interview._id}`}
                className="flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
              >
                <div>
                  <p className="text-white font-medium group-hover:text-cyan-400 transition">
                    {interview.company} — {interview.role}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    {interview.difficulty} · {formatDate(interview.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      interview.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                  {interview.feedback?.score != null && (
                    <span className="text-xl font-bold text-cyan-400 w-14 text-right">
                      {interview.feedback.score}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewHistory;