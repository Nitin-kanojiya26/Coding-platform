import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import RatingBadge from '../components/RatingBadge';
import AllocatedRatingBadge from '../components/AllocatedRatingBadge';
import ContestRatingGraph from '../components/ContestRatingGraph';
import {
  Settings, Save, Loader2, Code, Flame, Calendar,
  TrendingUp, CheckCircle, Bookmark, Camera,
  Trophy, Award, ArrowUpRight
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatar';

// ─── Minimal Initials Avatar ────────────────────────────────────
function InitialsAvatar({ name, className = "w-14 h-14 text-sm" }) {
  const initials = (name || 'U').trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center bg-surface-raised border border-border/60 font-mono text-text font-medium select-none overflow-hidden shrink-0 rounded ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();

  // Profile edit state
  const [name, setName] = useState(user?.name || '');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  // Avatar upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  // Data state
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loginDates, setLoginDates] = useState([]);
  const [ratingHistory, setRatingHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, subsRes, bookmarksRes, loginRes, buildSubsRes, ratingHistRes] = await Promise.all([
          API.get('/users/stats').catch(() => ({ data: {} })),
          API.get('/submissions/my?limit=1000').catch(() => ({ data: {} })),
          API.get('/users/bookmarks').catch(() => ({ data: {} })),
          API.get('/users/login-activity').catch(() => ({ data: {} })),
          API.get('/build/submissions').catch(() => ({ data: {} })),
          API.get('/users/rating-history').catch(() => ({ data: { history: [] } })),
        ]);
        setStats(statsRes.data.stats || statsRes.data?.data?.stats || {});

        const rawDsa = subsRes.data.submissions || subsRes.data?.data?.submissions || [];
        const rawBuild = buildSubsRes.data?.submissions || buildSubsRes.data?.data?.submissions || [];

        const normalizedBuild = rawBuild.map((b) => ({
          _id: b._id,
          isBuild: true,
          problem: b.problemId,
          status: b.status,
          language: 'Node.js',
          submittedAt: b.createdAt,
        }));

        setSubmissions([...rawDsa, ...normalizedBuild]);
        setBookmarks(bookmarksRes.data.bookmarks || bookmarksRes.data || []);
        setLoginDates(loginRes.data?.data || loginRes.data || []);
        setRatingHistory(ratingHistRes.data?.history || []);
      } catch (err) {
        console.error('Profile fetch error', err);
      }
    };
    fetchData();
  }, []);

  const totalSolved = stats?.solved?.total || 0;
  const easySolved = stats?.solved?.easy || 0;
  const mediumSolved = stats?.solved?.medium || 0;
  const hardSolved = stats?.solved?.hard || 0;
  const totalSubmissions = stats?.totalSubmissions || 0;
  const acceptanceRate = stats?.acceptanceRate || 0;

  // Language breakdown
  const languageStats = useMemo(() => {
    const map = {};
    submissions.forEach(s => {
      const st = (s.status || '').toLowerCase();
      if ((st === 'accepted' || st === 'ac') && s.language) {
        map[s.language] = (map[s.language] || 0) + 1;
      }
    });
    return map;
  }, [submissions]);

  // Recent accepted submissions
  const recentAC = useMemo(() => {
    return submissions
      .filter(s => {
        const st = (s.status || '').toLowerCase();
        return st === 'accepted' || st === 'ac';
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 6);
  }, [submissions]);

  // Streak & Active Days
  const { totalActiveDays, maxStreak } = useMemo(() => {
    const dates = new Set(loginDates || []);
    submissions.forEach(s => {
      if (s.submittedAt) {
        dates.add(new Date(s.submittedAt).toISOString().split('T')[0]);
      }
    });
    const sorted = Array.from(dates).sort();
    const total = sorted.length;
    let streak = 0, maxS = 0, prev = null;
    for (const d of sorted) {
      const cur = new Date(d);
      if (prev === null) streak = 1;
      else {
        const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
        streak = diff === 1 ? streak + 1 : 1;
      }
      prev = cur;
      maxS = Math.max(maxS, streak);
    }
    return { totalActiveDays: total, maxStreak: maxS };
  }, [submissions, loginDates]);

  // Avatar file handlers
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
        setMessage('Avatar updated successfully!');
        setAvatarPreview(null);
        setAvatarFile(null);
        setImgError(false);
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

  const avatarSrc = getAvatarSrc(user?.avatar);
  const displayAvatar = avatarPreview || avatarSrc;
  const hasAvatar = Boolean(avatarPreview || (user?.avatar && !imgError));

  return (
    <div className="w-full space-y-6 pt-1">
      {/* Two Column Flat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ─── Left Sidebar (~33% width) ─── */}
        <div className="lg:col-span-4 space-y-5">
          {/* User Bio Card (Flat) */}
          <div className="space-y-3 pb-5 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="relative group shrink-0">
                {hasAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-14 h-14 rounded border border-border/60 object-cover bg-surface-raised"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <InitialsAvatar name={user?.name} className="w-14 h-14 text-sm" />
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  title="Change avatar"
                >
                  <Camera className="h-4 w-4" />
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
                <h1 className="text-sm sm:text-base font-semibold text-text truncate">
                  {user?.name || 'Developer'}
                </h1>
                <p className="text-xs text-text-muted font-mono truncate">
                  @{user?.email?.split('@')[0] || 'user'}
                </p>
                <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wider text-text-muted bg-surface-raised px-1.5 py-0.5 rounded">
                  {user?.role || 'member'}
                </span>
              </div>
            </div>

            {/* Avatar upload status */}
            {avatarPreview && (
              <div className="p-2.5 bg-surface-raised/40 border border-border/40 rounded space-y-2 text-xs">
                <p className="text-[11px] text-accent">New avatar preview ready</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-2.5 py-1 bg-accent text-bg rounded text-xs font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Avatar'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAvatar}
                    className="px-2 py-1 text-xs text-text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Edit Profile Toggle Button */}
            <button
              type="button"
              onClick={() => setShowEdit(!showEdit)}
              className="w-full py-1.5 rounded border border-border/40 bg-surface-raised/30 hover:bg-surface-raised text-xs text-text flex items-center justify-center gap-1.5 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-text-muted" />
              <span>{showEdit ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>

            {/* Inline Name Edit Form */}
            {showEdit && (
              <form onSubmit={handleSubmit} className="pt-2 space-y-2 text-xs">
                {message && <div className="text-success text-[11px] font-mono">{message}</div>}
                {error && <div className="text-danger text-[11px] font-mono">{error}</div>}
                <div>
                  <label className="text-[11px] text-text-muted block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1 text-xs text-text focus:outline-none focus:border-border"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-1 bg-text text-bg rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50"
                >
                  {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  <span>Save Name</span>
                </button>
              </form>
            )}
          </div>

          {/* Allocated Contest Rating Badge Showcase (LeetCode Style) */}
          <div className="space-y-2 pb-5 border-b border-border/40">
            <AllocatedRatingBadge
              rating={user?.contestRating || 1500}
              tierName={user?.ratingBadge}
              contestsAttended={user?.contestsAttended || 0}
              globalRank={user?.globalContestRank}
            />
          </div>

          {/* Core Languages Flat List */}
          <div className="space-y-2.5 pb-5 border-b border-border/40">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5" /> Solved by Language
            </span>
            <div className="space-y-1.5 text-xs">
              {Object.keys(languageStats).length > 0 ? (
                Object.entries(languageStats).map(([lang, count]) => (
                  <div key={lang} className="flex justify-between items-center py-1 border-b border-border/20 last:border-0">
                    <span className="text-text capitalize font-mono text-[11px]">{lang}</span>
                    <span className="text-text-muted font-mono text-[11px]">{count} problems</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-text-muted">No language data recorded yet.</p>
              )}
            </div>
          </div>

          {/* Bookmarks Quick List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5" /> Saved Bookmarks
              </span>
              <Link to="/bookmarks" className="text-[11px] text-text-muted hover:text-text">
                View all ({bookmarks.length})
              </Link>
            </div>
            <div className="space-y-1.5 text-xs">
              {bookmarks.length > 0 ? (
                bookmarks.slice(0, 5).map((b) => (
                  <Link
                    key={b._id}
                    to={`/problems/${b.slug || b._id}`}
                    className="block py-1 text-text hover:text-accent transition-colors truncate text-xs"
                  >
                    • {b.title || 'Problem'}
                  </Link>
                ))
              ) : (
                <p className="text-xs text-text-muted">No saved bookmarks.</p>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right Column: Telemetry & History (~67% width) ─── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Session Progress Breakdown (Flat) */}
          <div className="space-y-3 pb-5 border-b border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text">Solved Problems</span>
              <span className="font-mono text-text-muted text-[11px]">
                {totalSolved} solved
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-1.5 bg-surface-raised/50 rounded-full overflow-hidden flex">
              <div
                className="bg-success h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (easySolved / totalSolved) * 100 : 0}%` }}
              />
              <div
                className="bg-warning h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (mediumSolved / totalSolved) * 100 : 0}%` }}
              />
              <div
                className="bg-danger h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (hardSolved / totalSolved) * 100 : 0}%` }}
              />
            </div>

            {/* Difficulty Metrics Rows */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-text-muted text-[11px]">Easy</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{easySolved}</span>
              </div>

              <div className="space-y-0.5 border-l border-border/30 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-text-muted text-[11px]">Medium</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{mediumSolved}</span>
              </div>

              <div className="space-y-0.5 border-l border-border/30 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-text-muted text-[11px]">Hard</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{hardSolved}</span>
              </div>
            </div>

            {/* Attempts & Rate */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20 text-text-muted">
              <span>Total Attempts: <strong className="font-mono text-text">{totalSubmissions}</strong></span>
              <span>Acceptance Rate: <strong className="font-mono text-accent">{acceptanceRate}%</strong></span>
            </div>
          </div>

          {/* Activity Calendar (Flush, No Card) */}
          <div className="space-y-2 pb-5 border-b border-border/40">
            <ActivityHeatmap
              submissions={submissions}
              loginDates={loginDates}
              mode="auto"
            />
          </div>

          {/* Interactive Contest Rating Graph (LeetCode Style) */}
          <ContestRatingGraph
            ratingHistory={ratingHistory}
            currentRating={user?.contestRating || 1500}
            globalRank={user?.globalContestRank}
            contestsAttended={user?.contestsAttended || 0}
            ratingBadge={user?.ratingBadge}
          />

          {/* Contest History & Rating Progression (LeetCode Style) */}
          <div className="space-y-2.5 pb-5 border-b border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-warning" /> Contest Rating History
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {ratingHistory.length} contests participated
              </span>
            </div>

            {ratingHistory.length > 0 ? (
              <div className="border-t border-border/40 divide-y divide-border/25">
                {ratingHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-1 text-xs hover:bg-surface-raised/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RatingBadge tierName={h.ratingBadge} size="xs" />
                      <Link
                        to={`/contests/${h.contestId}/arena`}
                        className="text-text hover:text-accent font-medium transition-colors truncate max-w-[180px] sm:max-w-xs"
                      >
                        {h.contestTitle}
                      </Link>
                      <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
                        Rank {h.rank} / {h.totalParticipants} ({h.solvedCount} solved)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                      <span className="text-text-muted">
                        {h.oldRating} → <strong className="text-text">{h.newRating}</strong>
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          h.delta > 0
                            ? 'text-success'
                            : h.delta < 0
                            ? 'text-danger'
                            : 'text-text-muted'
                        }`}
                      >
                        {h.delta > 0 ? `+${h.delta}` : h.delta}
                      </span>
                      <span className="text-[10px] text-text-muted hidden md:inline">
                        {h.calculatedAt ? new Date(h.calculatedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center border-t border-border/20 space-y-1">
                <p className="text-xs text-text-muted">No rated contests attended yet.</p>
                <Link to="/contests" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                  Browse upcoming contests <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Recent Accepted Solutions Flat List */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider block flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-warning" /> Recent Accepted Solutions
            </span>

            {recentAC.length > 0 ? (
              <div className="border-t border-border/40 divide-y divide-border/25">
                {recentAC.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-1 text-xs hover:bg-surface-raised/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                      <Link
                        to={s.isBuild ? `/build/${s.problem?.slug || '#'}` : `/problems/${s.problem?.slug || s.problem?._id || '#'}`}
                        className="text-text hover:text-accent transition-colors truncate max-w-[200px] sm:max-w-md font-normal inline-flex items-center gap-1.5"
                      >
                        {s.isBuild && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent-build/15 text-accent-build uppercase shrink-0">
                            API
                          </span>
                        )}
                        <span className="truncate">{s.problem?.title || 'Problem'}</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-text-muted">
                      <span className="capitalize">{s.language || 'code'}</span>
                      <span>{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No accepted solutions yet.</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}