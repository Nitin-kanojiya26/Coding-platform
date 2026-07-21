import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/client';
import {
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
  Menu,
  X,
  Search,
  Loader2
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

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

  // Live database scanning targeting the ?name query parameter
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await API.get(`/users/search?name=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data?.users || res.data || []);
      } catch (err) {
        console.error('[SYS_ERR]: Profile search query failure:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click away listeners to close menus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchQuery('');
    setSearchFocused(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=48&background=0a0a0c&color=e4e4e7&bold=true`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-[#0a0a0c]/80 px-4 sm:px-6 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 w-full items-center justify-between gap-4">
        
        {/* Brand / Logo Section */}
        <div className="flex items-center gap-6 min-w-0 shrink-0">
          <Link to="/" className="flex items-center gap-0 group select-none min-w-0">
            <img
              src="/Codexium.svg"
              alt="Codexium Logo"
              className="w-13 h-15 object-contain opacity-90 mix-blend-screen group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-200 shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col tracking-tight min-w-0">
              <span className="text-sm font-bold tracking-wide text-slate-100 transition-colors duration-150 group-hover:text-white truncate">
                Codex<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 font-black">ium</span>
              </span>
              <span className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase mt-[-2px] transition-colors duration-150 group-hover:text-zinc-500 truncate">
                Core.v1
              </span>
            </div>
          </Link>
        </div>

        {/* Center Main Workspace Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1.5 flex-1 justify-start ml-4">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-900 text-white border border-zinc-700/80 shadow-sm'
                    : 'text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-sky-400' : 'text-zinc-500'}`} />
                {link.label}
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <Link
              to="/create-problem"
              className="flex items-center gap-1.5 ml-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-sky-400/10 border border-sky-400/30 text-sky-400 hover:bg-sky-400/20 transition-all duration-150 whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Panel
            </Link>
          )}
        </nav>

        {/* Right Actions / Identity Actions Utility Area */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto" ref={dropdownRef}>
          
          {/* DESKTOP SEARCH CONTROLLER */}
          <div className="relative hidden md:block w-48 lg:w-60" ref={searchRef}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono transition-all duration-200 ${
              searchFocused 
                ? 'bg-black border-zinc-700 ring-1 ring-zinc-800' 
                : 'bg-zinc-950/50 border-zinc-900 hover:border-zinc-800'
            }`}>
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin shrink-0" />
              ) : (
                <Search className={`h-3.5 w-3.5 shrink-0 transition-colors ${searchFocused ? 'text-sky-400' : 'text-zinc-600'}`} />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="PROBE_USER_NODE..."
                className="w-full bg-transparent text-[11px] font-bold text-zinc-200 placeholder-zinc-600 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-zinc-400">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Results Floating Box */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute right-0 mt-2 w-64 bg-black border border-zinc-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] overflow-hidden z-50 p-1 space-y-0.5 max-h-60 overflow-y-auto">
                <span className="text-[9px] text-zinc-600 px-2.5 py-1.5 block font-mono uppercase tracking-widest border-b border-zinc-900/60">
                  Index Results Matrix
                </span>
                
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-[10px] text-zinc-600 font-mono text-center py-4">
                    NO_TRACES_UNRESOLVED
                  </div>
                ) : (
                  searchResults.map((userNode) => (
                    <Link
                      key={userNode._id || userNode.userId}
                      to={`/profile/${userNode._id || userNode.userId}`}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-900/50 text-left transition-colors group"
                      onClick={() => setSearchFocused(false)}
                    >
                      <img
                        src={userNode.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userNode.name}`}
                        alt=""
                        className="h-6 w-6 rounded-md border border-zinc-800 object-cover bg-zinc-950 p-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-zinc-300 group-hover:text-white truncate">
                          {userNode.name}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-600 truncate">
                          {userNode.role || 'member'}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 transition-colors shrink-0"
            title="Switch Environment Theme"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
            ) : (
              <Moon className="h-4 w-4 text-sky-400" />
            )}
          </button>

          {/* Account Profile Trigger Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-zinc-900/40 rounded-xl p-1 transition-all max-w-[140px] sm:max-w-none"
            >
              <img
                src={avatarUrl}
                alt="Account"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-zinc-800 object-cover bg-black p-0.5"
              />
              <span className="hidden sm:block text-xs font-bold text-zinc-300 tracking-tight truncate max-w-[80px]">
                {user?.name}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Desktop Account Options Menu overlay */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-black border border-zinc-800/90 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.95)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1.5 duration-150">
                <div className="px-4 py-3.5 border-b border-zinc-900 bg-[#0a0a0c]/40">
                  <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-slate-200 hover:bg-zinc-900/50 rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-4 w-4 text-zinc-500" />
                    Profile Registry
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-slate-200 hover:bg-zinc-900/50 rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-zinc-500" />
                    System Options
                  </Link>
                  <div className="border-t border-zinc-900 my-1.5 mx-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    Terminate Session
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Open Switcher Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 lg:hidden transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 text-slate-200" /> : <Menu className="h-4 w-4 text-slate-200" />}
          </button>
        </div>
      </div>

      {/* MOBILE EXPAND OVERLAY DRAWTER */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-16 bg-black border-b border-zinc-900 shadow-2xl p-4 space-y-3 animate-in slide-in-from-top-4 duration-200 z-30">
          
          {/* Mobile Search Input */}
          <div className="relative w-full" ref={searchRef}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-900 bg-zinc-950 font-mono">
              {isSearching ? <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin" /> : <Search className="h-3.5 w-3.5 text-zinc-600" />}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PROBE_USER_NODE..."
                className="w-full bg-transparent text-xs font-bold text-zinc-200 focus:outline-none"
              />
            </div>
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-black border border-zinc-900 rounded-xl shadow-xl p-1 z-50 max-h-48 overflow-y-auto">
                {searchResults.map((userNode) => (
                  <Link
                    key={userNode._id || userNode.userId}
                    to={`/profile/${userNode._id || userNode.userId}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-zinc-900/50 text-left text-xs text-zinc-300 block"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    {userNode.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white border border-zinc-800'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-sky-400' : 'text-zinc-500'}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-zinc-900">
              <Link
                to="/create-problem"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-400 text-white hover:bg-sky-400/90 shadow-md transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                Create New Panel
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}