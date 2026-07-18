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
    /* OUTER BOX ENVIRONMENT: Clean, flat pure dark black void layer */
    <div className="relative flex min-h-screen items-center justify-center bg-[#000000] px-4 py-12 antialiased select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.01),transparent_50%)] pointer-events-none" />

      {/* INNER BOX CONTAINER: Elevated matte charcoal shield maximizing panel contrast */}
      <div className="z-10 w-full max-w-md space-y-7 rounded-2xl border border-zinc-800/80 bg-[#0a0a0c] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Logo container using matching vibrant gradient framework */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-transform duration-300 hover:scale-105">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-wide text-slate-100">
              Initialize <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 font-black">Workspace</span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium tracking-normal">
              Step {step} of 2: {step === 1 ? 'Identity Binding' : 'Node Verification'}
            </p>
          </div>
        </div>

        {/* System Error Notification Container */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-950/20 p-3.5 border border-rose-900/40 text-rose-400 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <p className="font-medium tracking-tight">{error}</p>
          </div>
        )}

        {/* System Information Notification Container */}
        {infoMessage && step === 2 && (
          <div className="flex items-start gap-3 rounded-xl bg-sky-950/20 p-3.5 border border-sky-900/40 text-sky-400 text-xs animate-in fade-in duration-200">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
            <p className="font-medium tracking-tight">{infoMessage}</p>
          </div>
        )}

        {/* Input Validation Suite */}
        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Display Name
              </label>
              <div className="relative group rounded-xl">
                <User className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-space-blue" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 pr-4 pl-10 text-xs text-slate-200 placeholder-zinc-700 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Email Address
              </label>
              <div className="relative group rounded-xl">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-space-blue" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 pr-4 pl-10 text-xs text-slate-200 placeholder-zinc-700 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                  placeholder="identity@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Secure Password
              </label>
              <div className="relative group rounded-xl">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-space-blue" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 pr-4 pl-10 text-xs text-slate-200 placeholder-zinc-700 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-space-blue border border-space-blue/50 py-2.5 text-xs font-bold text-white hover:bg-space-blue/90 shadow-[0_4px_20px_rgba(29,78,216,0.15)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                'Request Security Token'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                One-Time Validation Token
              </label>
              <input
                type="text"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full tracking-[0.6em] text-center font-mono rounded-xl border border-zinc-900 bg-[#000000] py-3 text-base text-slate-200 placeholder-zinc-800 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                placeholder="000000"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-xl border border-zinc-900 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30 transition-all duration-150 active:scale-[0.98]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center rounded-xl bg-space-blue border border-space-blue/50 py-2.5 text-xs font-bold text-white hover:bg-space-blue/90 shadow-[0_4px_20px_rgba(29,78,216,0.15)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  'Verify Token'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer Navigation Cluster */}
        <div className="text-center text-xs text-zinc-500 font-medium pt-2">
          Already verified?{' '}
          <Link 
            to="/login" 
            className="font-bold text-space-blue hover:underline transition-colors duration-150"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}