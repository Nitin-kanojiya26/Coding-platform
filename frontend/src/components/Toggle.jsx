import React from 'react';

/**
 * Tactile Toggle Component
 * - Physical mechanical switch look with debossed track and tactile pill
 */
export default function Toggle({
  checked = false,
  onChange,
  disabled = false,
  label,
  id,
  className = '',
}) {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] ${
          checked
            ? 'bg-accent/20 border-accent/40'
            : 'bg-surface-inset border-border'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-150 ease-out shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] ${
            checked
              ? 'translate-x-6 bg-accent'
              : 'translate-x-1 bg-text-muted hover:bg-text'
          }`}
        />
      </div>

      {label && <span className="text-xs font-medium text-text">{label}</span>}
    </label>
  );
}
