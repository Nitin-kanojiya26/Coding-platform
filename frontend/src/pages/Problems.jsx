import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../hooks/useBookmark';
import {
  Search, Bookmark, CheckCircle, Circle, BookOpen,
  Shuffle, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

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

// ─── Main Problems Page ──────────────────────────────────────────
export default function Problems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [problems, setProblems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [isTagExpanded, setIsTagExpanded] = useState(false);

  const [solvedIds, setSolvedIds] = useState(new Set());
  const [attemptedIds, setAttemptedIds] = useState(new Set());

  // Global '/' keyboard listener
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

  useEffect(() => {
    Promise.all([
      API.get('/problems?limit=100'),
      API.get('/submissions/my?limit=1000'),
      API.get('/users/bookmarks').catch(() => ({ data: { bookmarks: [] } })),
    ])
      .then(([problemsRes, subsRes, bookmarksRes]) => {
        const rawProblems = problemsRes.data.problems || problemsRes.data.data?.problems || [];
        const problemList = rawProblems.map(p => ({
          ...p,
          tags: (p.tags || []).map(t => String(t).toLowerCase())
        }));
        setProblems(problemList);
        setFiltered(problemList);

        const history = subsRes.data.submissions || subsRes.data.data?.submissions || [];
        const solved = new Set();
        const attempted = new Set();

        history.forEach(sub => {
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

        setSolvedIds(solved);
        setAttemptedIds(attempted);

        const rawBookmarks = bookmarksRes.data?.bookmarks || bookmarksRes.data || [];
        const bookmarkIdSet = new Set(rawBookmarks.map(b => String(b.problem?._id || b.problem || b._id || b)));
        setBookmarks(bookmarkIdSet);

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  // Unique tags
  const allTags = useMemo(() => {
    return ['All', ...new Set(problems.flatMap((p) => p.tags || []))];
  }, [problems]);

  // Filter logic
  useEffect(() => {
    let result = problems;

    if (selectedTag !== 'All') {
      result = result.filter(p => p.tags?.includes(selectedTag.toLowerCase()));
    }

    if (selectedDifficulty !== 'All') {
      result = result.filter(p => (p.difficulty || '').toLowerCase() === selectedDifficulty.toLowerCase());
    }

    if (selectedStatus !== 'All') {
      result = result.filter(p => {
        const id = String(p._id);
        const isSolved = solvedIds.has(id);
        const isAttempted = !isSolved && attemptedIds.has(id);

        if (selectedStatus === 'Solved') return isSolved;
        if (selectedStatus === 'Attempted') return isAttempted;
        if (selectedStatus === 'Todo') return !isSolved && !isAttempted;
        return true;
      });
    }

    if (showOnlyBookmarked) {
      result = result.filter(p => bookmarks.has(String(p._id)));
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    setFiltered(result);
  }, [selectedTag, selectedDifficulty, selectedStatus, showOnlyBookmarked, searchTerm, problems, solvedIds, attemptedIds, bookmarks]);

  const handlePickRandom = () => {
    const pool = filtered.length > 0 ? filtered : problems;
    if (!pool.length) return;
    const unsolvedPool = pool.filter(p => !solvedIds.has(String(p._id)));
    const targetPool = unsolvedPool.length > 0 ? unsolvedPool : pool;
    const random = targetPool[Math.floor(Math.random() * targetPool.length)];
    navigate(`/problems/${random.slug || random._id}`);
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-48 bg-surface-raised rounded" />
        <div className="h-10 w-full bg-surface-raised/40 rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> Problems
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Explore coding challenges across data structures, algorithms, and system design.
          </p>
        </div>

        {/* LeetCode Pick Random Problem Button */}
        <button
          type="button"
          onClick={handlePickRandom}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text bg-surface-raised hover:bg-surface-raised/80 border border-border/50 hover:border-border rounded transition-colors self-start sm:self-auto"
          title="Pick a random problem to solve"
        >
          <Shuffle className="w-3.5 h-3.5 text-accent" />
          <span>Pick Random</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/40">
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

            {/* Status Pills */}
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

            {/* Bookmarked Filter */}
            <button
              type="button"
              onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors select-none border ${
                showOnlyBookmarked
                  ? 'bg-warning/10 text-warning border-warning/30 font-medium'
                  : 'text-text-muted hover:text-text border-transparent hover:border-border/40'
              }`}
            >
              <Star className={`w-3 h-3 ${showOnlyBookmarked ? 'fill-warning' : ''}`} />
              <span className="hidden sm:inline">Saved</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search problems... (/)"
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

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className={`flex flex-wrap gap-1.5 flex-1 ${!isTagExpanded ? 'h-6 overflow-hidden' : ''}`}>
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
              onClick={() => setIsTagExpanded(!isTagExpanded)}
              className="text-[11px] text-text-muted hover:text-text flex items-center gap-0.5 px-1 py-0.5 shrink-0"
            >
              {isTagExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{isTagExpanded ? 'Less' : 'More'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Flat LeetCode Problem Table */}
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
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-text-muted space-y-2">
            <p>No problems found matching your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedDifficulty('All');
                setSelectedStatus('All');
                setSelectedTag('All');
                setShowOnlyBookmarked(false);
                setSearchTerm('');
              }}
              className="text-xs text-text underline hover:text-accent transition-colors"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filtered.map((problem) => {
            const currentId = String(problem._id);
            const isSolved = solvedIds.has(currentId);
            const isAttempted = !isSolved && attemptedIds.has(currentId);

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

      {/* Results Count Footer */}
      <div className="pt-1 text-[11px] text-text-muted flex justify-between items-center">
        <span>Showing {filtered.length} of {problems.length} problems</span>
        {(selectedDifficulty !== 'All' || selectedTag !== 'All' || selectedStatus !== 'All' || showOnlyBookmarked || searchTerm) && (
          <button
            type="button"
            onClick={() => {
              setSelectedDifficulty('All');
              setSelectedStatus('All');
              setSelectedTag('All');
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
  );
}