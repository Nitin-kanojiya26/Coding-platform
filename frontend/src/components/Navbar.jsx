import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import API from '../api/client';
import Logo from './Logo';
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
  Menu,
  X,
  Search,
  Loader2,
  PlusCircle,
  Boxes
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
function InitialsAvatar({ name, className = "h-7 w-7 text-xs" }) {
  const initials = getInitials(name);

  return (
    <div
      className={`relative flex items-center justify-center bg-[#121212] border border-white/10 font-bold select-none overflow-hidden shrink-0 rounded-md ${className}`}
    >
      <span
        className="font-mono text-white tracking-tight"
        style={{
          textShadow: `
            -1px -0.5px 0px rgba(56, 189, 248, 0.9), 
             1px  0.5px 0px rgba(59, 130, 246, 0.9)
          `,
        }}
      >
        {initials}
      </span>
    </div>
  );
}

// ─── User Avatar with Error Handling Fallback ───────────────────
function NavAvatar({ avatar, name, className = "h-7 w-7 rounded-md" }) {
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
      className={`${className} border border-border object-cover bg-surface-raised p-0.5 shrink-0`}
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
    { to: '/my-submissions', label: 'Submissions', icon: History },
    { to: '/build', label: 'Build Mode', icon: Boxes, isBuildMode: true },
  ];

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
          console.error('Profile search query failure:', err);
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

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
    <header className="sticky top-2 sm:top-3 z-40 w-full max-w-7xl mx-auto px-3 sm:px-6">
      <div className="h-12 sm:h-13 px-3.5 sm:px-4 bg-surface/95 border border-border rounded-lg shadow-xs backdrop-blur-md flex items-center justify-between gap-3 sm:gap-4 transition-colors">

        {/* Brand / Logo Section */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Logo />
        </div>

        {/* Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 shrink-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to || (link.to === '/build' && location.pathname.startsWith('/build'));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all select-none ${
                  isActive
                    ? link.isBuildMode
                      ? 'bg-accent-build/15 text-accent-build border border-accent-build/40 font-semibold shadow-xs'
                      : 'bg-surface-raised text-text border border-border font-medium'
                    : link.isBuildMode
                    ? 'text-accent-build/80 hover:text-accent-build hover:bg-accent-build/10 border border-transparent'
                    : 'text-text-muted hover:text-text hover:bg-surface-raised/60'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${link.isBuildMode ? 'text-accent-build' : isActive ? 'text-accent-blue' : 'text-text-muted'}`} />
                <span>{link.label}</span>
                {link.isBuildMode && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent-build/20 text-accent-build uppercase tracking-wider ml-0.5">
                    API
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Reserved Spacious Expansion Area for Future Custom Buttons */}
        <div className="hidden xl:flex items-center gap-2 flex-1 justify-start ml-2 pl-2 border-l border-border/40 h-4" id="navbar-expansion-zone">
          {/* User can easily drop extra buttons here in the future without overcrowding */}
        </div>

        {/* Right Area: Search, Theme Toggle, Profile */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">

          {/* Desktop Search */}
          <div className="relative hidden md:block w-40 lg:w-52" ref={searchRef}>
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface-inset border text-xs font-mono transition-colors ${
              searchFocused ? 'border-accent-blue ring-1 ring-accent-blue' : 'border-border'
            }`}>
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 text-accent-blue animate-spin shrink-0" />
              ) : (
                <Search className={`h-3.5 w-3.5 shrink-0 transition-colors ${searchFocused ? 'text-accent-blue' : 'text-text-muted'}`} />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search users..."
                className="w-full bg-transparent text-xs text-text placeholder-text-muted font-sans focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchFocused && searchQuery.trim() && (
              <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.7)] overflow-hidden z-50 p-1 space-y-0.5 max-h-60 overflow-y-auto">
                <span className="text-[9px] text-text-muted px-2.5 py-1.5 block font-mono uppercase tracking-widest border-b border-border">
                  Search Results
                </span>

                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-xs text-text-muted text-center py-4">
                    No users found
                  </div>
                ) : (
                  searchResults.map((userNode) => {
                    const targetId = userNode._id || userNode.userId;
                    return (
                      <Link
                        key={targetId}
                        to={`/profile/${targetId}`}
                        className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-raised text-left transition-colors group"
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
                          <p className="text-xs font-medium text-text group-hover:text-accent-blue truncate">
                            {userNode.name}
                          </p>
                          <p className="text-[10px] font-mono text-text-muted truncate">
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
            className="p-1.5 text-text-muted hover:text-text transition-all shrink-0"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-warning" />
            ) : (
              <Moon className="h-4 w-4 text-accent-blue" />
            )}
          </button>

          {/* Account Profile Trigger */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-raised/50 transition-all max-w-[140px] sm:max-w-none"
            >
              <NavAvatar
                avatar={user?.avatar}
                name={user?.name}
                className="h-6 w-6 text-[10px] rounded-md"
              />
              <span className="hidden sm:block text-xs font-medium text-text truncate max-w-[90px]">
                {user?.name || 'Developer'}
              </span>
              <ChevronDown className={`h-3 w-3 text-text-muted transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-md shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="px-3.5 py-2.5 border-b border-border bg-surface-raised/40 flex items-center gap-2.5">
                  <NavAvatar
                    avatar={user?.avatar}
                    name={user?.name}
                    className="h-8 w-8 text-xs rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text truncate">{user?.name}</p>
                    <p className="text-[10px] text-text-muted font-mono truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded-md transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="h-3.5 w-3.5 text-text-muted" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to="/bookmarks"
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded-md transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Bookmark className="h-3.5 w-3.5 text-text-muted" />
                    <span>Bookmarks</span>
                  </Link>
                  <Link
                    to="/my-submissions"
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded-md transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <History className="h-3.5 w-3.5 text-text-muted" />
                    <span>Submissions</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded-md transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="h-3.5 w-3.5 text-text-muted" />
                    <span>Settings</span>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-raised rounded-md transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Shield className="h-3.5 w-3.5 text-accent-blue" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <div className="border-t border-border my-1 mx-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/10 rounded-md transition-colors text-left"
                  >
                    <LogOut className="h-3.5 w-3.5 text-danger" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-raised/50 lg:hidden transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 bg-surface border border-border rounded-lg shadow-2xl p-3 space-y-2.5 animate-in slide-in-from-top-2 duration-150 z-30">
          <div className="relative w-full">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface-inset font-mono text-xs">
              {isSearching ? <Loader2 className="h-3.5 w-3.5 text-accent-blue animate-spin" /> : <Search className="h-3.5 w-3.5 text-text-muted" />}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-transparent text-xs text-text focus:outline-none"
              />
            </div>
            {searchQuery.trim() && (
              <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-xl p-1 z-50 max-h-48 overflow-y-auto">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-[10px] text-text-muted font-mono text-center py-2">
                    No users found
                  </div>
                ) : (
                  searchResults.map((userNode) => {
                    const targetId = userNode._id || userNode.userId;
                    return (
                      <Link
                        key={targetId}
                        to={`/profile/${targetId}`}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-surface-raised text-left text-xs text-text font-medium"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <NavAvatar
                          avatar={userNode.avatar}
                          name={userNode.name}
                          className="h-5 w-5 text-[9px] rounded-md"
                        />
                        <span>{userNode.name}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to || (link.to === '/build' && location.pathname.startsWith('/build'));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                    isActive
                      ? link.isBuildMode
                        ? 'bg-accent-build/15 text-accent-build border border-accent-build/40'
                        : 'bg-surface-raised text-text border border-border'
                      : link.isBuildMode
                      ? 'text-accent-build/80 hover:text-accent-build hover:bg-accent-build/10'
                      : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${link.isBuildMode ? 'text-accent-build' : isActive ? 'text-accent-blue' : 'text-text-muted'}`} />
                    <span>{link.label}</span>
                  </div>
                  {link.isBuildMode && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent-build/20 text-accent-build uppercase">
                      API
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-border space-y-1">
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md text-text-muted hover:text-text hover:bg-surface-raised/40 transition-all"
              >
                <Shield className="h-3.5 w-3.5 text-accent-blue" />
                <span>Admin Panel</span>
              </Link>
              <Link
                to="/create-problem"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-md bg-accent-blue text-white hover:opacity-90 transition-all"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Create Problem</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}