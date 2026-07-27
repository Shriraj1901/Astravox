import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const tips = [
  'Speak clearly and at a natural pace — the AI is listening and analyzing your delivery.',
  'It\'s okay to pause and think before answering. Quality matters more than speed.',
  'Be specific — concrete examples score much higher than general statements.',
];

const InterviewPrep = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const interview = location.state?.interview;

  const [permissionStatus, setPermissionStatus] = useState('pending');
  const [permissionError, setPermissionError] = useState('');
  const [count, setCount] = useState(5);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const requestPermissions = async () => {
    setPermissionStatus('requesting');
    setPermissionError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPermissionStatus('granted');
    } catch {
      setPermissionStatus('denied');
      setPermissionError(
        'Camera and microphone access are required to start this interview. Please allow access and try again.'
      );
    }
  };

  useEffect(() => {
    if (permissionStatus !== 'granted') return;
    if (count === 0) {
      setStarting(true);
      const t = setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        navigate(`/interview/${id}`, { state: { interview } });
      }, 700);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, id, interview, navigate, permissionStatus]);

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

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 mb-6 text-left">
          <p className="text-slate-400 text-xs leading-relaxed">
            This interview is designed to help you improve. Please answer without external
            assistance for the most accurate feedback.
          </p>
        </div>

        {permissionStatus !== 'granted' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
            <p className="text-white font-medium mb-2">Camera & Microphone Required</p>
            <p className="text-slate-400 text-sm mb-6">
              This interview uses your camera and microphone to give you the most realistic
              practice experience and accurate delivery feedback.
            </p>

            {permissionError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-left">
                {permissionError}
              </div>
            )}

            <button
              onClick={requestPermissions}
              disabled={permissionStatus === 'requesting'}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold transition"
            >
              {permissionStatus === 'requesting' ? 'Requesting access...' : 'Allow Camera & Microphone'}
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video mb-5">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <span className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/80 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            {!starting ? (
              <>
                <p className="text-6xl font-bold text-cyan-400 tabular-nums mb-2">{count}</p>
                <p className="text-slate-500 text-sm">Interview starts in...</p>
              </>
            ) : (
              <p className="text-2xl font-semibold text-white">Good luck.</p>
            )}
          </div>
        )}

        <div className="text-left space-y-3">
          <p className="text-slate-500 text-xs uppercase tracking-wide">Quick Tips</p>
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