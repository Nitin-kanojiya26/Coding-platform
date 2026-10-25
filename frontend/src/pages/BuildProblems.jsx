import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Terminal,
  Cpu,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Server,
  Code2,
  ShieldCheck,
  Zap
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

/**
 * Circular Score Ring
 */
function ScoreRing({ score = null, size = 44, strokeWidth = 3.5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasAttempted = score !== null && score !== undefined;
  const strokeDashoffset = hasAttempted
    ? circumference - (score / 100) * circumference
    : circumference;

  const color =
    score >= 100
      ? 'text-emerald-500'
      : score > 0
      ? 'text-amber-500'
      : 'text-zinc-600';

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/60"
          fill="transparent"
        />
        {/* Progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hasAttempted ? (
          <span className="text-[10px] font-mono font-bold text-text leading-none">
            {score}%
          </span>
        ) : (
          <span className="text-[9px] font-mono text-text-muted leading-none">
            —
          </span>
        )}
      </div>
    </div>
  );
}

export default function BuildProblems() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

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

  // Compute best score per problem from user's history
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

  // Group problems into curriculum tracks
  const tracks = useMemo(() => {
    const filtered = problems.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase());
      const matchesDiff =
        difficultyFilter === 'ALL' ||
        p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      return matchesSearch && matchesDiff;
    });

    const trackDefs = [
      {
        id: 'fundamentals',
        title: 'REST API Fundamentals',
        description: 'Master routing, request parsing, HTTP status codes, and JSON response contracts.',
        icon: Terminal,
        badge: 'Core Track',
        filter: (p) => p.slug.includes('add') || p.slug.includes('calc') || p.slug.includes('multiply') || p.difficulty === 'Easy',
      },
      {
        id: 'crud-state',
        title: 'CRUD & State Management',
        description: 'Implement full entity lifecycles (Create, Read, Update, Delete) with in-memory persistence and ID chaining.',
        icon: Layers,
        badge: 'Intermediate',
        filter: (p) => p.slug.includes('todo') || p.slug.includes('crud') || p.difficulty === 'Medium',
      },
      {
        id: 'advanced',
        title: 'Advanced API Systems',
        description: 'Complex schemas, multi-resource dependencies, error simulation, and rate-limiting resilience.',
        icon: Cpu,
        badge: 'Advanced',
        filter: () => true, // Fallback
      },
    ];

    // Distribute into tracks avoiding duplicates
    const assignedSlugs = new Set();
    const result = [];

    trackDefs.forEach((t) => {
      const matched = filtered.filter((p) => {
        if (assignedSlugs.has(p.slug)) return false;
        if (t.filter(p)) {
          assignedSlugs.add(p.slug);
          return true;
        }
        return false;
      });

      if (matched.length > 0) {
        result.push({ ...t, problems: matched });
      }
    });

    return result;
  }, [problems, search, difficultyFilter]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ─── Hero / Header Banner ─── */}
      <div className="relative overflow-hidden rounded-xl border border-accent-build/30 bg-surface-raised/60 p-5 sm:p-7 backdrop-blur-md">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent-build/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent-build/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-build/15 border border-accent-build/40 text-[11px] font-mono font-semibold text-accent-build tracking-wider uppercase select-none">
              <Boxes className="w-3.5 h-3.5 animate-pulse" />
              <span>API Workbench · Build Mode</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight">
              Build Real Express APIs. Graded in Live Docker Containers.
            </h1>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Step away from single-function algorithms. Write full Node.js + Express web applications, bind to port 3000, and evaluate against rigorous integration test suites run in isolated sandbox environments.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-lg border border-border/40 bg-surface/80 shrink-0">
            <div className="text-center px-2">
              <span className="block text-lg font-bold font-mono text-accent-build">
                {problems.length}
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">APIs</span>
            </div>
            <div className="text-center px-2 border-x border-border/40">
              <span className="block text-lg font-bold font-mono text-text">
                Node 20
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Runtime</span>
            </div>
            <div className="text-center px-2">
              <span className="block text-lg font-bold font-mono text-emerald-400">
                Live
              </span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Sandbox</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-lg bg-surface border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search API problems by title, endpoint, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-text-muted focus:outline-none font-sans"
          />
        </div>

        <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-l border-border/40 pt-2 sm:pt-0 sm:pl-3">
          {['ALL', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setDifficultyFilter(diff)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all select-none ${
                difficultyFilter === diff
                  ? 'bg-accent-build text-black font-bold shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface-raised'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Problem Tracks ─── */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent-build border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-mono text-text-muted">Loading API challenges...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/60 rounded-xl space-y-2">
          <Terminal className="w-8 h-8 text-text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-text">No API problems found</h3>
          <p className="text-xs text-text-muted">Try adjusting your search or difficulty filter.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tracks.map((track) => {
            const TrackIcon = track.icon;
            return (
              <div key={track.id} className="space-y-3">
                {/* Track Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-accent-build/10 text-accent-build border border-accent-build/25">
                      <TrackIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-text tracking-tight">
                          {track.title}
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-border/60 text-text-muted uppercase">
                          {track.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">
                        {track.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted self-start sm:self-auto">
                    {track.problems.length} {track.problems.length === 1 ? 'Challenge' : 'Challenges'}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {track.problems.map((problem) => {
                    const bestScore = bestScores[problem.slug] ?? null;
                    const endpointCount = problem.endpointCount || 1;

                    return (
                      <div
                        key={problem._id || problem.slug}
                        onClick={() => navigate(`/build/${problem.slug}`)}
                        className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/50 bg-surface hover:bg-surface-raised/40 hover:border-accent-build/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                      >
                        {/* Top Info */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold text-text group-hover:text-accent-build transition-colors leading-snug line-clamp-1">
                              {problem.title}
                            </h3>
                            <ScoreRing score={bestScore} size={40} />
                          </div>

                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <DifficultyBadge difficulty={problem.difficulty} />

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25">
                              <Server className="w-3 h-3" />
                              Node + Express
                            </span>

                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/25">
                              <Zap className="w-3 h-3" />
                              {endpointCount} {endpointCount === 1 ? 'Endpoint' : 'Endpoints'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom CTA */}
                        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {problem.limits?.totalTimeoutMs ? `${problem.limits.totalTimeoutMs / 1000}s Limit` : '20s Limit'}
                          </span>
                          <span className="text-xs font-medium text-accent-build flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Open Workbench
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
