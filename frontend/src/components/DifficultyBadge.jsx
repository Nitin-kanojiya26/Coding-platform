import React from 'react';

export default function DifficultyBadge({ difficulty }) {
  const styles = {
    easy: 'bg-emerald-400/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-400/10 text-amber-400 border-amber-500/20',
    hard: 'bg-rose-400/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${styles[difficulty] || styles.easy}`}
    >
      {difficulty}
    </span>
  );
}