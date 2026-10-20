import React from 'react';
import { Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ className = "", stacked = false }) {
  return (
    <Link to="/" className={`flex ${stacked ? 'flex-col items-center justify-center gap-2.5' : 'items-center gap-2'} group select-none min-w-0 ${className}`}>
      {/* Code-Based Logo Mark */}
      <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-surface-raised border border-border group-hover:border-accent-blue/60 transition-all shrink-0 overflow-hidden">
        <Terminal className="h-4.5 w-4.5 text-text relative z-10" strokeWidth={2} />
      </div>
      
      {/* Typography Name Style */}
      <div className="flex flex-col tracking-tight min-w-0 text-left">
        <span className="text-base font-bold tracking-tight text-text transition-opacity duration-150 group-hover:opacity-85 truncate">
          Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">xium</span>
        </span>
      </div>
    </Link>
  );
}
