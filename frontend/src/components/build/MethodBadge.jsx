import React from 'react';

/**
 * MethodBadge: High-contrast, accessible HTTP method badges
 * GET (Blue), POST (Green), PUT (Amber), DELETE (Red), PATCH (Purple)
 */
export default function MethodBadge({ method = 'GET', size = 'sm', className = '' }) {
  const m = (method || 'GET').toUpperCase();

  const styles = {
    GET: 'bg-blue-500/15 text-blue-400 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40',
    POST: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    DELETE: 'bg-rose-500/15 text-rose-400 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40',
    PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40',
  }[m] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';

  const sizeStyles = {
    xs: 'px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider rounded border',
    sm: 'px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded border',
    md: 'px-2.5 py-1 text-xs font-mono font-bold tracking-wider rounded-md border',
  }[size] || 'px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded border';

  return (
    <span className={`inline-flex items-center justify-center select-none uppercase ${styles} ${sizeStyles} ${className}`}>
      {m}
    </span>
  );
}
