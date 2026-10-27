import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../api/client';
import RatingBadge from '../components/RatingBadge';
import AllocatedRatingBadge from '../components/AllocatedRatingBadge';
import ContestRatingGraph from '../components/ContestRatingGraph';
import {
  Code, Award, TrendingUp, CheckCircle,
  ArrowLeft, Calendar, Flame, Trophy, ArrowUpRight
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatar';

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

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [ratingHistory, setRatingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const [profileRes, statsRes, histRes] = await Promise.all([
          API.get(`/users/${id}/profile`).catch(() => ({ data: {} })),
          API.get(`/users/${id}/stats`).catch(() => ({ data: {} })),
          API.get(`/users/${id}/rating-history`).catch(() => ({ data: { history: [] } })),
        ]);
        setProfileData(profileRes.data.user || profileRes.data);
        setStats(statsRes.data.stats || statsRes.data);
        setRatingHistory(histRes.data?.history || []);
      } catch (err) {
        console.error('Public profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPublicData();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="h-24 w-full bg-surface-raised/30 rounded" />
      </div>
    );
  }

  if (!profileData || !stats) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-xs text-text-muted">User profile could not be found.</p>
        <button
          type="button"
          onClick={() => navigate('/leaderboard')}
          className="text-xs text-accent underline"
        >
          Back to Leaderboard
        </button>
      </div>
    );
  }

  const solved = stats.solved || { total: 0, easy: 0, medium: 0, hard: 0 };
  const totalSolved = solved.total || 0;
  const avatarSrc = getAvatarSrc(profileData.avatar);
  const hasAvatar = Boolean(profileData.avatar && !imgError);

  return (
    <div className="w-full space-y-6 pt-1">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: User Bio & Allocated Badge */}
        <div className="lg:col-span-4 space-y-5">
          <div className="space-y-3 pb-5 border-b border-border/40">
            <div className="flex items-center gap-3">
              {hasAvatar ? (
                <img
                  src={avatarSrc}
                  alt={`${profileData.name}'s avatar`}
                  className="w-14 h-14 rounded border border-border/60 object-cover bg-surface-raised shrink-0"
                  onError={() => setImgError(true)}
                />
              ) : (
                <InitialsAvatar name={profileData.name} />
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-semibold text-text truncate">
                  {profileData.name}
                </h1>
                <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wider text-text-muted bg-surface-raised px-1.5 py-0.5 rounded">
                  {profileData.role || 'member'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full py-1.5 rounded border border-border/40 bg-surface-raised/30 hover:bg-surface-raised text-xs text-text flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-text-muted" />
              <span>Back</span>
            </button>
          </div>

          {/* Allocated Contest Rating Badge Showcase (LeetCode Style) */}
          <div className="space-y-2 pb-5 border-b border-border/40">
            <AllocatedRatingBadge
              rating={profileData.contestRating || 1500}
              tierName={profileData.ratingBadge}
              contestsAttended={profileData.contestsAttended || 0}
              globalRank={profileData.globalContestRank}
            />
          </div>
        </div>

        {/* Right Column: Solved Breakdown, Contest Graph & History */}
        <div className="lg:col-span-8 space-y-6">
          {/* Solved Problems Breakdown */}
          <div className="space-y-3 pb-5 border-b border-border/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text">Solved Problems</span>
              <span className="font-mono text-text-muted text-[11px]">
                {totalSolved} solved
              </span>
            </div>

            <div className="w-full h-1.5 bg-surface-raised/50 rounded-full overflow-hidden flex">
              <div
                className="bg-success h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (solved.easy / totalSolved) * 100 : 0}%` }}
              />
              <div
                className="bg-warning h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (solved.medium / totalSolved) * 100 : 0}%` }}
              />
              <div
                className="bg-danger h-full transition-all duration-300"
                style={{ width: `${totalSolved > 0 ? (solved.hard / totalSolved) * 100 : 0}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-text-muted text-[11px]">Easy</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{solved.easy}</span>
              </div>

              <div className="space-y-0.5 border-l border-border/30 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-text-muted text-[11px]">Medium</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{solved.medium}</span>
              </div>

              <div className="space-y-0.5 border-l border-border/30 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-danger" />
                  <span className="text-text-muted text-[11px]">Hard</span>
                </div>
                <span className="font-mono text-xs text-text font-medium">{solved.hard}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20 text-text-muted">
              <span>Total Attempts: <strong className="font-mono text-text">{stats.totalSubmissions || 0}</strong></span>
              <span>Acceptance Rate: <strong className="font-mono text-accent">{stats.acceptanceRate || 0}%</strong></span>
            </div>
          </div>

          {/* Interactive Contest Rating Graph (LeetCode Style) */}
          <ContestRatingGraph
            ratingHistory={ratingHistory}
            currentRating={profileData.contestRating || 1500}
            globalRank={profileData.globalContestRank}
            contestsAttended={profileData.contestsAttended || 0}
            ratingBadge={profileData.ratingBadge}
          />

          {/* Contest History & Rating Progression */}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}