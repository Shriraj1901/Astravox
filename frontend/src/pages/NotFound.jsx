import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-cyan-400 text-sm font-mono mb-4">404</p>
        <h1 className="text-3xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;