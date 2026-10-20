import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { useBookmark } from '../hooks/useBookmark';
import {
  Search, ChevronDown, ChevronUp, Flame, Bookmark,
  CheckCircle, Trophy, BookOpen, Target, TrendingUp,
  ChevronRight, Circle, RefreshCw, AlertCircle, Calendar,
  Shuffle, Star
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';
import ActivityHeatmap from '../components/ActivityHeatmap';

// ─── Flat Minimal Problem Row (LeetCode Table Row) ───────────────
const ProblemItem = ({ problem, isSolved, isAttempted }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);
  const [showAllTags, setShowAllTags] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/problems/${problem.slug || problem._id}`)}
      className="group flex flex-col border-b border-border/30 hover:bg-surface-raised/35 transition-colors cursor-pointer py-2.5 px-2 select-none"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Status + Title + Tags */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Solved Status Indicator */}
          <div className="flex-shrink-0 w-4 flex justify-center">
            {isSolved ? (
              <CheckCircle className="w-3.5 h-3.5 text-success fill-success/10" title="Solved" />
            ) : isAttempted ? (
              <Circle className="w-2.5 h-2.5 fill-warning text-warning" title="Attempted" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-border/60" title="Todo" />
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <h3 className="text-xs sm:text-sm font-normal text-text group-hover:text-accent transition-colors truncate">
              {problem.title}
            </h3>

            {/* Inline Tags Preview */}
            <div className="hidden md:flex items-center gap-1 flex-shrink-0">
              {(problem.tags || []).slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono text-text-muted bg-surface-raised/50 px-1.5 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
              {(problem.tags?.length > 2) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllTags(!showAllTags);
                  }}
                  className="text-[10px] text-text-muted hover:text-text flex items-center gap-0.5 px-1 py-0.5 rounded"
                >
                  +{problem.tags.length - 2}
                  {showAllTags ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Difficulty Badge + Bookmark Action */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="w-16 flex justify-end">
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleBookmark();
            }}
            disabled={bookmarkLoading}
            className="p-1 text-text-muted hover:text-text transition-colors"
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
            aria-label="Bookmark problem"
          >
            <Bookmark className={`h-3.5 w-3.5 transition-all ${
              isBookmarked ? 'fill-warning text-warning' : ''
            }`} />
          </button>
        </div>
      </div>

      {/* Expanded Tags */}
      {showAllTags && (
        <div className="pl-7 pt-1.5 pb-1 flex flex-wrap gap-1">
          {(problem.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-mono text-text-muted bg-surface-raised/50 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Flat Minimal LeetCode-Inspired Dashboard ──────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'Todo' | 'Solved' | 'Attempted'
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTagRegistryExpanded, setIsTagRegistryExpanded] = useState(false);

  const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loginDates, setLoginDates] = useState([]);
  const [stats, setStats] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());

  // Global keyboard shortcut: Press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [problemsRes, streakRes, subsRes, statsRes, loginRes, sheetsRes, bookmarksRes] = await Promise.all([
        API.get('/problems?limit=100'),
        API.get('/users/streak'),
        API.get('/submissions/my?limit=1000'),
        API.get('/users/stats'),
        API.get('/users/login-activity'),
        API.get('/sheets?limit=4'),
        API.get('/users/bookmarks').catch(() => ({ data: { bookmarks: [] } })),
      ]);

      const rawProblems = problemsRes.data?.problems || problemsRes.data?.data?.problems || [];
      const normalizedProblems = rawProblems.map(p => ({
        ...p,
        tags: (p.tags || []).map(t => String(t).toLowerCase())
      }));
      setProblems(normalizedProblems);
      setFilteredProblems(normalizedProblems);

      if (streakRes.data?.data) {
        setStreakData(streakRes.data.data);
      } else if (streakRes.data) {
        setStreakData({
          currentStreak: streakRes.data.currentStreak ?? 0,
          maxStreak: streakRes.data.maxStreak ?? 0
        });
      }

      setSubmissions(subsRes.data?.submissions || subsRes.data?.data?.submissions || []);
      setLoginDates(loginRes.data?.data || loginRes.data || []);
      setStats(statsRes.data?.stats || statsRes.data?.data?.stats || null);
      setSheets(sheetsRes.data || []);

      const rawBookmarks = bookmarksRes.data?.bookmarks || bookmarksRes.data || [];
      const bookmarkIdSet = new Set(rawBookmarks.map(b => String(b.problem?._id || b.problem || b._id || b)));
      setBookmarks(bookmarkIdSet);

    } catch (err) {
      console.error('Data retrieval synchronization failure:', err);
      setError('Unable to load telemetry. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute unique active days
  const totalActiveDays = useMemo(() => {
    const daySet = new Set(loginDates || []);
    submissions.forEach(s => {
      if (s.submittedAt) {
        daySet.add(new Date(s.submittedAt).toISOString().split('T')[0]);
      }
    });
    return Math.max(daySet.size, streakData?.currentStreak || 0);
  }, [loginDates, submissions, streakData]);

  // Unique Tags
  const allTags = useMemo(() => {
    return ['All', ...new Set(problems.flatMap((p) => p.tags || []))];
  }, [problems]);

  // Difficulty counts across entire problem set
  const problemDifficultyTotals = useMemo(() => {
    const totals = { easy: 0, medium: 0, hard: 0, total: problems.length };
    problems.forEach(p => {
      const diff = (p.difficulty || 'easy').toLowerCase();
      if (totals[diff] !== undefined) totals[diff]++;
    });
    return totals;
  }, [problems]);

  // Set of Solved and Attempted Problem IDs
  const { solvedIdSet, attemptedIdSet } = useMemo(() => {
    const solved = new Set();
    const attempted = new Set();

    submissions.forEach(sub => {
      const id = String(sub.problemId || sub.problem?._id || sub.problem);
      if (sub.status === 'Accepted' || sub.status === 'accepted' || sub.status === 'AC') {
        solved.add(id);
      } else {
        attempted.add(id);
      }
    });

    user?.solvedProblems?.forEach(p => {
      solved.add(String(p._id || p));
    });

    return { solvedIdSet: solved, attemptedIdSet: attempted };
  }, [submissions, user]);

  // Tag Mastery Calculation
  const tagMastery = useMemo(() => {
    if (!problems.length) return [];

    const totalByTag = {};
    problems.forEach(p => {
      (p.tags || []).forEach(tag => {
        totalByTag[tag] = (totalByTag[tag] || 0) + 1;
      });
    });

    const solvedByTag = {};
    problems.forEach(p => {
      if (solvedIdSet.has(String(p._id))) {
        (p.tags || []).forEach(tag => {
          solvedByTag[tag] = (solvedByTag[tag] || 0) + 1;
        });
      }
    });

    const masteryArray = Object.keys(totalByTag).map(tag => {
      const solved = solvedByTag[tag] || 0;
      const total = totalByTag[tag];
      return { tag, solved, total, percentage: total > 0 ? (solved / total) * 100 : 0 };
    });

    return masteryArray.sort((a, b) => b.solved - a.solved || a.tag.localeCompare(b.tag));
  }, [problems, solvedIdSet]);

  // Filter problems based on difficulty, status, tag, search, and bookmarks
  useEffect(() => {
    let result = problems;

    if (selectedTag !== 'All') {
      result = result.filter((p) => p.tags?.includes(selectedTag.toLowerCase()));
    }

    if (selectedDifficulty !== 'All') {
      result = result.filter((p) => (p.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    if (selectedStatus !== 'All') {
      result = result.filter((p) => {
        const id = String(p._id);
        const isSolved = solvedIdSet.has(id);
        const isAttempted = !isSolved && attemptedIdSet.has(id);

        if (selectedStatus === 'Solved') return isSolved;
        if (selectedStatus === 'Attempted') return isAttempted;
        if (selectedStatus === 'Todo') return !isSolved && !isAttempted;
        return true;
      });
    }

    if (showOnlyBookmarked) {
      result = result.filter((p) => bookmarks.has(String(p._id)));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    setFilteredProblems(result);
  }, [selectedTag, selectedDifficulty, selectedStatus, showOnlyBookmarked, searchTerm, problems, solvedIdSet, attemptedIdSet, bookmarks]);

  // Pick a random problem (LeetCode feature)
  const handlePickRandomProblem = () => {
    const pool = filteredProblems.length > 0 ? filteredProblems : problems;
    if (!pool.length) return;
    const unsolvedPool = pool.filter(p => !solvedIdSet.has(String(p._id)));
    const targetPool = unsolvedPool.length > 0 ? unsolvedPool : pool;
    const randomProblem = targetPool[Math.floor(Math.random() * targetPool.length)];
    navigate(`/problems/${randomProblem.slug || randomProblem._id}`);
  };

  // Solved Stats variables
  const solvedTotal = stats?.solved?.total || solvedIdSet.size || 0;
  const totalCount = problemDifficultyTotals.total || problems.length || 1;
  const solvedPercentage = Math.round((solvedTotal / totalCount) * 100) || 0;

  // Loading state
  if (loading) {
    return (
      <div className="w-full space-y-6 pt-4 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="h-12 w-full bg-surface-raised/40 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-10 bg-surface-raised/30 rounded" />
            ))}
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-40 bg-surface-raised/30 rounded" />
            <div className="h-40 bg-surface-raised/30 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full py-16 text-center space-y-3">
        <AlertCircle className="w-6 h-6 text-danger mx-auto" />
        <p className="text-xs text-text-muted">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 text-xs text-text border border-border px-3 py-1.5 rounded hover:bg-surface-raised transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">

      {/* ─── 1. Header: Clean Workspace Title & Random Pick Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text">
            {user?.name ? `${user.name}'s Workspace` : 'Coding Workspace'}
          </h1>
          <p className="text-xs text-text-muted">
            Continuous problem-solving progress and algorithmic mastery.
          </p>
        </div>

        {/* LeetCode Pick Random Problem Button */}
        <button
          type="button"
          onClick={handlePickRandomProblem}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text bg-surface-raised hover:bg-surface-raised/80 border border-border/50 hover:border-border rounded transition-colors self-start sm:self-auto"
          title="Pick a random problem to solve"
        >
          <Shuffle className="w-3.5 h-3.5 text-accent" />
          <span>Pick Random</span>
        </button>
      </div>

      {/* ─── 2. Compact Inline Statistics Strip (Flat, No Card Boxes) ─── */}
      {/* Displays Current Streak, Peak/Max Streak, Total Days, Solved, Acceptance, Submissions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-2.5 sm:py-3 border-y border-border/40 text-xs select-none">
        {/* Current Streak */}
        <div className="flex flex-col">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-warning fill-warning" />
            <span>Current Streak</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-text mt-0.5">
            {streakData?.currentStreak ?? 0} days
          </span>
        </div>

        {/* Peak / Max Streak */}
        <div className="flex flex-col sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-text-muted" />
            <span>Max Streak</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-text mt-0.5">
            {streakData?.maxStreak ?? 0} days
          </span>
        </div>

        {/* Total Active Days */}
        <div className="flex flex-col sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <span>Total Days</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-text mt-0.5">
            {totalActiveDays} days
          </span>
        </div>

        {/* Solved Problems */}
        <div className="flex flex-col sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span>Solved</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-success mt-0.5">
            {solvedTotal} <span className="text-[11px] font-normal text-text-muted">/ {totalCount}</span>
          </span>
        </div>

        {/* Acceptance Rate */}
        <div className="flex flex-col sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-text-muted" />
            <span>Acceptance</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-text mt-0.5">
            {stats?.acceptanceRate || 0}%
          </span>
        </div>

        {/* Total Submissions */}
        <div className="flex flex-col sm:border-l sm:border-border/30 sm:pl-3">
          <span className="text-[11px] text-text-muted flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-text-muted" />
            <span>Submissions</span>
          </span>
          <span className="font-mono text-xs sm:text-sm font-medium text-text mt-0.5">
            {stats?.totalSubmissions || 0}
          </span>
        </div>
      </div>

      {/* ─── 3. Curated Sheets Inline Strip (Flat, Minimal, No Bulky Boxes) ─── */}
      {sheets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs" style={{ scrollbarWidth: 'none' }}>
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider shrink-0 mr-1 select-none">
            Curated Sheets:
          </span>
          {sheets.map((sheet) => (
            <button
              key={sheet._id}
              type="button"
              onClick={() => navigate(`/sheets/${sheet.slug || sheet._id}`)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-text bg-surface-raised/40 hover:bg-surface-raised border border-border/40 hover:border-border transition-colors shrink-0"
            >
              <BookOpen className="w-3 h-3 text-accent shrink-0" />
              <span className="font-medium truncate max-w-[160px]">{sheet.name}</span>
            </button>
          ))}
          <Link
            to="/sheets"
            className="text-[11px] text-text-muted hover:text-text flex items-center gap-0.5 ml-auto shrink-0 transition-colors"
          >
            <span>All sheets</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* ─── 4. Main Two-Column Flat Workspace ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-1">

        {/* ─── Left Column: Flat Problems Matrix (~67% width) ─── */}
        <div className="lg:col-span-8 space-y-3.5">

          {/* Filter & Search Bar (Flat, Directly on Canvas) */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/40">
              {/* Difficulty & Status Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Difficulty Pills */}
                <div className="inline-flex items-center p-0.5 bg-surface-raised/40 border border-border/40 rounded">
                  {['All', 'Easy', 'Medium', 'Hard'].map((diff) => {
                    const isSelected = selectedDifficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`px-2.5 py-0.5 rounded text-xs transition-colors select-none ${
                          isSelected
                            ? 'bg-surface text-text font-medium border border-border/60 shadow-xs'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {diff}
                      </button>
                    );
                  })}
                </div>

                {/* Status Filter Dropdown / Pills */}
                <div className="inline-flex items-center p-0.5 bg-surface-raised/40 border border-border/40 rounded">
                  {['All', 'Todo', 'Solved', 'Attempted'].map((st) => {
                    const isSelected = selectedStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors select-none ${
                          isSelected
                            ? 'bg-surface text-text font-medium border border-border/60 shadow-xs'
                            : 'text-text-muted hover:text-text'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>

                {/* Bookmark Toggle Filter */}
                <button
                  type="button"
                  onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors select-none border ${
                    showOnlyBookmarked
                      ? 'bg-warning/10 text-warning border-warning/30 font-medium'
                      : 'text-text-muted hover:text-text border-transparent hover:border-border/40'
                  }`}
                  title="Filter bookmarked problems"
                >
                  <Star className={`w-3 h-3 ${showOnlyBookmarked ? 'fill-warning' : ''}`} />
                  <span className="hidden sm:inline">Saved</span>
                </button>
              </div>

              {/* Minimal Search Input with '/' hotkey */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search questions... (/)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-raised/40 border border-border/40 rounded pl-8 pr-7 py-1 text-xs text-text placeholder-text-muted focus:outline-none focus:border-border transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>

            {/* Tag Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`flex flex-wrap gap-1.5 flex-1 ${!isTagRegistryExpanded ? 'h-6 overflow-hidden' : ''}`}>
                {allTags.map((tag) => {
                  const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(tag)}
                      className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors select-none ${
                        isSelected
                          ? 'bg-text text-bg font-medium'
                          : 'text-text-muted hover:text-text bg-surface-raised/40 hover:bg-surface-raised/70'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {allTags.length > 6 && (
                <button
                  type="button"
                  onClick={() => setIsTagRegistryExpanded(!isTagRegistryExpanded)}
                  className="text-[11px] text-text-muted hover:text-text flex items-center gap-0.5 px-1 py-0.5 shrink-0"
                >
                  {isTagRegistryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{isTagRegistryExpanded ? 'Less' : 'More'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Flat Problem Table / List Rows (No Card Enclosure) */}
          <div className="border-t border-border/40">
            {/* Table Column Header */}
            <div className="flex items-center justify-between py-2 px-2 text-[11px] font-medium text-text-muted border-b border-border/40 select-none">
              <div className="flex items-center gap-3">
                <span className="w-4 text-center">Status</span>
                <span>Title</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-16 text-right">Difficulty</span>
                <span className="w-5 text-right">Save</span>
              </div>
            </div>

            {/* Rows */}
            {filteredProblems.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted space-y-2">
                <p>No problems found matching your criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag('All');
                    setSelectedDifficulty('All');
                    setSelectedStatus('All');
                    setShowOnlyBookmarked(false);
                    setSearchTerm('');
                  }}
                  className="text-xs text-text underline hover:text-accent transition-colors"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredProblems.map((problem) => {
                const currentId = String(problem._id);
                const isSolved = solvedIdSet.has(currentId);
                const isAttempted = !isSolved && attemptedIdSet.has(currentId);

                return (
                  <ProblemItem
                    key={problem._id}
                    problem={problem}
                    isSolved={isSolved}
                    isAttempted={isAttempted}
                  />
                );
              })
            )}
          </div>

          {/* Results count indicator */}
          <div className="pt-1 text-[11px] text-text-muted flex justify-between items-center">
            <span>Showing {filteredProblems.length} of {problems.length} problems</span>
            {(selectedDifficulty !== 'All' || selectedTag !== 'All' || selectedStatus !== 'All' || showOnlyBookmarked || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTag('All');
                  setSelectedDifficulty('All');
                  setSelectedStatus('All');
                  setShowOnlyBookmarked(false);
                  setSearchTerm('');
                }}
                className="hover:text-text underline"
              >
                Clear all filters
              </button>
            )}
          </div>

        </div>

        {/* ─── Right Column: Flat Telemetry & Progress (~33% width) ─── */}
        <div className="lg:col-span-4 space-y-5">

          {/* Section 1: LeetCode-Style Solved Progress Breakdown */}
          <div className="space-y-3 pb-5 border-b border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text">Solved Problems</span>
              <span className="font-mono text-text-muted text-[11px]">
                {solvedTotal} / {totalCount} ({solvedPercentage}%)
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 bg-surface-raised/50 rounded-full overflow-hidden flex">
              <div
                className="bg-success h-full transition-all duration-300"
                style={{
                  width: `${(stats?.solved?.easy || 0) / totalCount * 100}%`
                }}
                title={`Easy: ${stats?.solved?.easy || 0}`}
              />
              <div
                className="bg-warning h-full transition-all duration-300"
                style={{
                  width: `${(stats?.solved?.medium || 0) / totalCount * 100}%`
                }}
                title={`Medium: ${stats?.solved?.medium || 0}`}
              />
              <div
                className="bg-danger h-full transition-all duration-300"
                style={{
                  width: `${(stats?.solved?.hard || 0) / totalCount * 100}%`
                }}
                title={`Hard: ${stats?.solved?.hard || 0}`}
              />
            </div>

            {/* Difficulty Metrics Breakdown */}
            <div className="space-y-2 pt-1 text-xs">
              {/* Easy */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-text-muted">Easy</span>
                </div>
                <div className="font-mono text-[11px] text-text">
                  <span>{stats?.solved?.easy || 0}</span>
                  <span className="text-text-muted"> / {problemDifficultyTotals.easy}</span>
                </div>
              </div>

              {/* Medium */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-text-muted">Medium</span>
                </div>
                <div className="font-mono text-[11px] text-text">
                  <span>{stats?.solved?.medium || 0}</span>
                  <span className="text-text-muted"> / {problemDifficultyTotals.medium}</span>
                </div>
              </div>

              {/* Hard */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-text-muted">Hard</span>
                </div>
                <div className="font-mono text-[11px] text-text">
                  <span>{stats?.solved?.hard || 0}</span>
                  <span className="text-text-muted"> / {problemDifficultyTotals.hard}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Compact Submission Calendar (Flush, No Card) */}
          <div className="space-y-2 pb-5 border-b border-border/40">
            <ActivityHeatmap
              submissions={submissions}
              loginDates={loginDates}
              mode="auto"
            />
          </div>

          {/* Section 3: Submission Execution Summary */}
          <div className="space-y-2 pb-5 border-b border-border/40 text-xs">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Submission Breakdown
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Total Runs:</span>
                <span className="font-mono text-text">{stats?.totalSubmissions || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Accepted Runs:</span>
                <span className="font-mono text-success">
                  {stats?.acceptedSubmissions || stats?.solved?.total || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Pass Rate:</span>
                <span className="font-mono text-accent">{stats?.acceptanceRate || 0}%</span>
              </div>
            </div>
          </div>

          {/* Section 4: Compact Skill Mastery */}
          <div className="space-y-2.5 text-xs">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block">
              Skill Mastery
            </span>

            {tagMastery.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {tagMastery.slice(0, 8).map(({ tag, solved, total, percentage }) => (
                  <div key={tag} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-text capitalize truncate max-w-[140px]">{tag}</span>
                      <span className="font-mono text-text-muted">{solved} / {total}</span>
                    </div>
                    <div className="w-full h-1 bg-surface-raised/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-text-muted/80 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">Solve problems to track skill mastery.</p>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}