import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Settings, Save, Loader2, Code, Flame, Calendar, 
  Award, TrendingUp, CheckCircle2, Bookmark, Camera
} from 'lucide-react';

// ─── Custom colors for difficulty ──────────────────────────────
const EASY_COLOR = '#6ee774';   // Dark green
const MEDIUM_COLOR = '#ffb800';
const HARD_COLOR = '#ff2d55';

export default function Profile() {
  const { user, refreshUser } = useAuth();

  // Profile edit state
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Data state
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, subsRes, bookmarksRes] = await Promise.all([
          API.get('/users/stats').catch(() => ({ data: {} })),
          API.get('/submissions/my?limit=10000').catch(() => ({ data: {} })),
          API.get('/users/bookmarks').catch(() => ({ data: {} }))
        ]);
        setStats(statsRes.data.stats || {});
        setSubmissions(subsRes.data.submissions || []);
        setBookmarks(bookmarksRes.data.bookmarks || []);
      } catch (err) {
        console.error('Profile fetch error', err);
      }
    };
    fetchData();
  }, []);

  // Derived stats
  const totalSolved = stats?.solved?.total || 0;
  const easySolved = stats?.solved?.easy || 0;
  const mediumSolved = stats?.solved?.medium || 0;
  const hardSolved = stats?.solved?.hard || 0;
  const totalSubmissions = stats?.totalSubmissions || 0;
  const acceptanceRate = stats?.acceptanceRate || 0;

  // Pie chart data – uses dark green for Easy
  const difficultyData = [
    { name: 'Easy', value: easySolved, color: EASY_COLOR },
    { name: 'Medium', value: mediumSolved, color: MEDIUM_COLOR },
    { name: 'Hard', value: hardSolved, color: HARD_COLOR },
  ];

  // Language breakdown
  const languageStats = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      if (s.status === 'accepted' && s.language) {
        map[s.language] = (map[s.language] || 0) + 1;
      }
    });
    return map;
  }, [submissions]);

  // Recent accepted submissions
  const recentAC = useMemo(() => {
    return submissions
      .filter(s => s.status === 'accepted')
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 5);
  }, [submissions]);

  // Activity days and streak
  const { totalActiveDays, maxStreak } = useMemo(() => {
    const dates = new Set();
    submissions.forEach(s => {
      const d = new Date(s.submittedAt).toISOString().split('T')[0];
      dates.add(d);
    });
    const sorted = Array.from(dates).sort();
    const total = sorted.length;
    let streak = 0, maxS = 0, prev = null;
    for (const d of sorted) {
      const cur = new Date(d);
      if (prev === null) streak = 1;
      else {
        const diff = (cur - prev) / (1000 * 60 * 60 * 24);
        streak = diff === 1 ? streak + 1 : 1;
      }
      prev = cur;
      maxS = Math.max(maxS, streak);
    }
    return { totalActiveDays: total, maxStreak: maxS };
  }, [submissions]);

  // ── Avatar file handlers ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleUpload = async () => {
    if (!avatarFile) return;
    setUploading(true);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const res = await API.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.user) {
        refreshUser();
        setAvatar(res.data.user.avatar);
        setMessage('Avatar updated successfully!');
        setAvatarPreview(null);
        setAvatarFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const cancelAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Update profile (name only) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setMessage('');
    try {
      const res = await API.put('/users/profile', { name });
      if (res.data.user) {
        refreshUser();
        setMessage('Profile updated.');
        setTimeout(() => setShowEdit(false), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=120&background=1a1a1a&color=ffffff`;

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-8 py-10 text-secondary font-sans antialiased">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ─── Left Sidebar Panel ────────────────────────────── */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Main User Card */}
          <div className="bg-card rounded-xl p-5 border border-base shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={avatarPreview || avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-lg border border-light object-cover bg-secondary"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&size=120&background=1a1a1a&color=ffffff`;
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="h-5 w-5 text-white" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-primary truncate">{user?.name || 'User'}</h2>
                <p className="text-xs text-muted font-mono truncate">@{user?.email?.split('@')[0] || 'developer'}</p>
              </div>
            </div>

            {/* Avatar upload controls */}
            {avatarPreview && (
              <div className="mt-3 p-3 bg-secondary border border-base rounded-lg">
                <p className="text-xs text-cyan-400 font-mono mb-2">New avatar selected</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 rounded text-xs font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Upload'}
                  </button>
                  <button
                    onClick={cancelAvatar}
                    className="px-4 py-1.5 bg-hover hover:bg-hover/80 rounded text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowEdit(!showEdit)}
              className="mt-4 w-full py-1.5 rounded-lg border border-base bg-secondary hover:bg-hover text-xs text-muted hover:text-secondary flex items-center justify-center gap-2 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              {showEdit ? 'Cancel Changes' : 'Edit Profile'}
            </button>

            {showEdit && (
              <div className="mt-4 p-4 bg-secondary rounded-lg border border-base text-left">
                {message && <div className="text-emerald-400 text-xs mb-2 font-mono">{message}</div>}
                {error && <div className="text-rose-400 text-xs mb-2 font-mono">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-base bg-primary px-3 py-1.5 text-xs text-primary placeholder-muted outline-none focus:border-light"
                    placeholder="Display name"
                    required
                  />
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full py-1.5 bg-zinc-200 hover:bg-white disabled:opacity-50 text-black rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Name
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Languages Panel */}
          <div className="bg-card rounded-xl p-5 border border-base shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted flex items-center gap-2 pb-3 border-b border-base/60">
              <Code className="h-3.5 w-3.5" /> Core Languages
            </h3>
            <div className="mt-3 space-y-2 text-xs font-mono">
              {Object.keys(languageStats).length > 0 ? (
                Object.entries(languageStats).map(([lang, count]) => (
                  <div key={lang} className="flex justify-between items-center bg-secondary/50 border border-base px-3 py-1.5 rounded-lg">
                    <span className="text-secondary font-medium">{lang}</span>
                    <span className="text-muted bg-secondary px-2 py-0.5 rounded text-[10px]">{count} solved</span>
                  </div>
                ))
              ) : (
                <p className="text-muted italic py-1">No execution history recorded.</p>
              )}
            </div>
          </div>

          {/* Bookmarked Container Panel */}
          <div className="bg-card rounded-xl p-5 border border-base shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted flex items-center gap-2 pb-3 border-b border-base/60">
              <Bookmark className="h-3.5 w-3.5" /> Bookmarked Problems
            </h3>
            <div className="mt-3 space-y-2 text-xs font-mono">
              {bookmarks.length > 0 ? (
                bookmarks.slice(0, 5).map((b) => (
                  <div key={b._id} className="text-secondary bg-secondary border border-base hover:border-light transition-colors rounded-lg px-3 py-2 truncate cursor-pointer">
                    {b.title || 'Untitled Asset'}
                  </div>
                ))
              ) : (
                <p className="text-muted italic py-1">No bookmarked problems saved.</p>
              )}
            </div>
          </div>

        </div>

        {/* ─── Right LeetCode Layout Metrics Panels ───────────── */}
        <div className="lg:col-span-8 space-y-5">

          {/* LeetCode Asymmetric Progress Box */}
          <div className="bg-card rounded-xl p-6 border border-base shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-6 flex items-center gap-2">
              <Award className="h-3.5 w-3.5" /> Session Progress Metrics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Central Ring Wrapper */}
              <div className="md:col-span-4 flex justify-center relative">
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={difficultyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={66}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="transparent"
                      >
                        {difficultyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value > 0 ? entry.color : '#2a2a2a'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Central Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary tracking-tight">{totalSolved}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted mt-0.5">Solved</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Breakdown Panel */}
              <div className="md:col-span-8 space-y-3.5">
                
                {/* Easy */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#6ee774] font-medium">Easy</span>
                    <span className="text-primary font-medium">{easySolved}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary border border-base rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#6ee774] rounded-full transition-all duration-500" 
                      style={{ width: `${totalSolved > 0 ? (easySolved / totalSolved) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#ffb800] font-medium">Medium</span>
                    <span className="text-primary font-medium">{mediumSolved}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary border border-base rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#ffb800] rounded-full transition-all duration-500" 
                      style={{ width: `${totalSolved > 0 ? (mediumSolved / totalSolved) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Hard */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#ff2d55] font-medium">Hard</span>
                    <span className="text-primary font-medium">{hardSolved}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary border border-base rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#ff2d55] rounded-full transition-all duration-500" 
                      style={{ width: `${totalSolved > 0 ? (hardSolved / totalSolved) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* System Runs Footer */}
                <div className="pt-3 border-t border-base/60 flex items-center justify-between text-xs font-mono text-muted">
                  <span>Total Submissions: <strong className="text-secondary">{totalSubmissions}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-500" /> 
                    Acceptance: <strong className="text-cyan-400">{acceptanceRate}%</strong>
                  </span>
                </div>

              </div>
            </div>
          </div>

          {/* Heatmap Grid Wrapper Container */}
          <div className="bg-card rounded-xl p-5 border border-base shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 pb-2 border-b border-base/40">
              <span className="text-muted font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted" /> Submission Activity
              </span>
              <div className="flex gap-4 font-mono text-muted text-[11px]">
                <span>Active Windows: <strong className="text-primary">{totalActiveDays} days</strong></span>
                <span>Max Chain: <strong className="text-amber-500">{maxStreak} days</strong></span>
              </div>
            </div>
            
            {/* Scroll bounds containing grid shifts */}
            <div className="w-full overflow-x-auto scrollbar-none py-1">
              <div className="min-w-[760px]">
                <ActivityHeatmap submissions={submissions} mode="submission" />
              </div>
            </div>
          </div>

          {/* Validation Log List */}
          <div className="bg-card rounded-xl p-5 border border-base shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-muted mb-3 pb-2 border-b border-base/40">
              <Flame className="h-3.5 w-3.5 text-amber-500" /> Recent Accepted Solutions
            </div>
            <div className="space-y-2">
              {recentAC.length > 0 ? (
                recentAC.map((s, idx) => {
                  // Map difficulty to the same colors
                  let difficultyColor = EASY_COLOR;
                  if (s.problem?.difficulty?.toLowerCase() === 'medium') difficultyColor = MEDIUM_COLOR;
                  if (s.problem?.difficulty?.toLowerCase() === 'hard') difficultyColor = HARD_COLOR;

                  return (
                    <div key={idx} className="flex justify-between items-center bg-secondary/60 border border-base/70 px-4 py-2.5 rounded-lg text-xs transition-colors hover:border-light">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1b5e20] shrink-0" />
                        <span className="text-secondary font-medium truncate max-w-[180px] sm:max-w-md">
                          {s.problem?.title || 'Unknown Asset'}
                        </span>
                        <span className={`text-[11px] font-mono font-medium tracking-wide`} style={{ color: difficultyColor }}>
                          {s.problem?.difficulty || 'Easy'}
                        </span>
                      </div>
                      <span className="text-muted font-mono text-[11px] shrink-0">{new Date(s.submittedAt).toLocaleDateString()}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted font-mono text-xs italic py-2">No active completions logged in this cycle.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}