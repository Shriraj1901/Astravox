const NetworkError = ({ onRetry }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Connection problem</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
          We couldn&apos;t reach the server. Check your connection and try again.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default NetworkError;