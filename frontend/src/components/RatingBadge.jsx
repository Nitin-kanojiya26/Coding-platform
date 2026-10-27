import React from 'react';

/**
 * Determine rating tier information from numerical rating
 */
export function getRatingTier(rating = 1500) {
  const r = Math.round(Number(rating) || 1500);
  if (r >= 2150) {
    return {
      tier: 'Guardian',
      label: 'Guardian',
      color: '#f43f5e', // Rose
      bgClass: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      textClass: 'text-rose-400',
    };
  }
  if (r >= 1850) {
    return {
      tier: 'Knight',
      label: 'Knight',
      color: '#f59e0b', // Amber / Gold
      bgClass: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      textClass: 'text-amber-400',
    };
  }
  if (r >= 1650) {
    return {
      tier: 'Expert',
      label: 'Expert',
      color: '#c084fc', // Purple
      bgClass: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
      textClass: 'text-purple-400',
    };
  }
  if (r >= 1500) {
    return {
      tier: 'Specialist',
      label: 'Specialist',
      color: '#38bdf8', // Clean Sky Blue
      bgClass: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
      textClass: 'text-sky-400',
    };
  }
  return {
    tier: 'Contender',
    label: 'Contender',
    color: '#a1a1aa', // Zinc
    bgClass: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
    textClass: 'text-zinc-400',
  };
}

export function getRatingTierByName(name = 'Contender') {
  const n = (name || '').toLowerCase();
  if (n.includes('guardian')) return getRatingTier(2200);
  if (n.includes('knight')) return getRatingTier(1900);
  if (n.includes('expert')) return getRatingTier(1700);
  if (n.includes('specialist')) return getRatingTier(1550);
  return getRatingTier(1400);
}

/**
 * Clean, Minimal LeetCode-style Rating Badge Tag
 */
export default function RatingBadge({
  rating,
  tierName,
  showIcon = true,
  size = 'sm',
  className = '',
}) {
  const info = tierName ? getRatingTierByName(tierName) : getRatingTier(rating);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1 font-medium',
    sm: 'text-[11px] px-2 py-0.5 gap-1.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 font-medium',
    lg: 'text-xs px-3 py-1 gap-2 font-semibold',
  }[size] || 'text-[11px] px-2 py-0.5 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded border tracking-tight select-none ${info.bgClass} ${sizeClasses} ${className}`}
      title={`Tier: ${info.label}`}
    >
      {showIcon && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: info.color }}
        />
      )}
      <span>{info.label}</span>
    </span>
  );
}
