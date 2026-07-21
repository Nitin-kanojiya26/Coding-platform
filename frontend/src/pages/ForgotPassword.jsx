import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import { Mail, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await API.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Reset code sent to your email.');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 text-zinc-300 font-sans antialiased">
      <div className="z-10 w-full max-w-md space-y-6 rounded-xl border border-zinc-900 bg-[#050507] p-8 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center shadow-md">
              <ShieldCheck className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Reset Password</h2>
          <p className="text-sm text-zinc-400 mt-1">Enter your email to receive a reset code.</p>
        </div>

        {message && (
          <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-emerald-400 text-sm animate-in fade-in duration-200">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-rose-500/10 p-4 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-3 left-3 h-4 w-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-900 bg-zinc-950 py-2.5 pr-4 pl-10 text-sm text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-sm text-white py-2.5 font-semibold transition-colors duration-200 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-cyan-400" /> : 'Send Reset Code'}
          </button>
        </form>

        <div className="text-center text-sm pt-2">
          <Link to="/login" className="text-cyan-400 hover:underline transition-colors duration-200">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}