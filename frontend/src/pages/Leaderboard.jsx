import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import RatingBadge from '../components/RatingBadge';
import {
  Trophy, Crown, Medal, ArrowUpRight, CheckCircle,
  Award, Zap, Users, Star, Flame, Loader2
} from 'lucide-react';
import { getAvatarSrc } from '../utils/avatar';

// ─── Compact Initials Avatar ────────────────────────────────────
function InitialsAvatar({ name, className = "h-6 w-6 text-[10px]" }) {
  const initials = (name || 'U').trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center bg-surface-raised border border-border/60 font-mono text-text font-medium select-none overflow-hidden shrink-0 rounded ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
}

// ─── User Avatar with Error Fallback ────────────────────────────
function LeaderboardAvatar({ avatar, name, className = "h-6 w-6 rounded" }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = getAvatarSrc(avatar);
  const hasAvatar = Boolean(avatar && !imgError);

  if (!hasAvatar) {
    return <InitialsAvatar name={name} className={className} />;
  }

  return (
    <img
      src={avatarSrc}
      alt={name || 'User'}
      className={`${className} border border-border/60 object-cover bg-surface-raised shrink-0`}
      onError={() => setImgError(true)}
    />
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('contest'); // 'contest' | 'problems'
  const [contestRankings, setContestRankings] = useState([]);
  const [problemRankings, setProblemRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch rankings
  useEffect(() => {
    let isMounted = true;
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const [contestRes, problemsRes] = await Promise.all([
          API.get('/leaderboard/contest').catch(() => ({ data: { leaderboard: [] } })),
          API.get('/leaderboard').catch(() => ({ data: { leaderboard: [] } })),
        ]);

        if (isMounted) {
          setContestRankings(contestRes.data?.leaderboard || []);
          setProblemRankings(problemsRes.data?.leaderboard || problemsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load leaderboard telemetry:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboards();
    return () => { isMounted = false; };
  }, []);

  // Compute telemetry summary
  const topContestant = contestRankings[0];
  const topSolver = problemRankings[0];

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded text-warning" title="1st Place">
          <Crown className="w-4 h-4 fill-warning/20 text-warning" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded text-zinc-400" title="2nd Place">
          <Medal className="w-4 h-4 fill-zinc-400/20 text-zinc-400" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded text-amber-600" title="3rd Place">
          <Medal className="w-4 h-4 fill-amber-600/20 text-amber-600" />
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-text-muted w-6 text-center">
        {rank}
      </span>
    );
  };

  return (
    <div className="w-full space-y-5 pt-1">
      {/* ─── Header & Telemetry Bar ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Global Rankings
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Verified competitive ratings and algorithmic problem rankings across the platform.
          </p>
        </div>

        {/* Compact stats summary */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {activeTab === 'contest' ? (
            <>
              <span>Ranked Competitors: <strong className="font-mono text-text">{contestRankings.length}</strong></span>
              {topContestant && (
                <>
                  <span className="text-border/60">•</span>
                  <span>Top: <strong className="font-mono text-accent">{topContestant.name || topContestant.username}</strong> ({topContestant.contestRating})</span>
                </>
              )}
            </>
          ) : (
            <>
              <span>Active Solvers: <strong className="font-mono text-text">{problemRankings.length}</strong></span>
              {topSolver && (
                <>
                  <span className="text-border/60">•</span>
                  <span>Top: <strong className="font-mono text-accent">{topSolver.username || topSolver.name}</strong></span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Tabs Switcher (Flat LeetCode Style) ────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/30">
        <div className="flex items-center gap-1 -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab('contest')}
            className={`flex items-center gap-2 py-2 px-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'contest'
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-warning" />
            <span>Contest Ratings</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-raised font-mono text-text-muted">
              {contestRankings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('problems')}
            className={`flex items-center gap-2 py-2 px-3 text-xs font-medium transition-colors border-b-2 ${
              activeTab === 'problems'
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span>Problems Solved</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-raised font-mono text-text-muted">
              {problemRankings.length}
            </span>
          </button>
        </div>

        {/* Rating Tiers Legend Preview */}
        {activeTab === 'contest' && (
          <div className="hidden md:flex items-center gap-2 text-[10px] text-text-muted font-mono select-none">
            <span className="text-text-muted">Tiers:</span>
            <span className="text-red-400 font-medium">Guardian ≥2150</span>
            <span>•</span>
            <span className="text-amber-400 font-medium">Knight ≥1850</span>
            <span>•</span>
            <span className="text-purple-400 font-medium">Expert ≥1650</span>
            <span>•</span>
            <span className="text-blue-400 font-medium">Specialist ≥1500</span>
          </div>
        )}
      </div>

      {/* ─── Loading Skeleton ──────────────────────────────────── */}
      {loading ? (
        <div className="w-full space-y-3 pt-2 animate-pulse">
          <div className="h-9 w-full bg-surface-raised/40 rounded" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-10 bg-surface-raised/25 rounded" />
          ))}
        </div>
      ) : activeTab === 'contest' ? (
        /* ─── TAB 1: CONTEST RATINGS TABLE (LeetCode Style) ──── */
        contestRankings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Award className="h-6 w-6 mx-auto text-text-muted" />
            <p className="text-xs text-text-muted">No rated contest participants recorded yet.</p>
            <Link
              to="/contests"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Join a contest to get your official rating <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="border-t border-border/40 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                  <th className="py-2.5 px-3 font-medium w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3 font-medium">User</th>
                  <th className="py-2.5 px-3 font-medium text-center">Tier</th>
                  <th className="py-2.5 px-3 font-medium text-right">Contest Rating</th>
                  <th className="py-2.5 px-3 font-medium text-right">Contests</th>
                  <th className="py-2.5 px-3 font-medium text-right pr-6">Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {contestRankings.map((userProfile, index) => {
                  const rank = userProfile.rank || index + 1;
                  const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;
                  const displayName = userProfile.name || userProfile.username || 'Anonymous';
                  const rating = userProfile.contestRating || 1500;
                  const tier = userProfile.ratingBadge || 'Contender';
                  const attended = userProfile.contestsAttended || 0;
                  const solved = userProfile.problemsSolved || 0;

                  return (
                    <tr
                      key={targetProfileId || index}
                      className="hover:bg-surface-raised/35 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankBadge(rank)}
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Link
                          to={`/profile/${targetProfileId}`}
                          className="inline-flex items-center gap-2.5 font-normal text-text hover:text-accent transition-colors group"
                        >
                          <LeaderboardAvatar
                            avatar={userProfile.avatar}
                            name={displayName}
                            className="h-6 w-6 rounded"
                          />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{displayName}</span>
                          <ArrowUpRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>

                      {/* Rating Tier Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <RatingBadge rating={rating} tierName={tier} size="sm" />
                      </td>

                      {/* Contest Rating */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-text">
                          {rating}
                        </span>
                      </td>

                      {/* Contests Attended */}
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted whitespace-nowrap">
                        {attended}
                      </td>

                      {/* Problems Solved */}
                      <td className="py-2.5 px-3 text-right font-mono text-text pr-6 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-success shrink-0" />
                          <span>{solved}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ─── TAB 2: PROBLEMS SOLVED TABLE ──────────────────── */
        problemRankings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Trophy className="h-6 w-6 mx-auto text-text-muted" />
            <p className="text-xs text-text-muted">No rankings recorded yet. Be the first to solve a problem!</p>
            <Link
              to="/problems"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Start solving problems <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="border-t border-border/40 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                  <th className="py-2.5 px-3 font-medium w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3 font-medium">User</th>
                  <th className="py-2.5 px-3 font-medium text-right">Solved</th>
                  <th className="py-2.5 px-3 font-medium text-right">Submissions</th>
                  <th className="py-2.5 px-3 font-medium text-right pr-6">Acceptance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {problemRankings.map((userProfile, index) => {
                  const rank = index + 1;
                  const solved = userProfile.problemsSolved || 0;
                  const submissionsCount = userProfile.acceptedSubmissions || userProfile.totalSubmissions || 0;
                  const rate = parseFloat(userProfile.acceptanceRate || 0);
                  const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;
                  const displayName = userProfile.username || userProfile.name || 'Anonymous';

                  return (
                    <tr
                      key={targetProfileId || index}
                      className="hover:bg-surface-raised/35 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {getRankBadge(rank)}
                        </div>
                      </td>

                      {/* Member */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Link
                          to={`/profile/${targetProfileId}`}
                          className="inline-flex items-center gap-2.5 font-normal text-text hover:text-accent transition-colors group"
                        >
                          <LeaderboardAvatar
                            avatar={userProfile.avatar}
                            name={displayName}
                            className="h-6 w-6 rounded"
                          />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{displayName}</span>
                          <ArrowUpRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>

                      {/* Problems Solved */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono text-text">
                          <CheckCircle className="w-3 h-3 text-success" />
                          <span>{solved}</span>
                        </div>
                      </td>

                      {/* Total Submissions */}
                      <td className="py-2.5 px-3 text-right font-mono text-text-muted whitespace-nowrap">
                        {submissionsCount}
                      </td>

                      {/* Acceptance Rate */}
                      <td className="py-2.5 px-3 text-right font-mono text-text pr-6 whitespace-nowrap">
                        <span className={rate >= 70 ? 'text-success' : rate >= 40 ? 'text-warning' : 'text-text-muted'}>
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}