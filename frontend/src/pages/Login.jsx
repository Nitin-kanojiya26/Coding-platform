import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err || 'Invalid credentials');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-8 select-none">
      <div className="w-full max-w-sm space-y-5 p-6 rounded-md border border-border/40 bg-surface/40">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 pb-2">
          <Logo stacked={true} />
          <h1 className="text-base font-semibold text-text">Sign in to your account</h1>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
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
                placeholder="Your Email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-text-muted font-medium">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] text-text-muted hover:text-accent transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-8 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-0.5 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 rounded bg-text text-bg hover:opacity-90 text-xs font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-text-muted pt-1">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-text hover:text-accent font-medium underline transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}