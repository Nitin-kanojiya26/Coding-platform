import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loader({ size = 8, color = 'text-cyan-400' }) {
  return (
    <div className="flex items-center justify-center h-full w-full py-12">
      <Loader2 className={`h-${size} w-${size} ${color} animate-spin`} />
    </div>
  );
}