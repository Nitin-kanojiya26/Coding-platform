import React from 'react';

export default function DifficultyBadge({ difficulty = 'easy', className = '' }) {
  const diff = (difficulty || 'easy').toLowerCase();
  const styles = {
    easy: 'text-success bg-success/10 border-success/20',
    medium: 'text-warning bg-warning/10 border-warning/20',
    hard: 'text-danger bg-danger/10 border-danger/20',
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize border select-none ${styles[diff] || styles.easy} ${className}`}
    >
      {diff}
    </span>
  );
}