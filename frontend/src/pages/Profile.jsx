import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const getAchievements = (user) => {
  const achievements = [
    {
      id: 'first',
      label: 'First Interview',
      desc: 'Complete your first mock interview',
      unlocked: (user?.totalInterviews ?? 0) >= 1,
    },
    {
      id: 'five',
      label: 'Getting Consistent',
      desc: 'Complete 5 mock interviews',
      unlocked: (user?.totalInterviews ?? 0) >= 5,
    },
    {
      id: 'ten',
      label: 'Dedicated Practicer',
      desc: 'Complete 10 mock interviews',
      unlocked: (user?.totalInterviews ?? 0) >= 10,
    },
    {
      id: 'score70',
      label: 'Strong Performer',
      desc: 'Reach an average score of 70+',
      unlocked: (user?.averageScore ?? 0) >= 70,
    },
    {
      id: 'score90',
      label: 'Interview Ready',
      desc: 'Reach an average score of 90+',
      unlocked: (user?.averageScore ?? 0) >= 90,
    },
  ];
  return achievements;
};

const Profile = () => {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [nameMsg, setNameMsg] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setNameMsg('');
    setNameSaving(true);
    try {
      const res = await api.put('/auth/profile', { name });
      setUser((prev) => ({ ...prev, ...res.data }));
      setNameMsg('Profile updated successfully');
    } catch (err) {
      setNameMsg(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setPwMsg('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-semibold text-white mb-1">Profile</h2>
        <p className="text-slate-400 mb-10">Manage your account settings</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs mb-1">Total Interviews</p>
            <p className="text-2xl font-bold text-white">{user?.totalInterviews ?? 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs mb-1">Average Score</p>
            <p className="text-2xl font-bold text-cyan-400">
              {user?.averageScore ? Math.round(user.averageScore) : 0}%
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-slate-400 text-xs mb-1">Email</p>
            <p className="text-sm text-white truncate mt-1.5">{user?.email}</p>
          </div>
        </div>

        <form
          onSubmit={handleNameUpdate}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6"
        >
          <p className="text-white font-medium mb-4">Profile Information</p>

          {nameMsg && (
            <p
              className={`text-sm mb-4 ${
                nameMsg.includes('success') ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {nameMsg}
            </p>
          )}

          <label className="block text-sm text-slate-300 mb-1.5">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition mb-4"
          />

          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-800 text-slate-500 cursor-not-allowed mb-4"
          />

          <button
            type="submit"
            disabled={nameSaving}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold transition"
          >
            {nameSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <form
          onSubmit={handlePasswordChange}
          className="bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <p className="text-white font-medium mb-4">Change Password</p>

          {pwMsg && <p className="text-sm mb-4 text-emerald-400">{pwMsg}</p>}
          {pwError && <p className="text-sm mb-4 text-red-400">{pwError}</p>}

          <label className="block text-sm text-slate-300 mb-1.5">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition mb-4"
          />

          <label className="block text-sm text-slate-300 mb-1.5">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition mb-4"
          />

          <button
            type="submit"
            disabled={pwSaving}
            className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium transition"
          >
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-6">
          <p className="text-white font-medium mb-4">Achievements</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {getAchievements(user).map((a) => (
              <div
                key={a.id}
                className={`rounded-lg p-4 border ${
                  a.unlocked
                    ? 'bg-cyan-500/5 border-cyan-500/30'
                    : 'bg-slate-800/50 border-slate-800'
                }`}
              >
                <p className={`text-sm font-medium ${a.unlocked ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {a.unlocked ? '✓ ' : '○ '}
                  {a.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;