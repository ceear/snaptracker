import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function LoginPage() {
  const { isAuthenticated, login, isLoggingIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    login({ username, password });
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800 border border-surface-700
                          flex items-center justify-center">
            <CameraIcon className="w-8 h-8 text-surface-300" />
          </div>
          <h1 className="text-2xl font-semibold text-surface-100">SnapTracker</h1>
          <p className="text-surface-400 text-sm mt-1">Time-lapse image viewer</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                className="input"
                placeholder="your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={isLoggingIn || !username || !password}
            >
              {isLoggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-surface-600 mt-6">
          Access restricted to authorized users only.
        </p>
      </div>
    </div>
  );
}

function CameraIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" strokeWidth={1.5} />
    </svg>
  );
}
