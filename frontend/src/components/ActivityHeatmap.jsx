import React from 'react';
import { Calendar } from 'lucide-react';

export default function ActivityHeatmap({ submissions = [] }) {
  const days = Array.from({ length: 56 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (55 - i));
    return date;
  });

  const submissionDates = new Set(
    submissions.map((s) => new Date(s.submittedAt).toISOString().split('T')[0])
  );

  const getIntensity = (date) => {
    const key = date.toISOString().split('T')[0];
    if (!submissionDates.has(key)) return 0;
    const count = submissions.filter(
      (s) => new Date(s.submittedAt).toISOString().split('T')[0] === key
    ).length;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  const colors = ['bg-zinc-800', 'bg-cyan-950', 'bg-cyan-700', 'bg-cyan-400'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-4 w-4 text-cyan-400" />
        <h4 className="text-sm font-semibold text-zinc-300">Activity (Last 8 weeks)</h4>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          const level = getIntensity(date);
          return (
            <div
              key={idx}
              className={`w-6 h-6 rounded-sm ${colors[level]} transition-all duration-200 hover:ring-2 hover:ring-cyan-400 hover:scale-110 cursor-pointer`}
              title={`${date.toLocaleDateString()}: ${level} submissions`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-1 mt-1 text-xs text-zinc-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-zinc-800" />
        <div className="w-3 h-3 rounded-sm bg-cyan-950" />
        <div className="w-3 h-3 rounded-sm bg-cyan-700" />
        <div className="w-3 h-3 rounded-sm bg-cyan-400" />
        <span>More</span>
      </div>
    </div>
  );
}