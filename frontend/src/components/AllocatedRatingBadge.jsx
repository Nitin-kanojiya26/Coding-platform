import React from 'react';
import { Trophy, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import RatingBadge, { getRatingTier } from './RatingBadge';

/**
 * Returns tier-specific metadata, badge description, and next tier progression
 */
export function getAllocatedBadgeDetails(rating = 1500) {
  const current = getRatingTier(rating);
  const r = Math.round(Number(rating) || 1500);

  let nextTier = null;
  let pointsToNext = 0;
  let progressPercent = 100;

  if (r >= 2150) {
    nextTier = null;
    pointsToNext = 0;
    progressPercent = 100;
  } else if (r >= 1850) {
    nextTier = { name: 'Guardian', threshold: 2150 };
    pointsToNext = 2150 - r;
    progressPercent = Math.min(100, Math.round(((r - 1850) / (2150 - 1850)) * 100));
  } else if (r >= 1650) {
    nextTier = { name: 'Knight', threshold: 1850 };
    pointsToNext = 1850 - r;
    progressPercent = Math.min(100, Math.round(((r - 1650) / (1850 - 1650)) * 100));
  } else if (r >= 1500) {
    nextTier = { name: 'Expert', threshold: 1650 };
    pointsToNext = 1650 - r;
    progressPercent = Math.min(100, Math.round(((r - 1500) / (1650 - 1500)) * 100));
  } else {
    nextTier = { name: 'Specialist', threshold: 1500 };
    pointsToNext = 1500 - r;
    progressPercent = Math.min(100, Math.max(0, Math.round((r / 1500) * 100)));
  }

  return {
    ...current,
    currentRating: r,
    nextTier,
    pointsToNext,
    progressPercent,
  };
}

/**
 * Minimal & Professional LeetCode-style Allocated Tier Showcase
 */
export default function AllocatedRatingBadge({
  rating = 1500,
  tierName,
  contestsAttended = 0,
  globalRank = null,
  className = '',
}) {
  const badge = getAllocatedBadgeDetails(rating);
  const isAllocated = contestsAttended > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Title & Badge Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-warning" /> Contest Rating
        </span>
        <div className="flex items-center gap-1.5">
          <RatingBadge
            rating={badge.currentRating}
            tierName={tierName || badge.label}
            size="sm"
          />
          {isAllocated && (
            <span className="text-[10px] text-text-muted bg-surface-raised px-1.5 py-0.5 rounded border border-border/40 font-medium">
              Allocated
            </span>
          )}
        </div>
      </div>

      {/* Numerical Stats */}
      <div className="grid grid-cols-2 gap-3 pt-0.5">
        <div className="space-y-0.5">
          <span className="text-[10px] text-text-muted uppercase tracking-wide block">
            Rating
          </span>
          <span className="text-base font-semibold text-text">
            {badge.currentRating}
          </span>
        </div>

        <div className="space-y-0.5 border-l border-border/30 pl-3">
          <span className="text-[10px] text-text-muted uppercase tracking-wide block">
            Global Rank
          </span>
          <span className="text-base font-semibold text-text">
            {globalRank ? `#${globalRank}` : '—'}
          </span>
        </div>
      </div>

      {/* Subtle Progress Track to Next Tier */}
      {badge.nextTier && (
        <div className="space-y-1 pt-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">
              Next: <strong className="text-text font-medium">{badge.nextTier.name}</strong> ({badge.nextTier.threshold})
            </span>
            <span className="text-[11px] text-text-muted">
              {badge.pointsToNext} pts to promote
            </span>
          </div>

          <div className="w-full h-1 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${badge.progressPercent}%`,
                backgroundColor: badge.color,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/20 text-text-muted">
        <span>Attended: <strong className="text-text font-medium">{contestsAttended}</strong></span>
        <Link
          to="/leaderboard"
          className="text-accent hover:underline text-[11px] inline-flex items-center gap-0.5"
        >
          Leaderboard <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
