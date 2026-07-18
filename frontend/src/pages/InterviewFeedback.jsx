import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const ScoreRing = ({ score }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-slate-500 text-sm">/ 100</span>
      </div>
    </div>
  );
};

const InterviewFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [interview, setInterview] = useState(location.state?.interview || null);
  const [loading, setLoading] = useState(!location.state?.interview);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (interview) {
      const t = setTimeout(() => setRevealed(true), 600);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (!cancelled) {
          setInterview(res.data);
          setTimeout(() => setRevealed(true), 600);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, interview]);

  if (loading || !interview) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Analyzing your responses...</p>
      </div>
    );
  }

  const { feedback } = interview;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div
        className={`transition-all duration-700 ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-center text-slate-400 mb-1">
          {interview.company} · {interview.role} · {interview.difficulty}
        </p>
        <h2 className="text-3xl font-semibold text-white text-center mb-8">
          Interview Complete
        </h2>

        <ScoreRing score={feedback.score} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-cyan-400 mb-3">Strengths</p>
            {feedback.strengths.length > 0 ? (
              <ul className="space-y-2">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-slate-300 text-sm flex gap-2">
                    <span className="text-cyan-400">+</span> {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No specific strengths identified this time.</p>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-amber-400 mb-3">Areas for Improvement</p>
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="text-slate-300 text-sm flex gap-2">
                  <span className="text-amber-400">−</span> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-4">
          <p className="text-sm text-slate-400 mb-3">Suggested Topics to Study</p>
          <div className="flex flex-wrap gap-2">
            {feedback.suggestedTopics.map((topic, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-4">
          <p className="text-sm text-slate-400 mb-2">Summary</p>
          <p className="text-slate-300 leading-relaxed text-sm">{feedback.summary}</p>
        </div>

        <div className="flex gap-3 mt-10">
          <button
            onClick={() => navigate('/interview/new')}
            className="flex-1 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Practice Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewFeedback;