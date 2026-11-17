import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import api from '../api/axios';

const stages = [
  'Interview complete.',
  'Analyzing your responses...',
  'Evaluating communication...',
  'Reviewing technical accuracy...',
  'Generating personalized feedback...',
];

const InterviewCompleting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const hasInterview = Boolean(location.state?.interview);

  useEffect(() => {
    if (!hasInterview) return;

    const stageTimer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 900);

    let cancelled = false;
    let redirectTimer;

    api
      .post(`/interviews/${id}/end`)
      .then((res) => {
        if (cancelled) return;
        // Let the progress messages play out before revealing the report.
        redirectTimer = setTimeout(() => {
          navigate(`/interview/${id}/feedback`, { replace: true, state: { interview: res.data } });
        }, stages.length * 900);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.message || 'We could not generate your feedback. Please try again.'
        );
      });

    return () => {
      cancelled = true;
      clearInterval(stageTimer);
      clearTimeout(redirectTimer);
    };
  }, [id, navigate, hasInterview, attempt]);

  if (!hasInterview) {
    return <Navigate to={`/interview/${id}/feedback`} replace />;
  }

  if (error) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-white text-lg font-medium mb-2">Feedback unavailable</p>
          <p className="text-slate-400 text-sm mb-6">{error} Your answers are saved.</p>
          <button
            onClick={() => {
              setError('');
              setStageIndex(0);
              setAttempt((a) => a + 1);
            }}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6" role="status" aria-live="polite">
      <div className="text-center max-w-md">
        <div className="w-10 h-10 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-8" />
        <p className="text-white text-lg font-medium transition-all duration-500">
          {stages[stageIndex]}
        </p>
      </div>
    </div>
  );
};

export default InterviewCompleting;
