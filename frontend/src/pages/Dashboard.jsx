import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { useBookmark } from '../hooks/useBookmark';
import {
  Search, ChevronDown, ChevronUp, Calendar, Flame, Bookmark,
  CheckCircle, Trophy, Sparkles, Zap, Layers
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

// ─── Heatmap Component ──────────────────────────────────────────
const Heatmap = ({ submissions }) => {
  const scrollRef = useRef(null);

  // Build set of active dates (days with submissions)
  const activeDays = useMemo(() => {
    const set = new Set();
    submissions.forEach(s => {
      const date = new Date(s.submittedAt).toISOString().split('T')[0];
      set.add(date);
    });
    return set;
  }, [submissions]);

  // Generate last 365 days
  const days = useMemo(() => {
    const arr = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  // Group into weeks
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  const hasActivity = (date) => {
    const key = date.toISOString().split('T')[0];
    return activeDays.has(key);
  };

  // Stats
  const { totalDays, maxStreak } = useMemo(() => {
    const dates = Array.from(activeDays).sort();
    const total = dates.length;
    let streak = 0, maxS = 0, prev = null;
    for (const d of dates) {
      const cur = new Date(d);
      if (prev === null) streak = 1;
      else {
        const diff = (cur - prev) / (1000 * 60 * 60 * 24);
        streak = diff === 1 ? streak + 1 : 1;
      }
      prev = cur;
      maxS = Math.max(maxS, streak);
    }
    return { totalDays: total, maxStreak: maxS };
  }, [activeDays]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  return (
    <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="font-medium">Login Activity</span>
          <span className="text-xs text-slate-600">· last 365 days</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-slate-500">Active: <span className="text-white font-bold">{totalDays}</span></span>
          <span className="text-slate-500">Max streak: <span className="text-orange-400 font-bold">{maxStreak}</span></span>
        </div>
      </div>

      <div className="relative">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-visible pb-2 scroll-smooth" style={{ maxHeight: '120px' }}>
          <div className="min-w-max">
            <div className="flex text-[9px] text-slate-600 mb-1 pl-6">
              {weeks.map((week, idx) => {
                const month = week[0]?.toLocaleString('default', { month: 'short' });
                const prevMonth = idx > 0 ? weeks[idx-1][0]?.getMonth() : -1;
                const curMonth = week[0]?.getMonth();
                if (curMonth !== undefined && curMonth !== prevMonth) {
                  return <div key={idx} style={{ width: '18px' }} className="text-center font-medium">{month}</div>;
                }
                return <div key={idx} style={{ width: '18px' }} />;
              })}
            </div>
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 pr-2 text-[8px] text-slate-600 font-mono">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(l => (
                  <div key={l} className="h-2.5 flex items-center">{l}</div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((date, di) => {
                    const active = hasActivity(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={di}
                        className={`w-2.5 h-2.5 rounded-sm transition-all duration-200 hover:ring-1 hover:ring-cyan-400 cursor-default ${
                          active ? 'bg-cyan-500' : 'bg-slate-800'
                        } ${isToday ? 'ring-1 ring-cyan-400 ring-offset-1 ring-offset-[#0a0e1a]' : ''}`}
                        title={`${date.toLocaleDateString()}: ${active ? 'Active' : 'Inactive'}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0a0e1a] to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0a0e1a] to-transparent pointer-events-none" />
      </div>

      <div className="flex items-center justify-end gap-2 mt-2 text-[9px] text-slate-500">
        <span>Inactive</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
        <span>→</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
        <span>Active</span>
      </div>
    </div>
  );
};

// ─── Problem Item ──────────────────────────────────────────────
const ProblemItem = ({ problem, isExpanded, onToggle }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <div className="group relative bg-gradient-to-br from-[#0a0e1a] to-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden transition-all duration-500 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="relative flex items-center justify-between px-6 py-4 cursor-pointer" onClick={() => onToggle(problem._id)}>
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="flex-shrink-0"><DifficultyBadge difficulty={problem.difficulty} /></div>
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors duration-300 truncate">{problem.title}</h3>
          <div className="hidden sm:flex flex-wrap gap-1.5 ml-2">
            {problem.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-[#1e293b] text-slate-400 text-[10px] rounded-full border border-[#334155]">#{tag}</span>
            ))}
            {problem.tags.length > 3 && <span className="text-[10px] text-slate-500">+{problem.tags.length - 3}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <button onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} disabled={bookmarkLoading} className="p-1.5 rounded-lg hover:bg-[#1e293b] transition-all duration-200">
            <Bookmark className={`h-5 w-5 transition-all duration-300 ${isBookmarked ? 'fill-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
          </button>
          <span className="text-sm font-mono text-slate-600">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="relative px-6 pb-6 pt-2 border-t border-[#1e293b]/60 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">{problem.description}</div>
          {problem.constraints && (
            <div className="bg-[#0a0e1a] p-4 rounded-xl border border-[#1e293b]">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Constraints</p>
              <p className="text-sm text-slate-300 mt-1">{problem.constraints}</p>
            </div>
          )}
          {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">Sample Test Cases</p>
              <div className="space-y-2">
                {problem.sampleTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-[#0a0e1a] p-3 rounded-xl border border-[#1e293b]/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-slate-500">Input:</span><code className="ml-2 text-cyan-300 font-mono">{tc.input}</code></div>
                      <div><span className="text-slate-500">Output:</span><code className="ml-2 text-emerald-300 font-mono">{tc.output}</code></div>
                    </div>
                    {tc.explanation && <p className="text-xs text-slate-400 mt-1">{tc.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link to={`/problems/${problem.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-300 group/link">
            Solve this problem <span className="transition-transform duration-300 group-hover/link:translate-x-1">→</span>
          </Link>
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [filteredProblems, setFilteredProblems] = useState([]);
  const [selectedTag, setSelectedTag] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [problemsRes, streakRes, subsRes, statsRes] = await Promise.all([
          API.get('/problems'),
          API.get('/users/streak'),
          API.get('/submissions/my?limit=1000'),
          API.get('/users/stats'),
        ]);
        setProblems(problemsRes.data.problems || []);
        setFilteredProblems(problemsRes.data.problems || []);
        setStreakData(streakRes.data.data || { currentStreak: 0, maxStreak: 0 });
        setSubmissions(subsRes.data.submissions || []);
        setStats(statsRes.data.stats);
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allTags = ['All', ...new Set(problems.flatMap((p) => p.tags || []))];

  useEffect(() => {
    let result = problems;
    if (selectedTag !== 'All') result = result.filter((p) => p.tags?.includes(selectedTag));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q)));
    }
    setFilteredProblems(result);
  }, [selectedTag, searchTerm, problems]);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] px-4 py-6 text-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a0e1a] to-[#111827] border border-[#1e293b] p-8 shadow-2xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {user?.name || 'Developer'}
                </span>
                <Sparkles className="h-6 w-6 text-amber-400 animate-pulse" />
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-400" /> Ready to conquer challenges?
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-[#0a0e1a] px-4 py-2 rounded-full border border-[#1e293b]">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="font-medium text-white">{stats?.solved?.total || 0}</span>
                <span className="text-slate-500">solved</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0a0e1a] px-4 py-2 rounded-full border border-[#1e293b]">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="font-medium text-white">{stats?.acceptanceRate || 0}%</span>
                <span className="text-slate-500">acceptance</span>
              </div>
              <div className="flex items-center gap-2 bg-[#0a0e1a] px-4 py-2 rounded-full border border-[#1e293b]">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="font-medium text-white">{streakData.currentStreak}</span>
                <span className="text-slate-500">day streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 bg-[#0a0e1a] border border-[#1e293b] rounded-2xl p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2 flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Tags</span>
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedTag === tag
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-[#1e293b] text-slate-400 hover:bg-[#2a3a4a] hover:text-white'
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" placeholder="Search problems by title or tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-[#0a0e1a] border border-[#1e293b] rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-lg transition-all duration-300" />
            </div>
            {/* Problems */}
            <div className="space-y-4">
              {filteredProblems.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-[#0a0e1a] border border-[#1e293b] rounded-2xl">
                  <Search className="h-12 w-12 mx-auto text-slate-700 mb-2" />
                  <p>No problems match your filters.</p>
                </div>
              ) : (
                filteredProblems.map((problem) => (
                  <ProblemItem key={problem._id} problem={problem} isExpanded={expandedId === problem._id} onToggle={toggleExpand} />
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar – Heatmap & Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Heatmap submissions={submissions} />

            <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium">Streak</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1e293b] p-4 rounded-xl text-center border border-[#2a3a4a]">
                  <p className="text-3xl font-bold text-white">{streakData.currentStreak}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current</p>
                </div>
                <div className="bg-[#1e293b] p-4 rounded-xl text-center border border-[#2a3a4a]">
                  <p className="text-3xl font-bold text-white">{streakData.maxStreak}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Max</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0e1a] border border-[#1e293b] rounded-2xl p-5 shadow-xl">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-[#1e293b] pb-2">
                  <span className="text-slate-400">Total Submissions</span>
                  <span className="font-bold text-white">{stats?.totalSubmissions || 0}</span>
                </div>
                <div className="flex justify-between border-b border-[#1e293b] pb-2">
                  <span className="text-slate-400">Accepted</span>
                  <span className="font-bold text-emerald-400">{stats?.acceptedSubmissions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Acceptance Rate</span>
                  <span className="font-bold text-cyan-400">{stats?.acceptanceRate || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}