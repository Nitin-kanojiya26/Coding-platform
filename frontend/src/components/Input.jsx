import React, { forwardRef } from 'react';

/**
 * Simple LeetCode-Style Input Component
 * - Clean inset/flat surface, accent focus ring, high-contrast text
 */
const Input = forwardRef(function Input(
  {
    type = 'text',
    leftIcon,
    rightIcon,
    error,
    className = '',
    disabled = false,
    ...props
  },
  ref
) {
  return (
    <div className="relative w-full">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none flex items-center">
          {leftIcon}
        </div>
      )}

      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={`w-full bg-surface-inset text-text placeholder-text-muted text-xs sm:text-sm font-sans rounded-sm border border-border py-1.5 ${
          leftIcon ? 'pl-8' : 'pl-3'
        } ${rightIcon ? 'pr-8' : 'pr-3'} focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-120 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-danger focus:border-danger focus:ring-danger' : ''
        } ${className}`}
        {...props}
      />

      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted flex items-center">
          {rightIcon}
        </div>
      )}

      {error && (
        <span className="text-[11px] text-danger mt-1 block font-sans">{error}</span>
      )}
    </div>
  );
});

export default Input;
