import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Trophy, Crown, Medal, ArrowUpRight, CheckCircle, Users, Target } from 'lucide-react';
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
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get('/leaderboard');
        setRankings(res.data.leaderboard || res.data || []);
      } catch (err) {
        console.error('Failed to load leaderboard telemetry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Compute stats
  const topSolver = rankings[0];

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

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="h-10 w-full bg-surface-raised/40 rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Global Leaderboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Algorithmic rankings based on verified problem solutions and submission performance.
          </p>
        </div>

        {/* Compact stats summary */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>Active Solvers: <strong className="font-mono text-text">{rankings.length}</strong></span>
          {topSolver && (
            <>
              <span className="text-border/60">•</span>
              <span>Top: <strong className="font-mono text-accent">{topSolver.username || topSolver.name}</strong></span>
            </>
          )}
        </div>
      </div>

      {rankings.length === 0 ? (
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
        /* Flat LeetCode Leaderboard Table */
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
              {rankings.map((userProfile, index) => {
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
      )}
    </div>
  );
}