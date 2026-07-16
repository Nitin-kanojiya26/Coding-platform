import React, { useRef, useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ActivityHeatmap({ submissions = [] }) {
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Generate 365 days (past year)
  const days = Array.from({ length: 365 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (364 - i)); // start from 365 days ago
    return date;
  });

  // Build a map of date -> submission count
  const submissionCountMap = {};
  submissions.forEach((s) => {
    const key = new Date(s.submittedAt).toISOString().split('T')[0];
    submissionCountMap[key] = (submissionCountMap[key] || 0) + 1;
  });

  // Compute total login days (days with at least 1 submission)
  const totalLoginDays = Object.keys(submissionCountMap).length;

  // Compute max streak
  const dates = Object.keys(submissionCountMap).sort();
  let currentStreak = 0;
  let maxStreak = 0;
  let prevDate = null;
  for (const dateStr of dates) {
    const current = new Date(dateStr);
    if (prevDate === null) {
      currentStreak = 1;
    } else {
      const diff = (current - prevDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    prevDate = current;
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  // Group days by week for grid layout (7 columns)
  // We'll create a grid of 53 weeks (53 rows of 7 days)
  // But we want to display as a heatmap with month labels.
  // To simplify, we render a grid with 7 columns (days of week) and 53 rows.
  const weeks = [];
  for (let i = 0; i < 365; i += 7) {
    const week = days.slice(i, i + 7);
    weeks.push(week);
  }

  const getIntensity = (date) => {
    const key = date.toISOString().split('T')[0];
    const count = submissionCountMap[key] || 0;
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  };

  const colors = [
    'bg-slate-800',
    'bg-emerald-950',
    'bg-emerald-700',
    'bg-emerald-500',
    'bg-emerald-300',
  ];

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Auto-scroll to the rightmost (most recent) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      setTimeout(() => setShowScrollHint(false), 3000);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span>Activity (Last 365 days)</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Total days: <span className="text-white font-bold">{totalLoginDays}</span></span>
          <span>Max streak: <span className="text-orange-400 font-bold">{maxStreak}</span></span>
        </div>
      </div>

      <div className="relative">
        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-visible pb-2 scroll-smooth"
          style={{ maxHeight: '160px' }}
        >
          <div className="min-w-max">
            {/* Month labels */}
            <div className="flex text-[10px] text-slate-500 mb-1 pl-6">
              {weeks.map((week, idx) => {
                const month = week[0]?.toLocaleString('default', { month: 'short' });
                // Only show if it's the first week of the month
                const prevMonth = idx > 0 ? weeks[idx-1][0]?.getMonth() : -1;
                const currentMonth = week[0]?.getMonth();
                if (currentMonth !== undefined && currentMonth !== prevMonth) {
                  return <div key={idx} style={{ width: '22px' }} className="text-center">{month}</div>;
                }
                return <div key={idx} style={{ width: '22px' }} />;
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {/* Day labels (left) */}
              <div className="flex flex-col gap-1 pr-2 text-[10px] text-slate-500 font-mono">
                {dayLabels.map((label, i) => (
                  <div key={i} className="h-3 flex items-center">{label}</div>
                ))}
              </div>

              {/* Heatmap grid */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((date, dayIdx) => {
                    const level = getIntensity(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={dayIdx}
                        className={`w-3 h-3 rounded-sm ${colors[level]} transition-colors duration-150 hover:ring-2 hover:ring-cyan-400 cursor-default ${
                          isToday ? 'ring-1 ring-cyan-400' : ''
                        }`}
                        title={`${date.toLocaleDateString()}: ${submissionCountMap[date.toISOString().split('T')[0]] || 0} submissions`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint (fades out) */}
        {showScrollHint && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900/80 text-slate-400 text-xs px-2 py-1 rounded-full animate-pulse">
            <ChevronRight className="h-4 w-4 inline" /> scroll
          </div>
        )}

        {/* Gradient fade for scroll hint */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-slate-800" />
        <div className="w-3 h-3 rounded-sm bg-emerald-950" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <div className="w-3 h-3 rounded-sm bg-emerald-300" />
        <span>More</span>
      </div>
    </div>
  );
}