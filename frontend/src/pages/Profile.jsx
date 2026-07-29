import { useState, useEffect } from 'react';
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

  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/resume')
      .then((res) => {
        if (!cancelled) setResume(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setResumeError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResume(res.data.resume);
    } catch (err) {
      setResumeError(err.response?.data?.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleResumeDelete = async () => {
    try {
      await api.delete('/resume');
      setResume(null);
    } catch {
      setResumeError('Failed to remove resume');
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
          className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6"
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

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <p className="text-white font-medium mb-1">Resume</p>
          <p className="text-slate-400 text-sm mb-4">
            Upload your resume so interview questions can be tailored to your actual background.
          </p>

          {resumeError && <p className="text-sm mb-4 text-red-400">{resumeError}</p>}

          {resumeLoading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : resume?.fileName ? (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <p className="text-white text-sm">{resume.fileName}</p>
                  <p className="text-slate-500 text-xs">
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={handleResumeDelete}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              {resume.analysis?.summary && (
                <div className="bg-slate-800/50 rounded-lg p-4 mb-3">
                  <p className="text-xs text-cyan-400 mb-1.5">Summary</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{resume.analysis.summary}</p>
                </div>
              )}

              {resume.analysis?.skills?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">Detected Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {resume.analysis.skills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <label className="inline-block mt-2 text-sm text-cyan-400 hover:underline cursor-pointer">
                Upload a different resume
                <input type="file" accept="application/pdf" onChange={handleResumeUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-lg py-8 cursor-pointer hover:border-slate-600 transition">
              <span className="text-slate-400 text-sm mb-1">
                {uploading ? 'Uploading and analyzing...' : 'Click to upload your resume (PDF)'}
              </span>
              <span className="text-slate-600 text-xs">Max 5MB</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleResumeUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
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