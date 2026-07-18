import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-1">
          Welcome back, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-slate-400 mb-10">Ready for your next practice interview?</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Total Interviews</p>
            <p className="text-3xl font-bold text-white">{user?.totalInterviews ?? 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-400 text-sm mb-1">Average Score</p>
            <p className="text-3xl font-bold text-cyan-400">
              {user?.averageScore ? Math.round(user.averageScore) : 0}%
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-center">
            <button
              onClick={() => navigate('/interview/new')}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;