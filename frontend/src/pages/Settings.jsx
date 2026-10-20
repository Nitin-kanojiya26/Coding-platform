import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/client';
import { Loader2, CheckCircle, AlertCircle, Sun, Moon, Lock, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.put('/users/password', { oldPassword, newPassword });
      setMessage(res.data.message || 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6 pt-1">
      {/* Header */}
      <div className="pb-3 border-b border-border/40">
        <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-accent" /> Account Settings
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Manage your interface preferences and account security.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-2.5 rounded bg-success/10 border border-success/30 text-success text-xs">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Appearance (Flat) */}
      <div className="space-y-3 pb-6 border-b border-border/40">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          <span>Appearance</span>
        </h2>
        <div className="flex items-center justify-between text-xs py-1">
          <div>
            <span className="text-text font-medium block">Interface Theme</span>
            <span className="text-[11px] text-text-muted">
              {darkMode ? 'Dark theme (pure black #000000)' : 'Light theme (pure white #ffffff)'}
            </span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border/50 bg-surface-raised hover:bg-surface-raised/80 text-xs text-text transition-colors"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5 text-warning" /> : <Moon className="h-3.5 w-3.5 text-accent" />}
            <span>{darkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
          </button>
        </div>
      </div>

      {/* Section 2: Password Security (Flat) */}
      <div className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          <span>Change Password</span>
        </h2>

        <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] text-text-muted mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 px-3 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength="6"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 px-3 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 px-3 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded bg-text text-bg hover:opacity-90 text-xs font-medium transition-opacity disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
}