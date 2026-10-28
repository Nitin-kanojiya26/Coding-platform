import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../api/client';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await API.post('/auth/reset-password', {
        email,
        otp,
        password
      });
      setMessage(res.data.message || 'Password updated successfully.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-sm space-y-5 p-6 rounded-md border border-border/40 bg-surface/40">
        <div className="flex flex-col items-center text-center space-y-2 pb-2">
          <Logo stacked={true} />
          <h1 className="text-base font-semibold text-text">Set New Password</h1>
          <p className="text-xs text-text-muted">Enter the 6-digit code sent to your email and create a new password.</p>
        </div>

        {message && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-success/10 border border-success/30 text-success text-xs">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[11px] text-text-muted mb-1 font-medium">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-3 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                placeholder="User@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1 font-medium">
              6-Digit OTP Code
            </label>
            <input
              type="text"
              required
              maxLength="6"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full tracking-[0.5em] text-center font-mono rounded border border-border/40 bg-surface-raised/40 py-1.5 text-base text-text focus:outline-none focus:border-border"
              placeholder="000000"
            />
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1 font-medium">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                required
                minLength="6"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-3 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-text-muted mb-1 font-medium">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-3 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 rounded bg-text text-bg hover:opacity-90 text-xs font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Set New Password'}
          </button>
        </form>

        <div className="text-center text-xs text-text-muted pt-1">
          <Link to="/login" className="text-text hover:text-accent font-medium underline transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}