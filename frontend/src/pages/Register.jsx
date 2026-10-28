import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const { registerRequestOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);
    try {
      await registerRequestOTP(formData.email, formData.name, formData.password);
      setInfoMessage(`Verification OTP sent to ${formData.email}`);
      setStep(2);
    } catch (err) {
      setError(err || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOTP(formData.email, otp);
      navigate('/');
    } catch (err) {
      setError(err || 'Invalid or expired validation code.');
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
          <h1 className="text-base font-semibold text-text">Create your account</h1>
          <p className="text-xs text-text-muted">
            Step {step} of 2: {step === 1 ? 'Enter credentials' : 'Verify email'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-danger/10 border border-danger/30 text-danger text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Info notification */}
        {infoMessage && step === 2 && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-success/10 border border-success/30 text-success text-xs">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form Step 1: Details */}
        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[11px] text-text-muted mb-1 font-medium">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-3 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                  placeholder="Your"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-muted mb-1 font-medium">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-3 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                  placeholder="developer@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-text-muted mb-1 font-medium">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength="6"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

            <div>
              <label className="block text-[11px] text-text-muted mb-1 font-medium">
                Re-enter Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength="6"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded border border-border/40 bg-surface-raised/40 py-1.5 pr-8 pl-8 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-text-muted hover:text-text transition-colors p-0.5 focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
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
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Request OTP'}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] text-text-muted mb-1 font-medium text-center">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full tracking-[0.5em] text-center font-mono rounded border border-border/40 bg-surface-raised/40 py-2 text-base text-text focus:outline-none focus:border-border"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-1.5 rounded border border-border/40 text-text-muted hover:text-text text-xs transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-1.5 rounded bg-text text-bg hover:opacity-90 text-xs font-medium transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify & Continue'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-text-muted pt-1">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-text hover:text-accent font-medium underline transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}