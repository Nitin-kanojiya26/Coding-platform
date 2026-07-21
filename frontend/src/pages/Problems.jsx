import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../hooks/useBookmark';
import { Search, Bookmark, CheckCircle, Circle, BookOpen } from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

// ─── Fluid Problem Row Component ───────────────────────────────────
const ProblemItem = ({ problem, isSolved, isAttempted }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <div className="group relative border-b border-base last:border-0 transition-all duration-200">
      {/* Subtle Row Hover Effect */}
      <div className="absolute inset-y-1 -inset-x-3 rounded-xl opacity-0 group-hover:opacity-100 bg-hover/50 transition-all duration-200" />
      
      <div className="relative flex items-center justify-between py-4 px-3 select-none">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Active Accent Hover Bar */}
          <div className="w-[3px] h-5 rounded-full self-center bg-transparent group-hover:bg-accent group-hover:shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-all duration-200" />

          {/* Tri-State Diagnostics Status Icon Block */}
          <div className="flex-shrink-0">
            {isSolved ? (
              <div className="p-1 rounded-md bg-emerald-500/5 border border-emerald-500/20" title="Solved / Passed">
                <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
              </div>
            ) : isAttempted ? (
              /* LeetCode Precision Architecture: Small circle nested inside an outer circular ring frame */
              <div className="h-6 w-6 flex items-center justify-center text-amber-500 transition-colors" title="Attempted">
                <div className="h-4.5 w-4.5 rounded-full border-2 border-amber-500/80 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                </div>
              </div>
            ) : (
              <div className="p-1">
                <Circle className="h-4 w-4 text-muted group-hover:text-secondary transition-colors" />
              </div>
            )}
          </div>

          {/* Title & Metadata Layout */}
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pr-4">
            <Link 
              to={`/problems/${problem.slug}`}
              className="text-sm font-medium text-secondary group-hover:text-primary transition-colors duration-150 truncate"
            >
              {problem.title}
            </Link>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <DifficultyBadge difficulty={problem.difficulty} />
              
              {/* High-Visibility Tag Architecture */}
              <div className="flex items-center gap-1.5">
                {problem.tags.slice(0, 3).map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="text-[10px] font-bold tracking-wide text-secondary bg-hover/50 border border-light/80 px-2.5 py-0.5 rounded-md shadow-sm transition-colors group-hover:border-light"
                  >
                    {tag}
                  </span>
                ))}
                {problem.tags.length > 3 && (
                  <span className="text-[10px] text-muted font-bold bg-hover/40 border border-base px-1.5 py-0.5 rounded-md">
                    +{problem.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="relative flex items-center gap-3 ml-4 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} 
            disabled={bookmarkLoading} 
            className="p-1.5 rounded-lg text-muted hover:text-secondary transition-colors"
          >
            <Bookmark className={`h-4 w-4 transition-all duration-350 ${
              isBookmarked 
                ? 'fill-accent text-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' 
                : ''
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Problems Workspace Component ───────────────────────────────
export default function Problems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Explicit analytical state trackers
  const [solvedIds, setSolvedIds] = useState([]);
  const [attemptedIds, setAttemptedIds] = useState([]);

  useEffect(() => {
    // Synchronize problem sets and parse user execution streams for verification states
    Promise.all([
      API.get('/problems'),
      API.get('/submissions/my?limit=1000')
    ])
      .then(([problemsRes, subsRes]) => {
        const problemList = problemsRes.data.problems || [];
        setProblems(problemList);
        setFiltered(problemList);
        
        const history = subsRes.data.submissions || [];
        
        // 1. Extract problems containing an explicitly passed/accepted verification code
        const acceptedProblemIds = history
          .filter(sub => sub.status === 'Accepted' || sub.status === 'AC')
          .map(sub => String(sub.problemId || sub.problem?._id || sub.problem));
          
        // 2. Extract every problem ever interacted with
        const allAttemptedIds = history.map(sub => String(sub.problemId || sub.problem?._id || sub.problem));

        // Sync local tracking lists with type-safe string formats
        const userContextSolved = user?.solvedProblems?.map(p => String(p._id || p)) || [];
        
        // Final Union Set of Solved Items
        const finalSolved = [...new Set([...userContextSolved, ...acceptedProblemIds])];
        const finalAttempted = [...new Set(allAttemptedIds)];

        setSolvedIds(finalSolved);
        setAttemptedIds(finalAttempted);
        
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      const result = problems.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
      setFiltered(result);
    } else {
      setFiltered(problems);
    }
  }, [searchTerm, problems]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <div className="w-5 h-5 border-2 border-base border-t-accent rounded-full animate-spin" />
    </div>
  );

  return (
    /* OUTER BOX LAYER: Flat Pure Black Base Void Layout */
    <div className="min-h-screen bg-primary px-6 py-10 text-muted font-sans antialiased selection:bg-accent/20 selection:text-accent">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Title Header Block */}
        <div className="pb-4 border-b border-base">
          <h1 className="text-xl font-bold text-primary tracking-wide flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> Browse Registries
          </h1>
          <p className="text-xs text-muted mt-1">
            Locate core files, track verification status, and manage workspace bookmarks.
          </p>
        </div>

        {/* Pure Black Layered Search Input */}
        <div className="relative group rounded-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search problem index repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-secondary border border-base rounded-xl text-secondary placeholder-muted outline-none text-xs transition-all duration-150 focus:border-light"
          />
        </div>

        {/* Elevated Matte Charcoal Card Panel */}
        <div className="bg-secondary border border-base/80 rounded-2xl p-5 space-y-2 shadow-md">
          <div className="divide-y divide-base/60">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted text-xs font-mono tracking-wider bg-primary border border-base rounded-xl">
                ZERO SYSTEM REGISTRIES LOCATED
              </div>
            ) : (
              filtered.map((problem) => {
                const currentId = String(problem._id);
                const isSolved = solvedIds.includes(currentId);
                const isAttempted = !isSolved && attemptedIds.includes(currentId);

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
        </div>
        
      </div>
    </div>
  );
}