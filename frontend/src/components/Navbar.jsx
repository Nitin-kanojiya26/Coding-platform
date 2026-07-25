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
  Loader2,
  Terminal
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatar';

// ─── Helper to derive 1-2 initial letters from user name ────────
const getInitials = (name) => {
  if (!name) return 'U';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ─── Chromatic Aberration Initials Avatar Badge ────────────────
function InitialsAvatar({ name, className = "h-8 w-8 text-xs" }) {
  const initials = getInitials(name);

  return (
    <div
      className={`relative flex items-center justify-center bg-[#121212] border border-white/10 font-bold select-none overflow-hidden shrink-0 ${className}`}
    >
      <span
        className="font-mono text-white tracking-tight"
        style={{
          textShadow: `
            -1px -0.5px 0px rgba(56, 189, 248, 0.9), 
             1px  0.5px 0px rgba(249, 115, 22, 0.9)
          `,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ─── User Avatar with Error Handling Fallback ───────────────────
function NavAvatar({ avatar, name, className = "h-8 w-8 sm:h-9 sm:w-9 rounded-xl" }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = getAvatarSrc(avatar);
  const hasAvatar = Boolean(avatar && !imgError);

  if (!hasAvatar) {
    return <InitialsAvatar name={name} className={className} />;
  }

  return (
    <img
      src={avatarSrc}
      alt={name || 'User'}
      className={`${className} border border-light object-cover bg-primary p-0.5 shrink-0`}
      onError={() => setImgError(true)}
    />
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

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

  // Live database scanning with AbortController
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await API.get(`/users/search?name=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal
        });
        const rawData = res.data?.users || res.data;
        setSearchResults(Array.isArray(rawData) ? rawData : []);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('[SYS_ERR]: Profile search query failure:', err);
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery]);

  // Click-outside and Escape handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setSearchFocused(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Reset overlay states on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setSearchQuery('');
    setSearchFocused(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-base bg-secondary/80 px-4 sm:px-6 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 w-full items-center justify-between gap-4">
        
        {/* Brand / Logo Section */}
        <div className="flex items-center gap-6 min-w-0 shrink-0">
          <Link to="/" className="flex items-center gap-2 group select-none min-w-0">
            {!logoError ? (
              <img
                src="/Codexium.png"
                alt="Codexium Logo"
                className="w-10 h-10 object-contain opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200 shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                <Terminal className="h-5 w-5 text-accent" />
              </div>
            )}
            <div className="flex flex-col tracking-tight min-w-0">
              <span className="text-sm font-bold tracking-wide text-primary transition-colors duration-150 group-hover:text-primary truncate">
                Codex<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 font-black">ium</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center Links */}
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
                    ? 'bg-hover text-primary border border-light/80 shadow-sm'
                    : 'text-muted border border-transparent hover:text-secondary hover:bg-hover/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent' : 'text-muted'}`} />
                {link.label}
              </Link>
            );
          })}
          {user?.role === 'admin' && (
            <Link
              to="/create-problem"
              className="flex items-center gap-1.5 ml-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all duration-150 whitespace-nowrap"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Panel
            </Link>
          )}
        </nav>

        {/* Right Area */}
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          
          {/* Desktop Search */}
          <div className="relative hidden md:block w-48 lg:w-60" ref={searchRef}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono transition-all duration-200 ${
              searchFocused 
                ? 'bg-primary border-light ring-1 ring-light/50' 
                : 'bg-secondary/50 border-base hover:border-light'
            }`}>
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 text-accent animate-spin shrink-0" />
              ) : (
                <Search className={`h-3.5 w-3.5 shrink-0 transition-colors ${searchFocused ? 'text-accent' : 'text-muted'}`} />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="PROBE_USER_NODE..."
                className="w-full bg-transparent text-[11px] font-bold text-secondary placeholder-muted focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-muted hover:text-secondary">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute right-0 mt-2 w-64 bg-primary border border-light rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] overflow-hidden z-50 p-1 space-y-0.5 max-h-60 overflow-y-auto">
                <span className="text-[9px] text-muted px-2.5 py-1.5 block font-mono uppercase tracking-widest border-b border-base/60">
                  Top Result
                </span>
                
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-[10px] text-muted font-mono text-center py-4">
                    NO_TRACES_UNRESOLVED
                  </div>
                ) : (
                  searchResults.map((userNode) => {
                    const targetId = userNode._id || userNode.userId;
                    return (
                      <Link
                        key={targetId}
                        to={`/profile/${targetId}`}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-hover/50 text-left transition-colors group"
                        onClick={() => {
                          setSearchFocused(false);
                          setSearchQuery('');
                        }}
                      >
                        <NavAvatar 
                          avatar={userNode.avatar} 
                          name={userNode.name} 
                          className="h-6 w-6 text-[10px] rounded-md" 
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-secondary group-hover:text-primary truncate">
                            {userNode.name}
                          </p>
                          <p className="text-[9px] font-mono text-muted truncate">
                            {userNode.role || 'member'}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted hover:bg-hover/50 hover:text-secondary transition-colors shrink-0"
            title="Switch Environment Theme"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
            ) : (
              <Moon className="h-4 w-4 text-accent" />
            )}
          </button>

          {/* Account Profile Trigger */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-hover/40 rounded-xl p-1 transition-all max-w-[140px] sm:max-w-none"
            >
              <NavAvatar 
                avatar={user?.avatar} 
                name={user?.name} 
                className="h-8 w-8 sm:h-9 sm:w-9 text-xs rounded-xl" 
              />
              <span className="hidden sm:block text-xs font-bold text-secondary tracking-tight truncate max-w-[80px]">
                {user?.name}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-primary border border-light/90 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.95)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1.5 duration-150">
                <div className="px-4 py-3.5 border-b border-base bg-secondary/40 flex items-center gap-3">
                  <NavAvatar 
                    avatar={user?.avatar} 
                    name={user?.name} 
                    className="h-9 w-9 text-xs rounded-xl" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-primary truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted font-mono truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-muted hover:text-secondary hover:bg-hover/50 rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted" />
                    Profile Registry
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-muted hover:text-secondary hover:bg-hover/50 rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-muted" />
                    System Options
                  </Link>
                  <div className="border-t border-base my-1.5 mx-1" />
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

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-muted hover:bg-hover/50 hover:text-secondary lg:hidden transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="h-4 w-4 text-secondary" /> : <Menu className="h-4 w-4 text-secondary" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-16 bg-primary border-b border-base shadow-2xl p-4 space-y-3 animate-in slide-in-from-top-4 duration-200 z-30">
          <div className="relative w-full">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-base bg-secondary font-mono">
              {isSearching ? <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" /> : <Search className="h-3.5 w-3.5 text-muted" />}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="PROBE_USER_NODE..."
                className="w-full bg-transparent text-xs font-bold text-secondary focus:outline-none"
              />
            </div>
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-primary border border-base rounded-xl shadow-xl p-1 z-50 max-h-48 overflow-y-auto">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-[10px] text-muted font-mono text-center py-3">
                    NO_TRACES_UNRESOLVED
                  </div>
                ) : (
                  searchResults.map((userNode) => {
                    const targetId = userNode._id || userNode.userId;
                    return (
                      <Link
                        key={targetId}
                        to={`/profile/${targetId}`}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-hover/50 text-left text-xs text-secondary font-bold"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <NavAvatar 
                          avatar={userNode.avatar} 
                          name={userNode.name} 
                          className="h-5 w-5 text-[9px] rounded" 
                        />
                        <span>{userNode.name}</span>
                      </Link>
                    );
                  })
                )}
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
                      ? 'bg-hover text-primary border border-light'
                      : 'text-muted hover:text-secondary hover:bg-hover/30'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-muted'}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-base">
              <Link
                to="/create-problem"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-accent text-primary hover:bg-accent/90 shadow-md transition-all"
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