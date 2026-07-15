import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Terminal, Mail, Lock, User, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Register() {
  const { registerRequestOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerRequestOTP(formData.email, formData.name, formData.password);
      setInfoMessage(`Verification OTP dispatched to ${formData.email}`);
      setStep(2);
    } catch (err) {
      setError(err || 'Registration initialization failed.');
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03),transparent_65%)]" />

      <div className="z-10 w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/10 transition-transform hover:scale-105">
            <Terminal className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Initialize Account</h2>
          <p className="text-sm text-slate-400">Step {step} of 2: {step === 1 ? 'Identity Binding' : 'Node Verification'}</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 p-4 border border-rose-500/20 text-rose-400 text-sm animate-in fade-in duration-200">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {infoMessage && step === 2 && (
          <div className="flex items-start gap-3 rounded-xl bg-cyan-500/10 p-4 border border-cyan-500/20 text-cyan-400 text-sm animate-in fade-in duration-200">
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{infoMessage}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Request Security Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                One‑Time Validation Token
              </label>
              <input
                type="text"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full tracking-widest text-center font-mono rounded-xl border border-slate-800 bg-slate-900/50 py-3 text-lg text-white outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-xl border border-slate-800 py-2.5 text-xs font-medium text-slate-400 hover:bg-slate-800 transition-colors duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Token'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-slate-500">
          Already verified?{' '}
          <Link to="/login" className="font-medium text-cyan-400 hover:underline transition-colors duration-200">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}