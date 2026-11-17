import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const navLinks = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Interview History', path: '/history' },
  { label: 'Profile', path: '/profile' },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const resendVerification = async () => {
    setVerifyMsg('Sending...');
    try {
      await api.post('/auth/resend-verification');
      setVerifyMsg('Verification email sent. Check your inbox.');
    } catch (err) {
      setVerifyMsg(err.response?.data?.message || 'Could not send the email. Try again later.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-white">
            Astra<span className="text-cyan-400">Vox</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`text-sm transition ${
                  isActive(link.path)
                    ? 'text-cyan-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Log out
            </button>
          </nav>

          <button
            className="md:hidden text-slate-300"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden px-6 pb-4 flex flex-col gap-3 border-t border-slate-800 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`text-sm ${
                  isActive(link.path) ? 'text-cyan-400' : 'text-slate-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-sm text-left text-slate-400"
            >
              Log out
            </button>
          </nav>
        )}
      </header>

      {user && user.isVerified === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-center text-sm text-amber-300">
          Please verify your email address.{' '}
          {verifyMsg || (
            <button onClick={resendVerification} className="underline hover:text-amber-200">
              Resend verification email
            </button>
          )}
        </div>
      )}

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;