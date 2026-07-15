import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/client';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.post('/auth/reset-password', { email, otp, password });
      setMessage(res.data.message || 'Password updated. You can now log in.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="z-10 w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">Set New Password</h2>
          <p className="text-sm text-slate-400 mt-1">Enter the reset code and your new password.</p>
        </div>

        {message && (
          <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-400 text-sm animate-in fade-in duration-200">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-500/10 p-4 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              Reset Code (OTP)
            </label>
            <input
              type="text"
              required
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="123456"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-500">
          <Link to="/login" className="font-medium text-cyan-400 hover:underline transition-colors duration-200">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}