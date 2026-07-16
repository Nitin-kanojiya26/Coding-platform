import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { 
  Settings, Sparkles, Bookmark, Star, LayoutGrid, Check, Eye, MessageSquare, ThumbsUp, Code2, ChevronRight, FileText
} from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  
  // Real dynamic states populated from backend API responses
  const [stats, setStats] = useState({ solved: { easy: 0, medium: 0, hard: 0, total: 0 }, totalSubmissions: 0 });
  const [submissions, setSubmissions] = useState([]);
  const [languageStats, setLanguageStats] = useState({});
  const [recentAC, setRecentAC] = useState([]);
  const [totalActiveDays, setTotalActiveDays] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, subsRes] = await Promise.all([
          API.get('/users/stats').catch(() => ({ data: {} })),
          API.get('/submissions/my?limit=10000').catch(() => ({ data: {} }))
        ]);

        // 1. Process Overall Profile Problem Stats
        const statsData = statsRes.data?.stats || {};
        const easySolved = statsData.solved?.easy || 0;
        const mediumSolved = statsData.solved?.medium || 0;
        const hardSolved = statsData.solved?.hard || 0;
        
        setStats({
          solved: {
            easy: easySolved,
            medium: mediumSolved,
            hard: hardSolved,
            total: statsData.solved?.total || (easySolved + mediumSolved + hardSolved)
          },
          totalSubmissions: statsData.totalSubmissions || 0
        });

        // 2. Process Submissions Data Array
        const subs = subsRes.data?.submissions || [];
        setSubmissions(subs);

        // 3. Compute Real-time Language distribution profiles
        const langMap = {};
        subs.forEach(s => {
          if (s.status === 'accepted' && s.language) {
            langMap[s.language] = (langMap[s.language] || 0) + 1;
          }
        });
        setLanguageStats(langMap);

        // 4. Filter and set the most recent accepted problem records
        const accepted = subs.filter(s => s.status === 'accepted')
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 5);
        setRecentAC(accepted);

        // 5. Calculate precise dynamic active days and maximum user streak milestones
        const dates = new Set();
        subs.forEach(s => {
          if (s.submittedAt) {
            const d = new Date(s.submittedAt).toISOString().split('T')[0];
            dates.add(d);
          }
        });
        
        const uniqueDates = Array.from(dates).sort();
        setTotalActiveDays(uniqueDates.length);

        let currentStreak = 0;
        let runningMaxStreak = 0;
        let prevDateTime = null;

        for (const dateStr of uniqueDates) {
          const current = new Date(dateStr);
          if (prevDateTime === null) {
            currentStreak = 1;
          } else {
            const differenceInDays = (current - prevDateTime) / (1000 * 60 * 60 * 24);
            if (differenceInDays === 1) {
              currentStreak++;
            } else if (differenceInDays > 1) {
              currentStreak = 1;
            }
          }
          prevDateTime = current;
          runningMaxStreak = Math.max(runningMaxStreak, currentStreak);
        }
        setMaxStreak(runningMaxStreak);

      } catch (err) {
        console.error('Error fetching data for profile configuration', err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setMessage('');
    try {
      const res = await API.put('/users/profile', { name, avatar });
      if (res.data.user) {
        refreshUser();
        setMessage('Profile updated successfully.');
        setTimeout(() => setShowEdit(false), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile data.');
    } finally {
      setUpdating(false);
    }
  };

  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=150&background=262626&color=eff6ff`;

  const maxEasy = 954;
  const maxMedium = 2084;
  const maxHard = 953;
  const totalPlatformProblems = maxEasy + maxMedium + maxHard; 
  
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((stats.solved.total || 0) / totalPlatformProblems) * circumference;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 text-[#eff6ff] bg-[#121212] min-h-screen pt-6 font-sans antialiased">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT SIDEBAR PANEL ================= */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-[#1a1a1a] rounded-xl p-4 shadow-sm border border-neutral-800/20">
            <div className="flex gap-4 items-center text-left">
              <img
                src={avatarUrl}
                alt="Profile Avatar"
                className="h-16 w-16 rounded-xl object-cover bg-neutral-800"
              />
              <div>
                <h2 className="text-lg font-semibold text-white tracking-tight">{user?.name || 'LeetCode_User'}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Rank <span className="text-white font-medium">Dynamic</span></p>
              </div>
            </div>

            <div className="flex gap-4 text-xs mt-4 text-neutral-400 border-b border-neutral-800 pb-3">
              <span><strong className="text-white">0</strong> Following</span>
              <span><strong className="text-white">0</strong> Followers</span>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Community Stats</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <Eye className="h-4 w-4 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-300">Views <span className="text-white font-semibold">0</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-neutral-300">Solutions Written <span className="text-white font-semibold">0</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Programming Languages Progress Blocks */}
            <div className="mt-6 pt-4 border-t border-neutral-800 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">Languages</h3>
              <div className="space-y-2 font-mono text-xs">
                {Object.keys(languageStats).length > 0 ? (
                  Object.entries(languageStats).map(([lang, count]) => (
                    <div key={lang} className="flex justify-between items-center">
                      <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] text-neutral-300">{lang}</span>
                      <span className="text-neutral-400 text-[11px]">
                        <strong className="text-white font-medium">{count}</strong> problems solved
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-neutral-500 italic">No languages logged yet</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT DECK ================= */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Core Analytics Blocks: Left Donut Summary & Right Dynamic Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Dynamic Problems Resolution Donut Metrics */}
            <div className="md:col-span-7 bg-[#1a1a1a] rounded-xl p-5 flex items-center justify-between border border-neutral-800/20">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={radius} className="stroke-neutral-800" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="60" cy="60" r={radius} 
                    className="stroke-amber-500 transition-all duration-300" 
                    strokeWidth="6" 
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={Number.isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-white">{stats.solved.total}</p>
                  <p className="text-[10px] text-neutral-400 uppercase font-medium tracking-wide">Solved</p>
                </div>
              </div>

              {/* Stacked Level Difficulty Metrics */}
              <div className="flex-1 pl-6 space-y-1.5 font-mono text-xs text-left">
                <div className="bg-neutral-900/40 p-1.5 px-3 rounded-lg flex justify-between items-center border border-neutral-800/10">
                  <span className="text-emerald-400 font-medium">Easy</span>
                  <span className="text-neutral-200">{stats.solved.easy}<span className="text-neutral-600">/{maxEasy}</span></span>
                </div>
                <div className="bg-neutral-900/40 p-1.5 px-3 rounded-lg flex justify-between items-center border border-neutral-800/10">
                  <span className="text-amber-500 font-medium">Medium</span>
                  <span className="text-neutral-200">{stats.solved.medium}<span className="text-neutral-600">/{maxMedium}</span></span>
                </div>
                <div className="bg-neutral-900/40 p-1.5 px-3 rounded-lg flex justify-between items-center border border-neutral-800/10">
                  <span className="text-rose-500 font-medium">Hard</span>
                  <span className="text-neutral-200">{stats.solved.hard}<span className="text-neutral-600">/{maxHard}</span></span>
                </div>
              </div>
            </div>

            {/* User Earned Badges Inventory */}
            <div className="md:col-span-5 bg-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between text-left border border-neutral-800/20">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium">Badges</p>
                <h3 className="text-2xl font-bold text-white mt-0.5">Dynamic</h3>
              </div>
              <div className="text-xs text-neutral-500 italic my-3">
                Tracking milestones across platform sub-routines...
              </div>
            </div>
          </div>

          {/* ================= HEATMAP WORKSPACE ================= */}
          <div className="bg-[#1a1a1a] rounded-xl p-5 border border-neutral-800/20 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <p className="text-sm font-medium text-white">
                <span className="text-base font-bold text-neutral-200">{submissions.length}</span> submissions recorded
              </p>
              <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
                <span>Total active days: <strong className="text-emerald-400">{totalActiveDays}</strong></span>
                <span>Max streak: <strong className="text-amber-500">{maxStreak}</strong></span>
              </div>
            </div>

            {/* Passing live submission metrics arrays down cleanly to the component */}
            <ActivityHeatmap submissions={submissions} />
          </div>

          {/* Recent Submissions Feed */}
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-neutral-800/20 text-left">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-4">
              <button className="bg-neutral-800 px-4 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" /> Recent Accepted Solutions
              </button>
            </div>

            <div className="space-y-2.5">
              {recentAC.length > 0 ? (
                recentAC.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-neutral-800/20 pb-2 hover:bg-neutral-900/20 px-1 rounded transition">
                    <span className="text-neutral-200 font-medium truncate max-w-[280px]">{s.problem?.title || 'Problem Identity Resolved'}</span>
                    <span className="text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded text-[10px] uppercase font-mono">{s.language}</span>
                    <span className="text-neutral-500 font-mono">{new Date(s.submittedAt).toLocaleDateString()}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-neutral-500 font-mono py-2 italic">
                  No accepted entries logged to repository history.
                </div>
              )}
            </div>
          </div>

          {/* Inline Editor Option Toggle Toggle */}
          <div className="text-right">
            <button 
              onClick={() => setShowEdit(!showEdit)} 
              className="text-xs text-neutral-500 hover:text-neutral-300 transition inline-flex items-center gap-1"
            >
              <Settings className="h-3 w-3" /> Profile Configuration Panel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}