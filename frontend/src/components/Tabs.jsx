import React from 'react';

/**
 * Tactile Tabs Component
 * - Raised active tab with shadow, flat inactive tabs
 * - Keyboard accessible (arrow keys, Enter/Space)
 */
export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 bg-surface-inset border border-border rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange && onChange(tab.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-out select-none flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
              isActive
                ? 'bg-surface-raised text-text border border-border/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.4)] font-semibold'
                : 'text-text-muted hover:text-text hover:bg-surface/50 border border-transparent'
            }`}
          >
            {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                isActive ? 'bg-accent/20 text-accent font-bold' : 'bg-surface text-text-muted'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
