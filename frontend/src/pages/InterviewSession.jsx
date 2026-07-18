import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const MAX_QUESTIONS = 5;

const InterviewSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingInterview, setLoadingInterview] = useState(true);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [blurCount, setBlurCount] = useState(0);
  const bottomRef = useRef(null);

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
        if (!cancelled) setLoadingInterview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview]);

  useEffect(() => {
    const handleBlur = () => {
      setBlurCount((c) => c + 1);
      setTabWarning(true);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/interviews/${id}/answer`, { answer });
      setInterview(res.data.interview);
      setAnswer('');

      if (res.data.done) {
        const feedbackRes = await api.post(`/interviews/${id}/end`);
        navigate(`/interview/${id}/feedback`, { state: { interview: feedbackRes.data } });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInterview) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-slate-400">
        {error || 'Interview not found'}
      </div>
    );
  }

  const questionNumber = interview.qaPairs.length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-6">
      {tabWarning && (
        <div className="lg:col-span-3 -mb-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center justify-between">
          <span>
            You switched away from this tab. For the most accurate feedback, try to stay focused
            on the interview.
          </span>
          <button onClick={() => setTabWarning(false)} className="text-amber-400 hover:text-amber-300 ml-4">
            ✕
          </button>
        </div>
      )}

      <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit">
        <p className="text-xs text-cyan-400 uppercase tracking-wide mb-4">AI Interviewer</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Company</p>
            <p className="text-white">{interview.company}</p>
          </div>
          <div>
            <p className="text-slate-500">Role</p>
            <p className="text-white">{interview.role}</p>
          </div>
          <div>
            <p className="text-slate-500">Difficulty</p>
            <p className="text-white">{interview.difficulty}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <p className="text-cyan-400 capitalize">{interview.status.replace('-', ' ')}</p>
          </div>
        </div>
      </aside>

      <section className="flex flex-col">
        <div className="flex-1 space-y-6 mb-6">
          {interview.qaPairs.map((qa, i) => (
            <div key={i} className="space-y-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 max-w-2xl">
                <p className="text-xs text-cyan-400 mb-1.5">Interviewer</p>
                <p className="text-white leading-relaxed">{qa.question}</p>
              </div>
              {qa.answer && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-tr-sm px-5 py-4 max-w-2xl ml-auto">
                  <p className="text-xs text-cyan-400 mb-1.5">You</p>
                  <p className="text-white leading-relaxed">{qa.answer}</p>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {interview.status === 'in-progress' && (
          <form onSubmit={handleSubmit} className="sticky bottom-6">
            {error && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-end gap-3">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                rows={3}
                className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting || !answer.trim()}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold transition shrink-0"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        )}
      </section>

      <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit space-y-6">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Timer</p>
          <p className="text-2xl font-mono text-white">{formatTime(seconds)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Progress</p>
          <p className="text-sm text-slate-300 mb-2">
            Question {questionNumber} of {MAX_QUESTIONS}
          </p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${(questionNumber / MAX_QUESTIONS) * 100}%` }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default InterviewSession;