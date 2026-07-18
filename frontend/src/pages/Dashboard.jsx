import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { useBookmark } from '../hooks/useBookmark';
import {
  Search, ChevronDown, ChevronUp, Flame, Bookmark,
  CheckCircle, Trophy, Sparkles, BookOpen, Target, TrendingUp
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';
import ActivityHeatmap from '../components/ActivityHeatmap';

// ─── Premium Fluid Problem Row ───────────────────────────
const ProblemItem = ({ problem, isExpanded, onToggle }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <div className={`group relative border-b border-zinc-900 last:border-0 transition-all duration-200 ${
      isExpanded ? 'bg-[#0f0f12]/40' : ''
    }`}>
      {/* Background activation hover */}
      <div 
        className={`absolute inset-y-1 -inset-x-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
          isExpanded ? 'opacity-100 bg-[#121214]/50' : 'hover:bg-[#0c0c0e]'
        }`} 
      />
      
      <div 
        className="relative flex items-center justify-between py-4 px-3 cursor-pointer select-none" 
        onClick={() => onToggle(problem._id)}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Accent Indicator Bar */}
          <div className={`w-[3px] h-5 rounded-full self-center transition-all duration-350 ${
            isExpanded ? 'bg-space-blue h-7 shadow-[0_0_12px_rgba(56,189,248,0.4)]' : 'bg-transparent group-hover:bg-zinc-800'
          }`} />

          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pr-4">
            <h3 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors duration-150 truncate">
              {problem.title}
            </h3>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <DifficultyBadge difficulty={problem.difficulty} />
              
              {/* High-Visibility Tag Architecture */}
              <div className="flex items-center gap-1.5">
                {(problem.tags || []).slice(0, 2).map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="text-[10px] font-bold tracking-wide text-zinc-300 bg-zinc-900 border border-zinc-700/80 px-2.5 py-0.5 rounded-md shadow-sm transition-colors group-hover:border-zinc-600"
                  >
                    {tag}
                  </span>
                ))}
                {(problem.tags || []).length > 2 && (
                  <span className="text-[10px] text-zinc-500 font-bold bg-zinc-900/40 border border-zinc-800 px-1.5 py-0.5 rounded-md">
                    +{problem.tags.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-3 ml-4 flex-shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleBookmark(); }} 
            disabled={bookmarkLoading} 
            className="p-1.5 rounded-lg text-zinc-500 hover:text-slate-300 transition-colors"
          >
            <Bookmark className={`h-4 w-4 transition-all duration-350 ${
              isBookmarked ? 'fill-space-blue text-space-blue drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' : ''
            }`} />
          </button>
          <div className="text-zinc-500 group-hover:text-zinc-300">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="relative pl-8 pr-4 pb-5 pt-1 space-y-4 animate-in fade-in duration-200">
          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-w-3xl">
            {problem.description}
          </div>
          
          {problem.constraints && (
            <div className="text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider block text-zinc-500 text-[9px]">Constraints</span>
              <p className="font-mono text-xs text-slate-300 bg-[#000000] p-2.5 rounded-lg border border-zinc-800 inline-block">
                {problem.constraints}
              </p>
            </div>
          )}

          {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider block text-zinc-500 text-[9px]">Sample Cases</span>
              <div className="space-y-2">
                {problem.sampleTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-[#000000] max-w-2xl rounded-lg border border-zinc-800 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-zinc-800 border-b border-zinc-800 font-mono text-xs">
                      <div className="p-2.5">
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-1">Input</span>
                        <code className="text-slate-200">{tc.input}</code>
                      </div>
                      <div className="p-2.5">
                        <span className="text-zinc-500 block text-[9px] uppercase tracking-wider mb-1">Output</span>
                        <code className="text-emerald-400 font-semibold">{tc.output}</code>
                      </div>
                    </div>
                    {tc.explanation && (
                      <p className="text-xs text-zinc-400 p-2.5 bg-zinc-900/20">
                        {tc.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-1">
            <Link 
              to={`/problems/${problem.slug}`} 
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-space-blue hover:text-sky-400 transition-colors group/btn"
            >
              Open Workspace <span className="transition-transform duration-150 group-hover/btn:translate-x-0.5">→</span>
            </Link>
          </div>
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
  
  // Strict structure tracking to sync with backend 'status' blocks
  const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loginDates, setLoginDates] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [problemsRes, streakRes, subsRes, statsRes, loginRes] = await Promise.all([
          API.get('/problems'),
          API.get('/users/streak'),
          API.get('/submissions/my?limit=1000'),
          API.get('/users/stats'),
          API.get('/users/login-activity'),
        ]);
        
        setProblems(problemsRes.data?.problems || problemsRes.data?.data?.problems || []);
        setFilteredProblems(problemsRes.data?.problems || problemsRes.data?.data?.problems || []);
        
        // Exact target matching for response signature: { status: 'success', data: { currentStreak, maxStreak } }
        if (streakRes.data && streakRes.data.data) {
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
      } catch (err) {
        console.error('Data retrieval synchronization failure', err);
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
      result = result.filter((p) => 
        p.title?.toLowerCase().includes(q) || 
        p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    setFilteredProblems(result);
  }, [selectedTag, searchTerm, problems]);

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#000000]">
      <div className="w-5 h-5 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-6 py-10 text-zinc-400 font-sans antialiased selection:bg-space-blue/20 selection:text-space-blue">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Identity Segment */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wide text-slate-100">
                {user?.name || 'Developer Workspace'}
              </h1>
              <Sparkles className="h-4 w-4 text-sky-400/80 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-500">
              Run diagnostics, configure sessions, and track problem status.
            </p>
          </div>
          
          {/* Active Streak Flag */}
          <div className="flex items-center gap-3 bg-[#0a0a0c] border border-zinc-800/80 px-4 py-2 rounded-xl shadow-lg self-start md:self-auto">
            <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
            <div>
              <span className="text-[9px] uppercase font-bold block text-zinc-500 tracking-wider">Current Streak</span>
              <span className="text-xs font-bold text-slate-100 tracking-tight">
                {streakData?.currentStreak ?? 0} Days
              </span>
            </div>
          </div>
        </div>

        {/* 4 Statistics Metrics Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-zinc-500">Solved</span>
              <span className="text-base font-black text-slate-100">{stats?.solved?.total || 0}</span>
            </div>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-space-blue/5 border border-space-blue/10">
              <Trophy className="h-4.5 w-4.5 text-space-blue" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-zinc-500">Acceptance Rate</span>
              <span className="text-base font-black text-slate-100">{stats?.acceptanceRate || 0}%</span>
            </div>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <Target className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-zinc-500">Total Runs</span>
              <span className="text-base font-black text-slate-100">{stats?.totalSubmissions || 0}</span>
            </div>
          </div>

          <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <TrendingUp className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-zinc-500">Peak Streak</span>
              <span className="text-base font-black text-slate-100">{streakData?.maxStreak ?? 0} Days</span>
            </div>
          </div>
        </div>

        {/* Main Interface Layout Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Central Problem Matrix */}
          <div className="lg:col-span-8 bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-5 space-y-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xs font-bold text-slate-200 flex items-center gap-2 tracking-wide">
                <BookOpen className="h-4 w-4 text-space-blue" /> SYSTEM LOGS / PROBLEMS
              </h2>
              
              <div className="relative w-full sm:w-60 group rounded-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-space-blue transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter registry..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#000000] border border-zinc-900 rounded-xl text-slate-200 placeholder-zinc-700 text-xs outline-none transition-all focus:border-zinc-700" 
                />
              </div>
            </div>

            {/* Tag Registry Navigation Filters */}
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button 
                  key={tag} 
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all border ${
                    selectedTag === tag
                      ? 'bg-zinc-900 text-white border-zinc-700 shadow-sm'
                      : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Structured Rows */}
            <div className="divide-y divide-zinc-900/60 border-t border-zinc-900/60">
              {filteredProblems.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 text-xs font-bold tracking-wider">
                  NO REGISTRY ENTRIES DETECTED
                </div>
              ) : (
                filteredProblems.map((problem) => (
                  <ProblemItem 
                    key={problem._id} 
                    problem={problem} 
                    isExpanded={expandedId === problem._id} 
                    onToggle={toggleExpand} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Metrics Columns */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Heatmap Section Wrapper */}
            <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-2 shadow-md">
              <ActivityHeatmap loginDates={loginDates} mode="login" />
            </div>

            {/* System Performance Status Readout */}
            <div className="bg-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Run Diagnostic Output
              </h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Submissions Run</span>
                  <span className="text-slate-200 font-bold">{stats?.totalSubmissions || 0}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Solutions Solved</span>
                  <span className="text-emerald-400 font-bold">{stats?.acceptedSubmissions || stats?.solved?.total || 0}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-zinc-500">Accuracy Rate</span>
                  <span className="text-space-blue font-bold">{stats?.acceptanceRate || 0}%</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}