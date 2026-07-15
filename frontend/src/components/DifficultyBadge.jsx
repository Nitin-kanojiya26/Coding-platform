import React from 'react';

export default function DifficultyBadge({ difficulty }) {
  const styles = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    hard: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${styles[difficulty] || styles.easy}`}
    >
      {difficulty}
    </span>
  );
}