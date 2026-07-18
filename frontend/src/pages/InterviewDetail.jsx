import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const InterviewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (!cancelled) setInterview(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this interview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
        {error || 'Interview not found'}
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/history" className="text-sm text-cyan-400 hover:underline mb-6 inline-block">
          ← Back to History
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {interview.company} — {interview.role}
            </h2>
            <p className="text-slate-500 text-sm mt-1">{interview.difficulty} Difficulty</p>
          </div>
          {interview.feedback?.score != null && (
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-400">{interview.feedback.score}</p>
              <p className="text-slate-500 text-xs">/ 100</p>
            </div>
          )}
        </div>

        {interview.feedback?.summary && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
            <p className="text-sm text-slate-400 mb-2">Summary</p>
            <p className="text-slate-300 text-sm leading-relaxed">{interview.feedback.summary}</p>
          </div>
        )}

        <p className="text-sm text-slate-400 mb-4">Questions & Answers</p>
        <div className="space-y-4 mb-10">
          {interview.qaPairs.map((qa, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-cyan-400 mb-2">Question {i + 1}</p>
              <p className="text-white text-sm mb-3 leading-relaxed">{qa.question}</p>
              <p className="text-xs text-slate-500 mb-1">Your Answer</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                {qa.answer || <span className="text-slate-600 italic">No answer given</span>}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/interview/new')}
          className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
        >
          Practice Again
        </button>
      </div>
    </div>
  );
};

export default InterviewDetail;