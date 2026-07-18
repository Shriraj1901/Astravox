import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const companies = ['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys', 'Meta'];
const roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'SDE'];
const difficulties = ['Easy', 'Medium', 'Hard'];

const NewInterview = () => {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!company || !role || !difficulty) {
      setError('Please select company, role and difficulty');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/interviews/start', { company, role, difficulty });
      navigate(`/interview/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start interview');
      setLoading(false);
    }
  };

  const OptionGroup = ({ label, options, value, onChange }) => (
    <div className="mb-8">
      <p className="text-sm text-slate-400 mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              value === opt
                ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-medium'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-1">Set up your interview</h2>
        <p className="text-slate-400 mb-10">Choose a company, role, and difficulty to begin</p>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <OptionGroup label="Company" options={companies} value={company} onChange={setCompany} />
        <OptionGroup label="Role" options={roles} value={role} onChange={setRole} />
        <OptionGroup label="Difficulty" options={difficulties} value={difficulty} onChange={setDifficulty} />

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold transition"
        >
          {loading ? 'Starting interview...' : 'Start Interview'}
        </button>
      </div>
    </div>
  );
};

export default NewInterview;