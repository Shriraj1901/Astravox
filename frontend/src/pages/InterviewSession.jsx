import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { loadFaceModels, detectFaces, aggregateFaceSamples } from '../utils/faceDetection';

const MAX_QUESTIONS = 5;
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of'];

const countFillerWords = (text) => {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
};

const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

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
  const [aiThinking, setAiThinking] = useState('');

  const [listening, setListening] = useState(false);
  const speechSupported = Boolean(SpeechRecognitionAPI);
  const [micError, setMicError] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('pending');

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const speechStartRef = useRef(null);
  const resultTimestampsRef = useRef([]);
  const lastQuestionSpokenRef = useRef(null);
  const faceSamplesRef = useRef([]);
  const detectionIntervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadFaceModels()
      .then(() => console.log('Face models loaded successfully'))
      .catch((err) => console.error('Face model load failed:', err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/interviews/${id}`)
      .then((res) => {
        if (cancelled) return;
        // A finished interview has nothing left to answer; show its results instead.
        if (res.data.status === 'completed') {
          navigate(`/interview/${id}/feedback`, { replace: true });
          return;
        }
        setInterview(res.data);
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
  }, [id, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interview]);

  useEffect(() => {
    const handleBlur = () => {
      setTabWarning(true);
      api.post(`/interviews/${id}/focus-loss`).catch(() => {});
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    // mediaDevices is undefined on non-HTTPS pages, so guard before calling it.
    if (!navigator.mediaDevices?.getUserMedia) {
      Promise.resolve().then(() => !cancelled && setCameraStatus('denied'));
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setCameraStatus('granted');
      })
      .catch(() => {
        if (!cancelled) setCameraStatus('denied');
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // The <video> element only exists once the interview has loaded, which can be
  // after the camera stream is ready, so attach the stream whenever either changes.
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraStatus, interview]);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      resultTimestampsRef.current.push(Date.now());
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswer(transcript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone access is blocked. Allow it in your browser settings, or type your answer instead.');
      } else if (event.error === 'network') {
        setMicError('Voice recognition lost its connection. You can try again or type your answer.');
      }
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.abort();
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || listening || !mountedRef.current) return;
    setMicError('');
    setAnswer('');
    speechStartRef.current = Date.now();
    resultTimestampsRef.current = [];
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // start() throws if recognition is already running; that state is fine.
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  };

  useEffect(() => {
    if (!interview || !window.speechSynthesis) return;
    const lastQA = interview.qaPairs[interview.qaPairs.length - 1];
    if (!lastQA || lastQA.question === lastQuestionSpokenRef.current) return;
    if (lastQA.answer) return;

    lastQuestionSpokenRef.current = lastQA.question;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastQA.question);
    utterance.rate = 1;

    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => {
      setAiSpeaking(false);
      if (speechSupported) startListening();
    };
    utterance.onerror = () => setAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
    // startListening only reads refs and is meant to run once per new question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, speechSupported]);

  // Face detection loop — runs only while actively listening
  useEffect(() => {
    if (!listening || cameraStatus !== 'granted') {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    faceSamplesRef.current = [];

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      const detections = await detectFaces(videoRef.current);

      let topExpression = null;
      if (detections.length > 0 && detections[0].expressions) {
        const expressions = detections[0].expressions;
        topExpression = Object.entries(expressions).sort((a, b) => b[1] - a[1])[0][0];
      }

      faceSamplesRef.current.push({
        faceCount: detections.length,
        expression: topExpression,
      });
    }, 2000);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [listening, cameraStatus]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const computeSpeechMetrics = () => {
    if (!speechStartRef.current) return null;

    const durationSeconds = Math.round((Date.now() - speechStartRef.current) / 1000);
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
    const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
    const fillerWordCount = countFillerWords(answer);

    let pauseCount = 0;
    const timestamps = resultTimestampsRef.current;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] > 2000) pauseCount++;
    }

    const faceMetrics = aggregateFaceSamples(faceSamplesRef.current);

    return { durationSeconds, wordsPerMinute, fillerWordCount, pauseCount, ...faceMetrics };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;

    if (listening) stopListening();

    const speechMetrics = computeSpeechMetrics();

    setSubmitting(true);
    setError('');
    setAiThinking('Analyzing your response...');

    try {
      const res = await api.post(`/interviews/${id}/answer`, { answer, speechMetrics });
      setAnswer('');
      speechStartRef.current = null;

      if (res.data.done) {
        setInterview(res.data.interview);
        navigate(`/interview/${id}/completing`, { state: { interview: res.data.interview } });
        return;
      }

      setAiThinking('Preparing the next question...');
      await new Promise((resolve) => setTimeout(resolve, 900));

      setInterview(res.data.interview);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
      setAiThinking('');
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

  if (cameraStatus === 'denied') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-white font-medium mb-2">Camera access is required</p>
          <p className="text-slate-400 text-sm mb-6">
            This interview requires camera access for the full experience. Please allow camera
            access in your browser settings and reload this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Reload Page
          </button>
        </div>
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

      <aside className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-fit space-y-5">
        <div>
          <p className="text-xs text-cyan-400 uppercase tracking-wide mb-3">You</p>
          <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {cameraStatus === 'granted' && (
              <span className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/80 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-3 text-sm">
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

          {aiSpeaking && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 max-w-2xl">
              <p className="text-xs text-cyan-400 mb-1.5">Interviewer</p>
              <div className="flex gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {interview.status === 'in-progress' && (
          <form onSubmit={handleSubmit} className="sticky bottom-6">
            {aiThinking && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {aiThinking}
              </div>
            )}
            {error && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}
            {!speechSupported && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 text-xs">
                Voice input isn&apos;t supported in this browser — try Chrome. You can still type
                your answer below.
              </div>
            )}
            {micError && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                {micError}
              </div>
            )}
            {listening && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> Listening — click
                &quot;Done Answering&quot; when finished
              </div>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-end gap-3">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={aiSpeaking ? 'The interviewer is speaking...' : 'Your answer will appear here as you speak...'}
                rows={3}
                className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none"
                disabled={submitting || aiSpeaking}
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  disabled={submitting || aiSpeaking}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition shrink-0 ${
                    listening
                      ? 'bg-red-500 hover:bg-red-400 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {listening ? 'Done Answering' : '🎤 Speak'}
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !answer.trim() || listening}
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