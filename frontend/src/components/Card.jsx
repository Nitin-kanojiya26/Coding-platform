import React from 'react';

/**
 * Simple LeetCode-Style Card Component
 * - Clean surface, subtle border, rounded-md
 */
export default function Card({
  children,
  className = '',
  interactive = false,
  onClick,
  ...props
}) {
  const interactiveClasses = interactive
    ? 'cursor-pointer transition-colors duration-120 hover:border-text-muted/40 hover:bg-surface-raised active:scale-[0.99]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-md ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
