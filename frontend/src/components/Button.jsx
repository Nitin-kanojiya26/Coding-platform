import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Simple LeetCode-Style Button Component
 * - Variants: 'primary' | 'secondary' | 'danger' | 'ghost'
 * - Sizes: 'sm' | 'md' | 'lg'
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const isDisabled = disabled || isLoading;

  const baseStyles =
    'relative inline-flex items-center justify-center font-medium select-none cursor-pointer transition-all duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 rounded-sm gap-1.5 min-h-[28px]',
    md: 'text-xs sm:text-sm px-3.5 py-1.5 rounded-sm gap-2 min-h-[34px]',
    lg: 'text-sm sm:text-base px-5 py-2 rounded-md gap-2 min-h-[40px]',
  };

  const variantStyles = {
    primary:
      'bg-accent text-black font-semibold hover:brightness-105 active:brightness-95 border border-accent/20',
    secondary:
      'bg-surface-raised text-text border border-border hover:bg-surface-raised/80 hover:border-text-muted/40',
    danger:
      'bg-danger text-white border border-danger/30 hover:brightness-105 active:brightness-95',
    ghost:
      'bg-transparent text-text-muted border border-transparent hover:text-text hover:bg-surface-raised',
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span className="opacity-80">{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
