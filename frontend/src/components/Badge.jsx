import React from 'react';

/**
 * Tactile Badge Component
 * - Small "indicator light" style with dot/pulse and high-contrast text
 * - Verdicts: 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'queued' | 'running'
 * - Difficulties: 'easy' | 'medium' | 'hard'
 */
export default function Badge({
  type = 'accepted',
  label,
  showDot = true,
  className = '',
  ...props
}) {
  const normalized = (type || 'accepted').toLowerCase().replace(/\s+/g, '_');

  const configs = {
    // Verdicts
    accepted: {
      label: label || 'Accepted',
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/30',
      dotColor: 'bg-success',
      pulse: false,
    },
    ac: {
      label: label || 'Accepted',
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/30',
      dotColor: 'bg-success',
      pulse: false,
    },
    wrong_answer: {
      label: label || 'Wrong Answer',
      bg: 'bg-danger/10',
      text: 'text-danger',
      border: 'border-danger/30',
      dotColor: 'bg-danger',
      pulse: false,
    },
    wa: {
      label: label || 'Wrong Answer',
      bg: 'bg-danger/10',
      text: 'text-danger',
      border: 'border-danger/30',
      dotColor: 'bg-danger',
      pulse: false,
    },
    runtime_error: {
      label: label || 'Runtime Error',
      bg: 'bg-danger/10',
      text: 'text-danger',
      border: 'border-danger/30',
      dotColor: 'bg-danger',
      pulse: false,
    },
    re: {
      label: label || 'Runtime Error',
      bg: 'bg-danger/10',
      text: 'text-danger',
      border: 'border-danger/30',
      dotColor: 'bg-danger',
      pulse: false,
    },
    time_limit: {
      label: label || 'Time Limit Exceeded',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
      dotColor: 'bg-warning',
      pulse: false,
    },
    tle: {
      label: label || 'Time Limit Exceeded',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
      dotColor: 'bg-warning',
      pulse: false,
    },
    queued: {
      label: label || 'Queued',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
      dotColor: 'bg-warning',
      pulse: false,
    },
    running: {
      label: label || 'Running',
      bg: 'bg-info/10',
      text: 'text-info',
      border: 'border-info/30',
      dotColor: 'bg-info',
      pulse: true,
    },
    // Difficulties
    easy: {
      label: label || 'Easy',
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/30',
      dotColor: 'bg-success',
      pulse: false,
    },
    medium: {
      label: label || 'Medium',
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/30',
      dotColor: 'bg-warning',
      pulse: false,
    },
    hard: {
      label: label || 'Hard',
      bg: 'bg-danger/10',
      text: 'text-danger',
      border: 'border-danger/30',
      dotColor: 'bg-danger',
      pulse: false,
    },
    neutral: {
      label: label || 'Status',
      bg: 'bg-surface-inset',
      text: 'text-text-muted',
      border: 'border-border',
      dotColor: 'bg-text-muted',
      pulse: false,
    },
  };

  const current = configs[normalized] || configs.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium border uppercase tracking-wider select-none ${current.bg} ${current.text} ${current.border} ${className}`}
      {...props}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5">
          {current.pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dotColor}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${current.dotColor}`} />
        </span>
      )}
      <span>{current.label}</span>
    </span>
  );
}
