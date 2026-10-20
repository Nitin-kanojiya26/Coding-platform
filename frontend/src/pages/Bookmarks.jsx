import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../hooks/useBookmark';
import {
  Bookmark, CheckCircle, Circle, ArrowUpRight,
  ChevronDown, ChevronUp
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

// ─── Flat Minimal Bookmarked Problem Row ────────────────────────
const BookmarkedItem = ({ problem, isSolved, isAttempted, onRemoved }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);
  const [showAllTags, setShowAllTags] = useState(false);
  const navigate = useNavigate();

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark();
    if (onRemoved) onRemoved(problem._id);
  };

  return (
    <div
      onClick={() => navigate(`/problems/${problem.slug || problem._id}`)}
      className="group flex flex-col border-b border-border/30 hover:bg-surface-raised/35 transition-colors cursor-pointer py-2.5 px-2 select-none"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Status + Title + Tags */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
            onClick={handleToggle}
            disabled={bookmarkLoading}
            className="p-1 text-text-muted hover:text-text transition-colors"
            title="Remove bookmark"
            aria-label="Remove bookmark"
          >
            <Bookmark className={`h-3.5 w-3.5 transition-all fill-warning text-warning`} />
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

// ─── Main Bookmarks Workspace ────────────────────────────────────
export default function Bookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState(new Set());
  const [attemptedIds, setAttemptedIds] = useState(new Set());

  useEffect(() => {
    Promise.all([
      API.get('/users/bookmarks'),
      API.get('/submissions/my?limit=1000')
    ])
      .then(([bookmarksRes, subsRes]) => {
        const data = bookmarksRes.data.bookmarks || bookmarksRes.data.data || [];
        setBookmarks(data);

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
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to sync bookmarks telemetry:', err);
        setLoading(false);
      });
  }, [user]);

  const handleRemoved = (removedId) => {
    setBookmarks(prev => prev.filter(p => String(p._id) !== String(removedId)));
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-warning fill-warning" /> Saved Problems
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Quick-access review list of your bookmarked problems.
          </p>
        </div>

        <div className="text-[11px] font-mono text-text-muted self-start sm:self-auto">
          Total: <strong className="text-text font-mono">{bookmarks.length}</strong>
        </div>
      </div>

      {/* Flat List */}
      {bookmarks.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-xs text-text-muted">No bookmarked problems found.</p>
          <Link
            to="/problems"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Explore problems <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="border-t border-border/40">
          <div className="flex items-center justify-between py-2 px-2 text-[11px] font-medium text-text-muted border-b border-border/40 select-none">
            <div className="flex items-center gap-3">
              <span className="w-4 text-center">Status</span>
              <span>Title</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-16 text-right">Difficulty</span>
              <span className="w-5 text-right">Action</span>
            </div>
          </div>

          {bookmarks.map((problem) => {
            const currentId = String(problem._id);
            const isSolved = solvedIds.has(currentId);
            const isAttempted = !isSolved && attemptedIds.has(currentId);

            return (
              <BookmarkedItem
                key={problem._id}
                problem={problem}
                isSolved={isSolved}
                isAttempted={isAttempted}
                onRemoved={handleRemoved}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}