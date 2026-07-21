import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Bookmark, CheckCircle2, AlertCircle, HelpCircle, ArrowUpRight } from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

export default function Bookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solvedIds, setSolvedIds] = useState([]);
  const [attemptedIds, setAttemptedIds] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get('/users/bookmarks'),
      API.get('/submissions/my?limit=1000')
    ])
      .then(([bookmarksRes, subsRes]) => {
        const data = bookmarksRes.data.bookmarks || bookmarksRes.data.data || [];
        setBookmarks(data);

        const history = subsRes.data.submissions || [];
        const acceptedProblemIds = history
          .filter(sub => sub.status === 'Accepted' || sub.status === 'AC')
          .map(sub => String(sub.problemId || sub.problem?._id || sub.problem));
          
        const allAttemptedIds = history.map(sub => String(sub.problemId || sub.problem?._id || sub.problem));
        const userContextSolved = user?.solvedProblems?.map(p => String(p._id || p)) || [];
        
        setSolvedIds([...new Set([...userContextSolved, ...acceptedProblemIds])]);
        setAttemptedIds([...new Set(allAttemptedIds)]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to sync workspace bookmark telemetry:', err);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="w-5 h-5 border-2 border-base border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-8 py-12 text-muted font-sans antialiased selection:bg-accent/10 selection:text-accent">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Flat Minimalist Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-base">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <h1 className="text-base font-semibold text-primary tracking-tight">
                Saved Workspaces
              </h1>
            </div>
            <p className="text-xs text-muted">
              Personal reference compilation and archived programming items.
            </p>
          </div>
          <div className="text-[11px] font-mono text-muted bg-secondary border border-base px-2.5 py-1 rounded-md self-start sm:self-auto">
            INDEXED_ITEMS // {bookmarks.length.toString().padStart(2, '0')}
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-base rounded-xl bg-card space-y-3">
            <Bookmark className="h-5 w-5 mx-auto text-muted" />
            <p className="text-xs font-mono text-muted">NO_RECORDS_FOUND</p>
            <Link 
              to="/problems" 
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-primary transition-colors duration-150"
            >
              Scan index directory <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          /* Structural Multi-Column Asymmetric Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.map((problem) => {
              const currentId = String(problem._id);
              const isSolved = solvedIds.includes(currentId);
              const isAttempted = !isSolved && attemptedIds.includes(currentId);

              return (
                <Link
                  key={problem._id}
                  to={`/problems/${problem.slug}`}
                  className="group relative bg-card border border-base hover:border-light rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all duration-200 hover:-translate-y-0.5 select-none"
                >
                  {/* Card Header Layer */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      {/* Interactive Tri-State Visual Flag badges */}
                      {isSolved ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
                          <CheckCircle2 className="h-3 w-3" /> Solved
                        </div>
                      ) : isAttempted ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/5 text-amber-400 border border-amber-500/10">
                          <AlertCircle className="h-3 w-3" /> Attempted
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-secondary text-muted border border-base">
                          <HelpCircle className="h-3 w-3" /> Unvisited
                        </div>
                      )}
                      
                      <Bookmark className="h-3.5 w-3.5 text-muted group-hover:text-accent fill-transparent group-hover:fill-accent/5 transition-colors duration-200" />
                    </div>

                    <h3 className="text-sm font-medium text-secondary group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {problem.title}
                    </h3>
                  </div>

                  {/* Card Footer Structural Elements */}
                  <div className="pt-4 mt-4 border-t border-base/60 flex items-center justify-between gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    
                    {/* Compact Dynamic Meta Tags Container */}
                    <div className="flex gap-1 overflow-hidden max-w-[60%]">
                      {(problem.tags || []).slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono text-muted bg-secondary/40 border border-base px-1.5 py-0.5 rounded truncate"
                        >
                          {tag.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}