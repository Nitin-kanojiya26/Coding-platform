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
      alert('Change password endpoint not implemented in backend. Please use the forgot-password flow.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* OUTER BOX ENVIRONMENT: Clean, flat pure dark black void layer */
    <div className="relative flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 antialiased select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.01),transparent_50%)] pointer-events-none" />

      {/* INNER BOX CONTAINER: Elevated matte charcoal shield maximizing panel contrast */}
      <div className="z-10 w-full max-w-2xl space-y-7 rounded-2xl border border-zinc-800/80 bg-[#0a0a0c] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        
        {/* Title Header */}
        <div className="border-b border-zinc-900 pb-4">
          <h1 className="text-xl font-bold tracking-wide text-slate-100">System Settings</h1>
          <p className="text-[11px] text-zinc-500 font-medium tracking-normal">Manage local node configuration variables</p>
        </div>

        {/* System Notifications */}
        {message && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-950/20 p-3.5 border border-emerald-900/40 text-emerald-400 text-xs animate-in fade-in duration-200">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            <p className="font-medium tracking-tight">{message}</p>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-950/20 p-3.5 border border-rose-900/40 text-rose-400 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <p className="font-medium tracking-tight">{error}</p>
          </div>
        )}

        {/* Appearance Section */}
        <div className="p-5 rounded-xl border border-zinc-900 bg-[#020202] space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            {darkMode ? <Moon className="h-4 w-4 text-zinc-400" /> : <Sun className="h-4 w-4 text-zinc-400" />}
            Appearance Config
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium">{darkMode ? 'Dark Engine Active' : 'Light Engine Active'}</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-[#000000] text-xs font-bold text-zinc-300 rounded-xl hover:bg-zinc-900/40 transition-all duration-150 active:scale-[0.98]"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {darkMode ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="p-5 rounded-xl border border-zinc-900 bg-[#020202] space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-400" />
            Modify Security Secret
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Input fields use pure black background to contrast back against inner box layer */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 px-4 text-xs text-slate-200 placeholder-zinc-800 outline-none transition-all duration-150 focus:border-zinc-700"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                minLength="6"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 px-4 text-xs text-slate-200 placeholder-zinc-800 outline-none transition-all duration-150 focus:border-zinc-700"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 px-4 text-xs text-slate-200 placeholder-zinc-800 outline-none transition-all duration-150 focus:border-zinc-700"
                placeholder="••••••••"
              />
            </div>

            {/* Premium Blue Action Trigger */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center rounded-xl bg-space-blue border border-space-blue/50 px-5 py-2.5 text-xs font-bold text-white hover:bg-space-blue/90 shadow-[0_4px_20px_rgba(29,78,216,0.15)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Shield className="h-4 w-4 mr-2" />}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}