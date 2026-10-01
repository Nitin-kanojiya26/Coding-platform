import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { useBookmark } from '../hooks/useBookmark';
import {
  Search, ChevronDown, ChevronUp, Flame, Bookmark,
  CheckCircle, Trophy, Sparkles, BookOpen, Target, TrendingUp, ChevronRight, Circle
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';
import ActivityHeatmap from '../components/ActivityHeatmap';

// ─── Premium Fluid Problem Row ───────────────────────────
const ProblemItem = ({ problem, isSolved, isAttempted }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);
  const [showAllTags, setShowAllTags] = useState(false);
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(`/problems/${problem.slug}`)}
      className="border-b border-base last:border-0 hover:bg-hover/40 transition-colors flex flex-col cursor-pointer"
    >
      <div className="group flex items-center justify-between py-2.5 px-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-4 flex justify-center">
            {isSolved ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />
            ) : isAttempted ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
              </div>
            ) : (
              <Circle className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
            )}
          </div>
          
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <h3 className="text-xs font-medium text-secondary group-hover:text-primary transition-colors truncate">
              {problem.title}
            </h3>
            
            {/* Tags preview on one line */}
            <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
              {(problem.tags || []).slice(0, 1).map((tag, idx) => (
                <span key={idx} className="text-[9px] font-bold tracking-wide text-muted bg-input/50 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {(problem.tags?.length > 1) && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllTags(!showAllTags); }}
                  className="text-[9px] text-muted hover:text-secondary flex items-center gap-0.5 px-1 py-0.5 bg-secondary rounded"
                >
                  +{problem.tags.length - 1} {showAllTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 ml-3 flex-shrink-0">
          <div className="w-14">
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(); }} 
            disabled={bookmarkLoading} 
            className="p-1 rounded-md text-muted hover:text-secondary transition-colors"
          >
            <Bookmark className={`h-3.5 w-3.5 transition-all duration-300 ${isBookmarked ? 'fill-accent text-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Expanded Tags */}
      {showAllTags && (
        <div className="px-10 pb-2.5 flex flex-wrap gap-1.5">
          {(problem.tags || []).map((tag, idx) => (
            <span key={idx} className="text-[9px] font-bold tracking-wide text-muted bg-input px-1.5 py-0.5 rounded border border-base">
              {tag}
            </span>
          ))}
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
  const [isTagRegistryExpanded, setIsTagRegistryExpanded] = useState(false);
  
  const [streakData, setStreakData] = useState({ currentStreak: 0, maxStreak: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [loginDates, setLoginDates] = useState([]);
  const [stats, setStats] = useState(null);
  const [sheets, setSheets] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [problemsRes, streakRes, subsRes, statsRes, loginRes, sheetsRes] = await Promise.all([
          API.get('/problems?limit=100'),
          API.get('/users/streak'),
          API.get('/submissions/my?limit=1000'),
          API.get('/users/stats'),
          API.get('/users/login-activity'),
          API.get('/sheets?limit=2'),
        ]);
        
        const rawProblems = problemsRes.data?.problems || problemsRes.data?.data?.problems || [];
        const normalizedProblems = rawProblems.map(p => ({
          ...p,
          tags: (p.tags || []).map(t => t.toLowerCase())
        }));
        setProblems(normalizedProblems);
        setFilteredProblems(normalizedProblems);
        
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
        setSheets(sheetsRes.data || []);
      } catch (err) {
        console.error('Data retrieval synchronization failure', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const allTags = ['All', ...new Set(problems.flatMap((p) => p.tags || []))];

  // Calculate Tag Mastery
  const tagMastery = useMemo(() => {
    if (!problems.length) return [];
    
    const totalByTag = {};
    problems.forEach(p => {
      (p.tags || []).forEach(tag => {
        totalByTag[tag] = (totalByTag[tag] || 0) + 1;
      });
    });

    const solvedProblemIds = new Set();
    submissions.forEach(sub => {
      if (sub.status === 'Accepted' || sub.status === 'AC') {
        solvedProblemIds.add(String(sub.problemId || sub.problem?._id || sub.problem));
      }
    });
    user?.solvedProblems?.forEach(p => {
      solvedProblemIds.add(String(p._id || p));
    });

    const solvedByTag = {};
    problems.forEach(p => {
      if (solvedProblemIds.has(String(p._id))) {
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
  }, [problems, submissions, user]);

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
    <div className="flex items-center justify-center min-h-screen bg-primary">
      <div className="w-5 h-5 border-2 border-base border-t-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-6 pt-4 pb-10 text-muted font-sans antialiased selection:bg-accent/20 selection:text-accent">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header Identity Segment */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-base">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wide text-primary">
                {user?.name || 'Developer Workspace'}
              </h1>
              <Sparkles className="h-4 w-4 text-accent/80 animate-pulse" />
            </div>
          </div>
          
          {/* Active Streak Flag */}
          <div className="flex items-center gap-3 bg-secondary border border-light/80 px-4 py-2 rounded-xl shadow-lg self-start md:self-auto">
            <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500" />
            <div>
              <span className="text-[9px] uppercase font-bold block text-muted tracking-wider">Current Streak</span>
              <span className="text-xs font-bold text-primary tracking-tight">
                {streakData?.currentStreak ?? 0} Days
              </span>
            </div>
          </div>
        </div>

        {/* 4 Statistics Metrics Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-secondary border border-light/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-muted">Solved</span>
              <span className="text-base font-black text-primary">{stats?.solved?.total || 0}</span>
            </div>
          </div>

          <div className="bg-secondary border border-light/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-accent/5 border border-accent/10">
              <Trophy className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-muted">Acceptance Rate</span>
              <span className="text-base font-black text-primary">{stats?.acceptanceRate || 0}%</span>
            </div>
          </div>

          <div className="bg-secondary border border-light/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <Target className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-muted">Total Runs</span>
              <span className="text-base font-black text-primary">{stats?.totalSubmissions || 0}</span>
            </div>
          </div>

          <div className="bg-secondary border border-light/80 rounded-2xl p-4.5 flex items-center gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <TrendingUp className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold block text-muted">Peak Streak</span>
              <span className="text-base font-black text-primary">{streakData?.maxStreak ?? 0} Days</span>
            </div>
          </div>
        </div>

        {/* Main Interface Layout Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Central Problem Matrix */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Curated Sheets Banner */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-primary">Sheets</h2>
              <Link to="/sheets" className="text-xs font-bold text-cyan-400 hover:text-cyan-300">View All Sheets &rarr;</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sheets.map((sheet, index) => {
                const colorTheme = index % 2 === 0 ? 'cyan' : 'emerald';
                return (
                  <div key={sheet._id} className={`bg-gradient-to-r ${colorTheme === 'cyan' ? 'from-cyan-900/40 to-indigo-900/40 border-cyan-500/30' : 'from-emerald-900/40 to-teal-900/40 border-emerald-500/30'} border rounded-2xl p-5 shadow-lg relative overflow-hidden group flex flex-col justify-between`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      {sheet.imageUrl ? (
                        <img src={sheet.imageUrl} alt={sheet.name} className="w-32 h-32 object-cover rounded opacity-30 mix-blend-overlay -translate-y-4 translate-x-4" />
                      ) : (
                        <BookOpen className={`w-32 h-32 ${colorTheme === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'} -translate-y-4 translate-x-4`} />
                      )}
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`bg-${colorTheme}-500/20 text-${colorTheme}-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded`}>Sheet</span>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-1">{sheet.name}</h2>
                      <p className={`text-sm ${colorTheme === 'cyan' ? 'text-cyan-100/70' : 'text-emerald-100/70'} mb-4 max-w-md line-clamp-2`}>{sheet.description}</p>
                    </div>
                    <div className="relative z-10 mt-2">
                      <Link to={`/sheets/${sheet.slug}`} className={`inline-flex items-center gap-2 bg-${colorTheme}-500 hover:bg-${colorTheme}-400 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-${colorTheme}-500/20`}>
                        Continue Solving <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
              {sheets.length === 0 && (
                <div className="col-span-2 text-center py-6 text-sm text-muted bg-secondary border border-base rounded-2xl">
                  No sheets created yet. Admins can create them in the Dashboard!
                </div>
              )}
            </div>

            <div className="bg-secondary border border-light/80 rounded-2xl p-5 space-y-5 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xs font-bold text-secondary flex items-center gap-2 tracking-wide">
                <BookOpen className="h-4 w-4 text-accent" /> PROBLEMS
              </h2>
              
              <div className="relative w-full sm:w-60 group rounded-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted group-focus-within:text-accent transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search Problems..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-input border border-base rounded-xl text-secondary placeholder-muted text-xs outline-none transition-all focus:border-light" 
                />
              </div>
            </div>

            {/* Tag Registry Navigation Filters */}
            <div className="flex items-center gap-1.5 w-full">
              <div className={`flex flex-wrap gap-1.5 flex-1 ${!isTagRegistryExpanded ? 'overflow-hidden h-8' : ''}`}>
                {allTags.map((tag) => (
                  <button 
                    key={tag} 
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all border shrink-0 h-6 ${
                      selectedTag === tag
                        ? 'bg-hover text-primary border-light shadow-sm'
                        : 'bg-transparent text-muted border-transparent hover:text-secondary'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {allTags.length > 5 && (
                <button
                  onClick={() => setIsTagRegistryExpanded(!isTagRegistryExpanded)}
                  className="px-2 py-1 h-6 rounded-md text-[10px] font-bold text-muted bg-secondary hover:text-secondary flex items-center gap-1 shrink-0 transition-colors"
                >
                  {isTagRegistryExpanded ? (
                    <><ChevronUp className="w-3 h-3" /> Less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> More</>
                  )}
                </button>
              )}
            </div>

            {/* Structured Rows */}
            <div className="divide-y divide-base/60 border-t border-base/60 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-base">
              {filteredProblems.length === 0 ? (
                <div className="py-12 text-center text-muted text-xs font-bold tracking-wider">
                  NO ENTRIES DETECTED
                </div>
              ) : (
                filteredProblems.map((problem) => {
                  const currentId = String(problem._id);
                  const isSolved = submissions.some(sub => (sub.status === 'Accepted' || sub.status === 'AC') && String(sub.problemId || sub.problem?._id || sub.problem) === currentId) || user?.solvedProblems?.some(p => String(p._id || p) === currentId);
                  const isAttempted = !isSolved && submissions.some(sub => String(sub.problemId || sub.problem?._id || sub.problem) === currentId);
                  
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

          {/* Right Metrics Columns */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Heatmap Section Wrapper */}
            <div className="bg-secondary border border-light/80 rounded-2xl p-2 shadow-md">
              <ActivityHeatmap loginDates={loginDates} mode="login" />
            </div>

            {/* System Performance Status Readout */}
            <div className="bg-secondary border border-light/80 rounded-2xl p-5 space-y-4 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Run
              </h3>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between border-b border-base pb-2">
                  <span className="text-muted">Total Attempts</span>
                  <span className="text-secondary font-bold">{stats?.totalSubmissions || 0}</span>
                </div>
                <div className="flex justify-between border-b border-base pb-2">
                  <span className="text-muted">Successful Attempts</span>
                  <span className="text-emerald-400 font-bold">{stats?.acceptedSubmissions || stats?.solved?.total || 0}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-muted">Success Rate</span>
                  <span className="text-accent font-bold">{stats?.acceptanceRate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Skill Mastery (Top Tags) */}
            <div className="bg-secondary border border-light/80 rounded-2xl p-5 space-y-4 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                <span>Skill Mastery</span>
                <Flame className="w-3.5 h-3.5 text-orange-500" />
              </h3>
              {tagMastery.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {tagMastery.map(({ tag, solved, total, percentage }) => (
                    <div key={tag} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-secondary truncate pr-2 max-w-[120px]" title={tag}>{tag}</span>
                        <span className="text-muted shrink-0">{solved} / {total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-input rounded-full overflow-hidden border border-base/40">
                        <div 
                          className="h-full bg-gradient-to-r from-accent to-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted text-center py-4">Solve problems to see your mastery!</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}