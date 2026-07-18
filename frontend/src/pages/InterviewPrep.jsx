import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const tips = [
  'Speak (or type) in clear, structured sentences — consider using the STAR method for behavioral questions.',
  'It\'s okay to pause and think before answering. Quality matters more than speed.',
  'Be specific — concrete examples score much higher than general statements.',
];

const InterviewPrep = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const interview = location.state?.interview;

  const [count, setCount] = useState(5);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (count === 0) {
      setStarting(true);
      const t = setTimeout(() => navigate(`/interview/${id}`, { state: { interview } }), 700);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id, interview, navigate]);

  if (!interview) {
    navigate('/interview/new', { replace: true });
    return null;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <p className="text-slate-400 text-sm mb-2">Get ready</p>
        <h2 className="text-2xl font-semibold text-white mb-8">
          {interview.company} · {interview.role} · {interview.difficulty}
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 mb-8">
          {!starting ? (
            <>
              <p className="text-6xl font-bold text-cyan-400 tabular-nums mb-2">{count}</p>
              <p className="text-slate-500 text-sm">Interview starts in...</p>
            </>
          ) : (
            <p className="text-2xl font-semibold text-white">Good luck.</p>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 mb-6 text-left">
          <p className="text-slate-400 text-xs leading-relaxed">
            This interview is designed to help you improve. Please answer without external
            assistance for the most accurate feedback.
          </p>
        </div>
          {tips.map((tip, i) => (
            <p key={i} className="text-slate-400 text-sm flex gap-2">
              <span className="text-cyan-400 shrink-0">•</span> {tip}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;