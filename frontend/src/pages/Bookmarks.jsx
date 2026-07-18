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
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="w-5 h-5 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-8 py-12 text-zinc-400 font-sans antialiased selection:bg-space-blue/10 selection:text-space-blue">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Flat Minimalist Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-space-blue animate-pulse" />
              <h1 className="text-base font-semibold text-white tracking-tight">
                Saved Workspaces
              </h1>
            </div>
            <p className="text-xs text-zinc-500">
              Personal reference compilation and archived programming items.
            </p>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-md self-start sm:self-auto">
            INDEXED_ITEMS // {bookmarks.length.toString().padStart(2, '0')}
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-900 rounded-xl bg-[#020203] space-y-3">
            <Bookmark className="h-5 w-5 mx-auto text-zinc-800" />
            <p className="text-xs font-mono text-zinc-600">NO_RECORDS_FOUND</p>
            <Link 
              to="/problems" 
              className="inline-flex items-center gap-1 text-xs text-space-blue hover:text-white transition-colors duration-150"
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
                  className="group relative bg-[#050507] border border-zinc-900 hover:border-zinc-800 rounded-xl p-5 flex flex-col justify-between min-h-[160px] transition-all duration-200 hover:-translate-y-0.5 select-none"
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
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-900 text-zinc-500 border border-zinc-800">
                          <HelpCircle className="h-3 w-3" /> Unvisited
                        </div>
                      )}
                      
                      <Bookmark className="h-3.5 w-3.5 text-zinc-700 group-hover:text-space-blue fill-transparent group-hover:fill-space-blue/5 transition-colors duration-200" />
                    </div>

                    <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                      {problem.title}
                    </h3>
                  </div>

                  {/* Card Footer Structural Elements */}
                  <div className="pt-4 mt-4 border-t border-zinc-900/60 flex items-center justify-between gap-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    
                    {/* Compact Dynamic Meta Tags Container */}
                    <div className="flex gap-1 overflow-hidden max-w-[60%]">
                      {(problem.tags || []).slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-850 px-1.5 py-0.5 rounded truncate"
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