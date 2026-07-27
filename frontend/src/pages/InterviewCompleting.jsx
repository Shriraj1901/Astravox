import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const interview = location.state?.interview;

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 900);

    let cancelled = false;

    api
      .post(`/interviews/${id}/end`)
      .then((res) => {
        if (!cancelled) {
          setTimeout(() => {
            navigate(`/interview/${id}/feedback`, { state: { interview: res.data } });
          }, stages.length * 900);
        }
      })
      .catch(() => {
        if (!cancelled) navigate(`/interview/${id}/feedback`);
      });

    return () => {
      cancelled = true;
      clearInterval(stageTimer);
    };
  }, [id, navigate]);

  if (!interview) {
    navigate(`/interview/${id}/feedback`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6">
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