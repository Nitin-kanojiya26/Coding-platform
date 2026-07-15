import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Terminal,
  LogOut,
  Shield,
  User,
  LayoutDashboard,
  Code2,
  Trophy,
  Settings,
  Sun,
  Moon,
  Bookmark,
  History,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/problems', label: 'Problems', icon: Code2 },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { to: '/my-submissions', label: 'Submissions', icon: History },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ to: '/admin', label: 'Admin', icon: Shield });
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ Avatar fallback
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=32&background=0f172a&color=00f0ff`;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 transition-transform group-hover:scale-105">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Codexium</span>
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 shadow-inner border border-slate-700/60'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4 transition-colors duration-200" />
              {link.label}
            </Link>
          );
        })}
        {user?.role === 'admin' && (
          <Link
            to="/create-problem"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-all duration-200"
          >
            <PlusCircle className="h-4 w-4" />
            New
          </Link>
        )}
      </nav>

      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors duration-200"
          title="Toggle theme"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 hover:text-amber-400 transition-colors" />
          ) : (
            <Moon className="h-5 w-5 hover:text-cyan-400 transition-colors" />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 hover:bg-slate-800/50 rounded-lg px-2 py-1 transition-all duration-200"
          >
            <img
              src={avatarUrl}
              alt={user?.name || 'User'}
              className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=32&background=0f172a&color=00f0ff`;
              }}
            />
            <span className="hidden md:block text-sm font-medium text-slate-300">{user?.name}</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors duration-150"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <hr className="border-slate-800 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-400 hover:bg-slate-800 transition-colors duration-150"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}