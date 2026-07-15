import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import { useBookmark } from '../hooks/useBookmark';
import { Search, ChevronDown, ChevronUp, Calendar, Flame, Bookmark, Code2, Trophy, CheckCircle, Clock } from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import DifficultyBadge from '../components/DifficultyBadge';

// 🔥 LOCAL COMPONENT – no new file needed
const ProblemItem = ({ problem, isExpanded, onToggle }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-700 card-hover">
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-800/30 transition-colors duration-200"
        onClick={() => onToggle(problem._id)}
      >
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="flex-shrink-0">
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <h3 className="text-lg font-semibold text-white truncate">{problem.title}</h3>
          <div className="hidden sm:flex flex-wrap gap-1.5 ml-2">
            {problem.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full">
                {tag}
              </span>
            ))}
            {problem.tags.length > 3 && (
              <span className="text-xs text-slate-500">+{problem.tags.length - 3}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark();
            }}
            disabled={bookmarkLoading}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200"
          >
            <Bookmark
              className={`h-5 w-5 transition-all duration-200 ${
                isBookmarked ? 'fill-cyan-400 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            />
          </button>
          <span className="text-sm font-mono">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-800/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap">
            {problem.description}
          </div>
          {problem.constraints && (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Constraints</p>
              <p className="text-sm text-slate-300 mt-1">{problem.constraints}</p>
            </div>
          )}
          {problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Sample Test Cases</p>
              <div className="space-y-2">
                {problem.sampleTestCases.map((tc, idx) => (
                  <div key={idx} className="bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Input:</span>
                        <code className="ml-2 text-cyan-300 font-mono">{tc.input}</code>
                      </div>
                      <div>
                        <span className="text-slate-500">Output:</span>
                        <code className="ml-2 text-emerald-300 font-mono">{tc.output}</code>
                      </div>
                    </div>
                    {tc.explanation && <p className="text-xs text-slate-400 mt-1">{tc.explanation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link
            to={`/problems/${problem.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors duration-200 group"
          >
            Solve this problem →
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
        </div>
      )}
    </div>
  );
};

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
        const allProblems = problemsRes.data.problems || [];
        setProblems(allProblems);
        setFilteredProblems(allProblems);
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
    if (selectedTag !== 'All') {
      result = result.filter((p) => p.tags?.includes(selectedTag));
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    setFilteredProblems(result);
  }, [selectedTag, searchTerm, problems]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Content – 3/4 width */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-cyan-400">{user?.name}</span>! 👋
          </h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              {stats?.solved?.total || 0} solved
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-amber-400" />
              {stats?.acceptanceRate || 0}% acceptance
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-400" />
              {streakData.currentStreak} day streak
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mr-2">Categories</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedTag === tag
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search problems by title or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-lg transition-all duration-200"
          />
        </div>

        <div className="space-y-3">
          {filteredProblems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No problems match your filters.</div>
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

      {/* Right Sidebar – Calendar & Streak */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-medium">Your Activity</span>
          </div>
          <ActivityHeatmap submissions={submissions} />
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium">Streak</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 p-3 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">{streakData.currentStreak}</p>
              <p className="text-xs text-slate-500">Current</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl text-center">
              <p className="text-2xl font-bold text-white">{streakData.maxStreak}</p>
              <p className="text-xs text-slate-500">Max</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}