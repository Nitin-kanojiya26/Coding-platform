import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Terminal, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err || 'Invalid system credentials');
        setPassword('');
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
        <div className="flex flex-col items-center text-center">
          {/* Logo container using matching vibrant gradient framework */}
          <div className='flex flx-col items center size'>
          <img
              src="/Codexium.png"
              alt="Codexium Logo"
              className="w-30 h-25 object-contain opacity-90 mix-blend-screen group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-200 shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-wide text-slate-100">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 font-black">Codexium</span>
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium tracking-normal">Identify credentials to access system nodes</p>
          </div>
        </div>

        {/* System Error Notification Container */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-rose-950/20 p-3.5 border border-rose-900/40 text-rose-400 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
            <p className="font-medium tracking-tight">{error}</p>
          </div>
        )}

        {/* Input Validation Suite */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Email Address
            </label>
            <div className="relative group rounded-xl">
              <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-space-blue" />
              {/* Fields use true pure black background to contrast back against the inner box layer */}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 pr-4 pl-10 text-xs text-slate-200 placeholder-zinc-700 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                placeholder="identity@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              Password
            </label>
            <div className="relative group rounded-xl">
              <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-space-blue" />
              {/* Fields use true pure black background to contrast back against the inner box layer */}
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-900 bg-[#000000] py-2.5 pr-4 pl-10 text-xs text-slate-200 placeholder-zinc-700 outline-none transition-all duration-150 focus:border-zinc-700 focus:bg-[#020202]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Premium Blue Action Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-space-blue border border-space-blue/50 py-2.5 text-xs font-bold text-white hover:bg-space-blue/90 shadow-[0_4px_20px_rgba(29,78,216,0.15)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              'Access Core Workspace'
            )}
          </button>
        </form>

        {/* Footer Navigation Cluster */}
        <div className="text-center text-xs text-zinc-500 font-medium pt-2">
          New system node?{' '}
          <Link 
            to="/register" 
            className="font-bold text-space-blue hover:underline transition-colors duration-150"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}