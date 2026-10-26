import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Search,
  CheckCircle2,
  Circle,
  ArrowRight,
  Server,
  Zap,
  RotateCcw,
  LayoutGrid,
  List
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

/**
 * Minimalist HTTP Method Chip
 */
function MethodTag({ method = 'GET' }) {
  const m = method.toUpperCase();
  const colors = {
    GET: 'text-sky-400 bg-sky-400/10 border-sky-400/25',
    POST: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
    PUT: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    PATCH: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
    DELETE: 'text-rose-400 bg-rose-400/10 border-rose-400/25',
  };

  return (
    <span
      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border select-none tracking-wider ${
        colors[m] || 'text-text-muted bg-surface-raised border-border/40'
      }`}
    >
      {m}
    </span>
  );
}

export default function BuildProblems() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchInputRef = useRef(null);

  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('build_view_mode') || 'grid';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('build_view_mode', mode);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [problemsRes, subsRes] = await Promise.allSettled([
          API.get('/build/problems'),
          API.get('/build/submissions'),
        ]);

        if (isMounted && problemsRes.status === 'fulfilled') {
          setProblems(problemsRes.value.data?.problems || []);
        }

        if (isMounted && subsRes.status === 'fulfilled') {
          setSubmissions(subsRes.value.data?.submissions || []);
        }
      } catch (err) {
        console.error('Failed to load build problems:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Best scores map
  const bestScores = useMemo(() => {
    const map = {};
    submissions.forEach((sub) => {
      const slug = sub.problemId?.slug || (typeof sub.problemId === 'string' ? sub.problemId : null);
      if (slug) {
        const currentBest = map[slug] ?? 0;
        if (sub.score !== undefined && sub.score > currentBest) {
          map[slug] = sub.score;
        }
      }
    });
    return map;
  }, [submissions]);

  // Telemetry stats
  const stats = useMemo(() => {
    const total = problems.length;
    let solved = 0;
    let attempted = 0;

    problems.forEach((p) => {
      const score = bestScores[p.slug];
      if (score >= 100) {
        solved += 1;
      } else if (score > 0) {
        attempted += 1;
      }
    });

    return { total, solved, attempted };
  }, [problems, bestScores]);

  // Filtered list
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        (p.endpoints || []).some((ep) => ep.toLowerCase().includes(search.toLowerCase()));

      const matchesDiff =
        difficultyFilter === 'ALL' ||
        p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

      const score = bestScores[p.slug];
      let matchesStatus = true;
      if (statusFilter === 'SOLVED') {
        matchesStatus = score >= 100;
      } else if (statusFilter === 'ATTEMPTED') {
        matchesStatus = score > 0 && score < 100;
      } else if (statusFilter === 'TODO') {
        matchesStatus = score === undefined || score === 0;
      }

      return matchesSearch && matchesDiff && matchesStatus;
    });
  }, [problems, search, difficultyFilter, statusFilter, bestScores]);

  const hasActiveFilters = search || difficultyFilter !== 'ALL' || statusFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setDifficultyFilter('ALL');
    setStatusFilter('ALL');
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn max-w-7xl mx-auto px-1 sm:px-2">
      {/* ─── Minimal Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/30">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">
              API Challenges
            </h1>
            <span className="text-[10px] font-mono text-accent-build bg-accent-build/10 border border-accent-build/20 px-1.5 py-0.5 rounded select-none">
              Node.js
            </span>
          </div>
          <p className="text-xs text-text-muted">
            Build and test REST APIs live in Docker containers.
          </p>
        </div>

        {/* Minimal Progress Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-text-muted select-none self-start sm:self-auto">
          <div>
            <span className="text-sm font-bold text-accent-build">{stats.solved}</span>
            <span className="text-text-muted/60 text-[11px]">/{stats.total} Solved</span>
          </div>
          <div className="h-3.5 w-px bg-border/40" />
          <div>
            <span className="text-sm font-bold text-text">{stats.attempted}</span>
            <span className="text-text-muted/60 text-[11px]"> In Progress</span>
          </div>
        </div>
      </div>

      {/* ─── Controls Toolbar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 py-0.5">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted/60" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search challenges... (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-raised/40 border border-border/40 hover:border-border/70 focus:border-accent-build rounded-md pl-8 pr-7 py-1.5 text-xs text-text placeholder:text-text-muted/60 focus:outline-none transition-colors font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted hover:text-text p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters & View Switcher */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Difficulty Segment */}
          <div className="flex items-center gap-0.5 bg-surface-raised/40 p-0.5 rounded-md border border-border/40 text-xs">
            {['ALL', 'Easy', 'Medium', 'Hard'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-accent-build/15 text-accent-build font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {diff === 'ALL' ? 'All' : diff}
              </button>
            ))}
          </div>

          {/* Status Segment */}
          <div className="flex items-center gap-0.5 bg-surface-raised/40 p-0.5 rounded-md border border-border/40 text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'SOLVED', label: 'Solved' },
              { id: 'ATTEMPTED', label: 'Started' },
              { id: 'TODO', label: 'Todo' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  statusFilter === st.id
                    ? 'bg-accent-build/15 text-accent-build font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-surface-raised/40 p-0.5 rounded-md border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-accent-build/15 text-accent-build'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`p-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent-build/15 text-accent-build'
                  : 'text-text-muted hover:text-text'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs text-text-muted hover:text-text hover:bg-surface-raised/40 rounded transition-colors"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-lg border border-border/30 bg-surface/60 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-border/40 rounded" />
                <div className="h-4 w-12 bg-border/30 rounded" />
              </div>
              <div className="h-4 bg-border/40 rounded w-40" />
              <div className="pt-2 border-t border-border/20 flex justify-between">
                <div className="h-3 w-20 bg-border/20 rounded" />
                <div className="h-3 w-10 bg-border/30 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/40 rounded-lg space-y-2 bg-surface/20">
          <p className="text-xs text-text-muted">No API challenges found.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-accent-build hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ════════ VIEW 1: Minimal Blueprint Cards ════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredProblems.map((problem) => {
            const bestScore = bestScores[problem.slug];
            const isSolved = bestScore >= 100;
            const isAttempted = bestScore > 0 && bestScore < 100;
            const endpoints = problem.endpoints || [];
            const primaryEndpoint = endpoints[0] || 'GET /';
            const [primaryMethod, primaryPath] = primaryEndpoint.includes(' ')
              ? primaryEndpoint.split(' ')
              : ['GET', primaryEndpoint];

            return (
              <div
                key={problem._id || problem.slug}
                onClick={() => navigate(`/build/${problem.slug}`)}
                className="group relative flex flex-col justify-between p-4 rounded-lg border border-border/40 bg-surface hover:bg-surface-raised/40 hover:border-accent-build/50 transition-all duration-150 cursor-pointer"
              >
                {/* Top: Method, Endpoint Path & Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MethodTag method={primaryMethod} />
                      <span className="font-mono text-xs font-semibold text-text truncate max-w-[180px] sm:max-w-[220px]">
                        {primaryPath}
                      </span>
                      {endpoints.length > 1 && (
                        <span className="text-[10px] font-mono text-text-muted/60 bg-surface-raised/60 border border-border/30 px-1 rounded shrink-0">
                          +{endpoints.length - 1}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <DifficultyBadge difficulty={problem.difficulty} />
                      {isSolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>100%</span>
                        </span>
                      ) : isAttempted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded">
                          <Circle className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          <span>{bestScore}%</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-sm sm:text-base font-semibold text-text group-hover:text-accent-build transition-colors tracking-tight">
                    {problem.title}
                  </h2>
                </div>

                {/* Bottom Ribbon */}
                <div className="pt-3 mt-3 border-t border-border/25 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1">
                        <Server className="w-3 h-3 text-emerald-400/80" />
                        <span>Node.js</span>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-3 h-3 text-accent-build/80" />
                        <span>{problem.endpointCount || 1} {problem.endpointCount === 1 ? 'Route' : 'Routes'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 font-sans text-xs font-semibold text-accent-build group-hover:translate-x-1 transition-transform">
                      <span>Launch</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Micro Progress Line */}
                  <div className="h-0.5 w-full bg-border/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isSolved
                          ? 'bg-emerald-400 w-full'
                          : isAttempted
                          ? 'bg-amber-400'
                          : 'bg-transparent w-0'
                      }`}
                      style={{ width: isAttempted ? `${bestScore}%` : undefined }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ════════ VIEW 2: Minimal List Table ════════ */
        <div className="border border-border/40 rounded-lg overflow-hidden bg-surface">
          {/* Table Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/30 bg-surface-raised/40 text-[11px] font-mono text-text-muted uppercase tracking-wider select-none">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-4 text-center">#</span>
              <span className="w-20">Method</span>
              <span className="flex-1">Challenge</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right pr-2">
              <span className="w-16 text-center">Difficulty</span>
              <span className="w-14 text-right">Score</span>
              <span className="w-10 text-right" />
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border/20">
            {filteredProblems.map((problem) => {
              const bestScore = bestScores[problem.slug];
              const isSolved = bestScore >= 100;
              const isAttempted = bestScore > 0 && bestScore < 100;
              const endpoints = problem.endpoints || [];
              const primaryEndpoint = endpoints[0] || 'GET /';
              const [primaryMethod, primaryPath] = primaryEndpoint.includes(' ')
                ? primaryEndpoint.split(' ')
                : ['GET', primaryEndpoint];

              return (
                <div
                  key={problem._id || problem.slug}
                  onClick={() => navigate(`/build/${problem.slug}`)}
                  className="group flex items-center justify-between px-3.5 py-2.5 hover:bg-surface-raised/40 transition-colors cursor-pointer select-none"
                >
                  {/* Status + Method + Title + Path */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                    <div className="w-4 flex justify-center shrink-0">
                      {isSolved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isAttempted ? (
                        <Circle className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-border/80 group-hover:bg-accent-build transition-colors" />
                      )}
                    </div>

                    <div className="w-20 shrink-0">
                      <MethodTag method={primaryMethod} />
                    </div>

                    <div className="min-w-0 flex-1 flex items-baseline gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-text group-hover:text-accent-build transition-colors truncate">
                        {problem.title}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted/60 hidden sm:inline truncate">
                        {primaryPath}
                      </span>
                    </div>
                  </div>

                  {/* Difficulty + Score + Action */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right pr-2">
                    <div className="w-16 flex justify-center">
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </div>

                    <div className="w-14 text-right">
                      {isSolved ? (
                        <span className="text-xs font-mono font-bold text-emerald-400">100%</span>
                      ) : isAttempted ? (
                        <span className="text-xs font-mono font-bold text-amber-400">{bestScore}%</span>
                      ) : (
                        <span className="text-xs font-mono text-text-muted/50">—</span>
                      )}
                    </div>

                    <div className="w-10 flex justify-end text-xs font-semibold text-accent-build group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
