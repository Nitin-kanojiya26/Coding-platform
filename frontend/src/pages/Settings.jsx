import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/client';
import { Loader2, AlertCircle, CheckCircle, Sun, Moon, Shield, Lock } from 'lucide-react';

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
      // Uses the reset-password flow with OTP
      // You need to implement a proper change-password endpoint or use the existing flow
      alert('Change password endpoint not implemented in backend. Please use the forgot-password flow.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Theme Toggle */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {darkMode ? <Moon className="h-5 w-5 text-cyan-400" /> : <Sun className="h-5 w-5 text-amber-400" />}
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl text-white hover:bg-slate-700 transition-all duration-200 hover:scale-[1.02]"
          >
            {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-cyan-400" />}
            {darkMode ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-cyan-400" />
          Change Password
        </h2>

        {message && (
          <div className="mb-4 flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 animate-in fade-in duration-200">
            <CheckCircle className="h-5 w-5" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength="6"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}