import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export default function ActivityHeatmap({ 
  submissions = [], 
  loginDates = [], 
  mode = 'submission' 
}) {
  const scrollRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  // Parse active days tracking map
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

  // Group the last 12 months dynamically by calendar months
  const monthsData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // We go back 11 months to show a total of 12 complete/rolling months
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      // Determine label
      const monthLabel = targetDate.toLocaleString('default', { month: 'short' });
      
      // Find number of days in this specific month
      // Setting day to 0 of next month returns the last day of current month
      const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
      
      const daysArray = [];
      for (let day = 1; day <= totalDaysInMonth; day++) {
        const d = new Date(year, month, day);
        // Prevent showing future days if evaluating the current ongoing month
        if (d <= today) {
          daysArray.push(d);
        }
      }
      
      data.push({
        label: monthLabel,
        days: daysArray
      });
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

  const loginColors = ['bg-slate-800', 'bg-cyan-500'];
  const submissionColors = [
    'bg-slate-800',
    'bg-emerald-950',
    'bg-emerald-700',
    'bg-emerald-500',
    'bg-emerald-300',
  ];
  const colors = mode === 'login' ? loginColors : submissionColors;

  // Calculate stats based on processed system ranges
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
      {/* Header Panel */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span>{mode === 'login' ? 'Login Activity' : 'Submission Activity'}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Total days: <strong className="text-white">{totalDays}</strong></span>
          <span>Max streak: <strong className="text-orange-400">{maxStreak}</strong></span>
        </div>
      </div>

      <div className="relative">
        <div ref={scrollRef} className="overflow-x-auto overflow-y-visible pb-2 scroll-smooth">
          <div className="flex gap-4 min-w-max px-1">
            
            {/* Map through each individual month container block */}
            {monthsData.map((monthBlock, mIdx) => (
              <div key={mIdx} className="flex flex-col items-center">
                
                {/* Visual Grid for the specific Month arranged in structural columns */}
                {/* Using grid-flow-col creates vertical columns packing 6 blocks deep per column */}
                <div className="grid grid-rows-6 grid-flow-col gap-1">
                  {monthBlock.days.map((date, dIdx) => {
                    const level = getIntensity(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={dIdx}
                        className={`w-3 h-3 rounded-sm ${colors[level]} transition-colors duration-150 hover:ring-2 hover:ring-cyan-400 cursor-default ${isToday ? 'ring-1 ring-cyan-400' : ''}`}
                        title={`${date.toLocaleDateString()}: ${mode === 'login' ? (activeDays.has(date.toISOString().split('T')[0]) ? 'Active' : 'Inactive') : (activeDays[date.toISOString().split('T')[0]] || 0) + ' submissions'}`}
                      />
                    );
                  })}
                </div>

                {/* Bottom label containing the distinct Month shorthand name */}
                <span className="text-[10px] text-slate-500 font-medium mt-2">
                  {monthBlock.label}
                </span>

              </div>
            ))}

          </div>
        </div>

        {showScrollHint && (
          <div className="absolute right-2 top-1/3 bg-slate-900/80 text-slate-400 text-xs px-2 py-1 rounded-full animate-pulse pointer-events-none">
            <ChevronRight className="h-4 w-4 inline" /> scroll
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-slate-500">
        <span>Less</span>
        {colors.map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />)}
        <span>More</span>
      </div>
    </div>
  );
}