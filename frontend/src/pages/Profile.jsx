import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { User, ImageIcon, Save, Loader2, CheckCircle, AlertCircle, Flame } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState({ currentStreak: 0, maxStreak: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, streakRes] = await Promise.all([
          API.get('/users/stats'),
          API.get('/users/streak'),
        ]);
        setStats(statsRes.data.stats);
        setStreak(streakRes.data.data || { currentStreak: 0, maxStreak: 0 });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setMessage('');
    try {
      const res = await API.put('/users/profile', { name, avatar });
      if (res.data.user) {
        refreshUser();
        setMessage('Profile updated successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">My Profile</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-cyan-400">{stats?.solved?.total || 0}</p>
          <p className="text-xs text-slate-400">Solved</p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats?.acceptanceRate || 0}%</p>
          <p className="text-xs text-slate-400">Acceptance</p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
          <p className="text-2xl font-bold text-amber-400">{streak.currentStreak}</p>
          <p className="text-xs text-slate-400">Current Streak</p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="h-5 w-5 text-orange-400" />
            <p className="text-2xl font-bold text-white">{streak.maxStreak}</p>
          </div>
          <p className="text-xs text-slate-400">Max Streak</p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5 mb-5">
          <img
            src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
            alt="Avatar"
            className="h-16 w-16 rounded-xl bg-slate-800 border border-slate-700 object-cover"
          />
          <div>
            <p className="text-sm font-bold text-white">Avatar Preview</p>
            <p className="text-xs text-slate-500">Enter a URL to change your avatar</p>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Display Name</label>
            <div className="relative">
              <User className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Avatar URL</label>
            <div className="relative">
              <ImageIcon className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white font-semibold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
          >
            {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
}