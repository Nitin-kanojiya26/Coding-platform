import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Trophy, TrendingUp } from 'lucide-react';
import RatingBadge, { getRatingTier } from './RatingBadge';

// ─── Custom Dark-Mode Minimal Tooltip ───────────────────────────
function CustomRatingTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const tierInfo = getRatingTier(data.rating);

  return (
    <div className="bg-bg/95 backdrop-blur-sm border border-border/60 rounded px-3 py-2 shadow-lg text-xs space-y-1.5 min-w-[190px] select-none font-sans z-50">
      {/* Contest Title & Date */}
      <div className="border-b border-border/25 pb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-text text-xs truncate max-w-[130px]">
          {data.contestTitle}
        </span>
        <span className="text-[10px] text-text-muted">{data.date}</span>
      </div>

      {/* Rating & Badge */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[11px]">Rating:</span>
        <div className="flex items-center gap-1.5">
          <RatingBadge rating={data.rating} tierName={data.tier} size="xs" />
          <strong className="text-text font-semibold">{data.rating}</strong>
        </div>
      </div>

      {/* Delta & Rank */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/20">
        <span className="text-text-muted">Change:</span>
        <span
          className={`font-medium ${
            data.delta > 0
              ? 'text-success'
              : data.delta < 0
              ? 'text-danger'
              : 'text-text-muted'
          }`}
        >
          {data.delta > 0 ? `+${data.delta}` : data.delta}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-muted">Standing:</span>
        <span className="text-text">
          Rank {data.rank} <span className="text-text-muted">/ {data.totalParticipants}</span>
        </span>
      </div>

      {data.solvedCount !== undefined && data.solvedCount !== '-' && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted">Solved:</span>
          <span className="text-success font-medium">
            {data.solvedCount} problems
          </span>
        </div>
      )}
    </div>
  );
}

export default function ContestRatingGraph({
  ratingHistory = [],
  currentRating = 1500,
  globalRank = null,
  contestsAttended = 0,
  ratingBadge = 'Contender',
  className = '',
}) {
  // Format chart data points
  const chartData = useMemo(() => {
    if (!Array.isArray(ratingHistory) || ratingHistory.length === 0) {
      return [];
    }

    const firstContest = ratingHistory[0];
    const initialBaseline = {
      index: 0,
      contestTitle: 'Initial Rating',
      rating: firstContest.oldRating || 1500,
      delta: 0,
      rank: '-',
      totalParticipants: '-',
      solvedCount: '-',
      date: 'Start',
      tier: 'Contender',
    };

    const points = ratingHistory.map((h, idx) => ({
      index: idx + 1,
      contestTitle: h.contestTitle || `Contest #${idx + 1}`,
      rating: h.newRating,
      oldRating: h.oldRating,
      delta: h.delta,
      rank: h.rank,
      totalParticipants: h.totalParticipants,
      solvedCount: h.solvedCount,
      date: h.calculatedAt ? new Date(h.calculatedAt).toLocaleDateString() : `#${idx + 1}`,
      tier: h.ratingBadge || 'Contender',
    }));

    return [initialBaseline, ...points];
  }, [ratingHistory]);

  // Compute peak rating and dynamic Y-axis bounds
  const { minRating, maxRating, peakRating } = useMemo(() => {
    if (chartData.length === 0) {
      return { minRating: 1400, maxRating: 1600, peakRating: currentRating };
    }
    const allRatings = chartData.map((d) => d.rating);
    const minR = Math.min(...allRatings);
    const maxR = Math.max(...allRatings);
    const peak = maxR;

    const yMin = Math.max(100, Math.floor((minR - 30) / 50) * 50);
    const yMax = Math.ceil((maxR + 30) / 50) * 50;

    return { minRating: yMin, maxRating: yMax, peakRating: peak };
  }, [chartData, currentRating]);

  const currentTier = getRatingTier(currentRating);

  return (
    <div className={`space-y-3 pb-5 border-b border-border/40 ${className}`}>
      {/* ─── Minimal Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-warning" /> Rating Progression
          </span>
          <RatingBadge rating={currentRating} tierName={ratingBadge} size="xs" />
        </div>

        {/* Minimal Stats Row */}
        <div className="flex items-center gap-4 text-xs text-text-muted shrink-0">
          <div>
            Rating: <strong className="text-text font-medium">{currentRating}</strong>
          </div>
          <span className="text-border/60">•</span>
          <div>
            Peak: <strong className="text-text font-medium">{peakRating}</strong>
          </div>
          <span className="text-border/60">•</span>
          <div>
            Rank: <strong className="text-text font-medium">{globalRank ? `#${globalRank}` : '—'}</strong>
          </div>
          <span className="text-border/60">•</span>
          <div>
            Attended: <strong className="text-text font-medium">{contestsAttended}</strong>
          </div>
        </div>
      </div>

      {/* ─── Graph / Chart Display ───────────────────────────── */}
      {chartData.length <= 1 ? (
        <div className="h-36 flex flex-col items-center justify-center text-center space-y-1.5 py-4 border border-dashed border-border/30 rounded text-xs">
          <TrendingUp className="w-5 h-5 text-text-muted" />
          <p className="text-text-muted text-[11px]">
            No contest history recorded yet. Participate in contests to plot your rating curve.
          </p>
        </div>
      ) : (
        <div className="w-full h-48 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 10, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentTier.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={currentTier.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border, #3f3f46)"
                opacity={0.25}
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="var(--color-text-muted, #71717a)"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border, #3f3f46)', opacity: 0.3 }}
              />

              <YAxis
                domain={[minRating, maxRating]}
                stroke="var(--color-text-muted, #71717a)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={40}
              />

              <Tooltip content={<CustomRatingTooltip />} />

              <Area
                type="monotone"
                dataKey="rating"
                stroke={currentTier.color}
                strokeWidth={1.75}
                fillOpacity={1}
                fill="url(#ratingGradient)"
                activeDot={{
                  r: 4,
                  stroke: currentTier.color,
                  strokeWidth: 2,
                  fill: 'var(--color-bg, #09090b)',
                }}
                dot={{
                  r: 2.5,
                  stroke: currentTier.color,
                  strokeWidth: 1.5,
                  fill: 'var(--color-bg, #09090b)',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
