import React from 'react';

/**
 * Tactile Panel Component (Console / Test Results Screen)
 * - Inset surface, monospace text, scrollable, set like a screen into a device
 */
export default function Panel({
  children,
  header,
  footer,
  className = '',
  maxHeight = 'max-h-72',
  ...props
}) {
  return (
    <div
      className={`bg-surface-inset border border-border rounded-md shadow-[inset_0_2px_6px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.04)] overflow-hidden flex flex-col ${className}`}
      {...props}
    >
      {header && (
        <div className="px-3.5 py-2 border-b border-border bg-surface/40 flex items-center justify-between text-xs font-mono text-text-muted select-none">
          {header}
        </div>
      )}

      <div className={`p-3.5 font-mono text-xs text-text overflow-y-auto leading-relaxed ${maxHeight}`}>
        {children}
      </div>

      {footer && (
        <div className="px-3.5 py-2 border-t border-border bg-surface/30 flex items-center justify-between text-xs font-mono text-text-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
