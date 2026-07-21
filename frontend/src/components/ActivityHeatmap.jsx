import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export default function ActivityHeatmap({
  submissions = [],
  loginDates = [],
  mode = 'submission'
}) {
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  const activeDays = useMemo(() => {
    if (mode === 'login') {
      return new Set(loginDates);
    } else {
      const countMap = {};
      submissions.forEach(s => {
        const key = new Date(s.submittedAt).toISOString().split('T')[0];
        countMap[key] = (countMap[key] || 0) + 1;
      });
      return countMap;
    }
  }, [mode, loginDates, submissions]);

  const monthsData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const monthLabel = targetDate.toLocaleString('default', { month: 'short' });
      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      const daysArray = [];
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const d = new Date(year, month, day);
        if (d <= today) daysArray.push(d);
      }
      data.push({ label: monthLabel, days: daysArray });
    }
    return data;
  }, []);

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

  // 🔥 Empty box uses CSS variable – adapts to theme
  // Filled boxes keep their original colors (green/cyan)
  const emptyClass = 'bg-heatmap-empty';
  const colors = mode === 'login'
    ? [emptyClass, 'bg-cyan-500']
    : [
        emptyClass,
        'bg-emerald-950',
        'bg-emerald-700',
        'bg-emerald-500',
        'bg-emerald-300',
      ];

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      setTimeout(() => setShowScrollHint(false), 3000);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span>{mode === 'login' ? 'Login Activity' : 'Submission Activity'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>Total days: <strong className="text-primary">{totalDays}</strong></span>
          <span>Max streak: <strong className="text-orange-400">{maxStreak}</strong></span>
        </div>
      </div>

      <div className="relative">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-visible pb-2 scroll-smooth">
          <div className="flex gap-4 min-w-max px-1">
            {monthsData.map((monthBlock, mIdx) => (
              <div key={mIdx} className="flex flex-col items-center">
                <div className="grid grid-rows-6 grid-flow-col gap-1">
                  {monthBlock.days.map((date, dIdx) => {
                    const level = getIntensity(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={dIdx}
                        className={`w-3 h-3 rounded-sm ${colors[level]} transition-colors duration-150 hover:ring-2 hover:ring-cyan-400 cursor-default ${isToday ? 'ring-1 ring-cyan-400' : ''}`}
                        title={`${date.toLocaleDateString()}: ${
                          mode === 'login'
                            ? activeDays.has(date.toISOString().split('T')[0]) ? 'Active' : 'Inactive'
                            : (activeDays[date.toISOString().split('T')[0]] || 0) + ' submissions'
                        }`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-muted font-medium mt-2">
                  {monthBlock.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {showScrollHint && (
          <div className="absolute right-2 top-1/3 bg-secondary/80 text-muted text-xs px-2 py-1 rounded-full animate-pulse pointer-events-none">
            <ChevronRight className="h-4 w-4 inline" /> scroll
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 text-xs text-muted">
        <span>Less</span>
        {colors.map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}