import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export default function ActivityHeatmap({ 
  submissions = [], 
  loginDates = [], 
  mode = 'submission'  // 'login' or 'submission'
}) {
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Build active days based on mode
  const activeDays = useMemo(() => {
    if (mode === 'login') {
      return new Set(loginDates);
    } else {
      // submissions mode: we count per day
      const countMap = {};
      submissions.forEach(s => {
        const key = new Date(s.submittedAt).toISOString().split('T')[0];
        countMap[key] = (countMap[key] || 0) + 1;
      });
      return countMap;
    }
  }, [mode, loginDates, submissions]);

  // Generate last 365 days
  const days = useMemo(() => {
    const arr = [];
    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  // Group into weeks
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [days]);

  // Get intensity based on mode
  const getIntensity = (date) => {
    const key = date.toISOString().split('T')[0];
    if (mode === 'login') {
      return activeDays.has(key) ? 1 : 0;
    } else {
      const count = activeDays[key] || 0;
      if (count === 0) return 0;
      if (count <= 2) return 1;
      if (count <= 4) return 2;
      if (count <= 6) return 3;
      return 4;
    }
  };

  // Colors: login uses cyan, submission uses green
  const loginColors = ['bg-slate-800', 'bg-cyan-500'];
  const submissionColors = [
    'bg-slate-800',
    'bg-emerald-950',
    'bg-emerald-700',
    'bg-emerald-500',
    'bg-emerald-300',
  ];
  const colors = mode === 'login' ? loginColors : submissionColors;

  // Compute stats
  const { totalDays, maxStreak } = useMemo(() => {
    let datesArray;
    if (mode === 'login') {
      datesArray = Array.from(activeDays).sort();
    } else {
      datesArray = Object.keys(activeDays).sort();
    }
    const total = datesArray.length;
    let streak = 0, maxS = 0, prev = null;
    for (const d of datesArray) {
      const cur = new Date(d);
      if (prev === null) streak = 1;
      else {
        const diff = (cur - prev) / (1000 * 60 * 60 * 24);
        streak = diff === 1 ? streak + 1 : 1;
      }
      prev = cur;
      maxS = Math.max(maxS, streak);
    }
    return { totalDays: total, maxStreak: maxS };
  }, [activeDays, mode]);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
          <span>{mode === 'login' ? 'Login Activity' : 'Submission Activity'} (Last 365 days)</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Total days: <span className="text-white font-bold">{totalDays}</span></span>
          <span>Max streak: <span className="text-orange-400 font-bold">{maxStreak}</span></span>
        </div>
      </div>

      <div className="relative">
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
              {/* Day labels */}
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
                        title={`${date.toLocaleDateString()}: ${
                          mode === 'login' 
                            ? (activeDays.has(date.toISOString().split('T')[0]) ? 'Active' : 'Inactive')
                            : (activeDays[date.toISOString().split('T')[0]] || 0) + ' submissions'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showScrollHint && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-900/80 text-slate-400 text-xs px-2 py-1 rounded-full animate-pulse">
            <ChevronRight className="h-4 w-4 inline" /> scroll
          </div>
        )}

        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
        <span>Less</span>
        {colors.map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}