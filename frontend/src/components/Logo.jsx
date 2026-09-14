import React from 'react';
import { Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Logo({ className = "", stacked = false }) {
  return (
    <Link to="/" className={`flex ${stacked ? 'flex-col items-center justify-center gap-3' : 'items-center gap-2'} group select-none min-w-0 ${className}`}>
      {/* Premium Code-Based Logo Mark (Theme Adaptive) */}
      <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-card shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300 shrink-0 border border-base overflow-hidden">
        <Terminal className="h-5 w-5 text-primary relative z-10" strokeWidth={2} />
      </div>
      
      {/* Premium Typography Name Style (Professional) */}
      <div className="flex flex-col tracking-tight min-w-0 text-left">
        <span className="text-lg font-bold tracking-tight text-primary transition-opacity duration-150 group-hover:opacity-80 truncate">
          Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">xium</span>
        </span>
      </div>
    </Link>
  );
}
