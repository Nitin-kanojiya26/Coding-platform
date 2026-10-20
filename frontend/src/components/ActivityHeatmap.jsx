import React, { useRef, useEffect, useMemo } from 'react';
import { Calendar } from 'lucide-react';

/**
 * LeetCode-Style Submission / Activity Calendar
 * - Flat, compact, information-dense
 * - No decorative cards, gradients, or heavy borders
 * - Authentic LeetCode color levels
 */
export default function ActivityHeatmap({
  submissions = [],
  loginDates = [],
  mode = 'auto' // 'auto' | 'submission' | 'login'
}) {
  const scrollRef = useRef(null);

  // Aggregate daily counts across both submissions and login events
  const dailyCounts = useMemo(() => {
    const counts = {};

    // In 'auto' or 'submission' mode, map submissions
    if (mode === 'auto' || mode === 'submission') {
      submissions.forEach((s) => {
        if (!s.submittedAt) return;
        const key = new Date(s.submittedAt).toISOString().split('T')[0];
        counts[key] = (counts[key] || 0) + 1;
      });
    }

    // In 'auto' or 'login' mode, ensure login dates are registered (at least 1 activity)
    if (mode === 'auto' || mode === 'login') {
      loginDates.forEach((d) => {
        const key = typeof d === 'string' ? d.split('T')[0] : new Date(d).toISOString().split('T')[0];
        if (!counts[key]) counts[key] = 1;
      });
    }

    return counts;
  }, [submissions, loginDates, mode]);

  // Compute 12 past months
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
    const count = dailyCounts[key] || 0;
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  // Authentic LeetCode submission calendar palette
  const colors = [
    'bg-surface-raised/40 border border-border/20', // Level 0: empty
    'bg-[#0e4429] border border-[#006d32]/20',      // Level 1: light emerald
    'bg-[#006d32] border border-[#26a641]/20',      // Level 2: medium emerald
    'bg-[#26a641] border border-[#39d353]/20',      // Level 3: bright emerald
    'bg-[#2cbb5d] border border-emerald-400/30',     // Level 4: vibrant LeetCode emerald
  ];

  const { totalDays, maxStreak, totalActivities } = useMemo(() => {
    const activeDateKeys = Object.keys(dailyCounts).sort();
    const total = activeDateKeys.length;
    let totalActs = 0;
    activeDateKeys.forEach((k) => {
      totalActs += dailyCounts[k];
    });

    let streak = 0;
    let maxS = 0;
    let prev = null;
    for (const d of activeDateKeys) {
      const cur = new Date(d);
      if (prev === null) {
        streak = 1;
      } else {
        const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
        streak = diff === 1 ? streak + 1 : 1;
      }
      prev = cur;
      maxS = Math.max(maxS, streak);
    }
    return { totalDays: total, maxStreak: maxS, totalActivities: totalActs };
  }, [dailyCounts]);

  // Scroll to latest days automatically
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  return (
    <div className="space-y-2">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <span className="font-mono font-medium text-text">{totalActivities}</span>
          <span className="text-text-muted">submissions in the past year</span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-text-muted">
          <span>
            Total active days: <strong className="text-text font-mono">{totalDays}</strong>
          </span>
          <span className="text-border/80">•</span>
          <span>
            Max streak: <strong className="text-text font-mono">{maxStreak}</strong> days
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-3 min-w-max py-1">
          {monthsData.map((monthBlock, mIdx) => (
            <div key={mIdx} className="flex flex-col items-center">
              <div className="grid grid-rows-7 grid-flow-col gap-1">
                {monthBlock.days.map((date, dIdx) => {
                  const level = getIntensity(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const key = date.toISOString().split('T')[0];
                  const count = dailyCounts[key] || 0;

                  return (
                    <div
                      key={dIdx}
                      className={`w-2.5 h-2.5 rounded-[2px] ${colors[level]} transition-all duration-150 hover:brightness-125 cursor-default ${
                        isToday ? 'ring-1 ring-text/50' : ''
                      }`}
                      title={`${date.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}: ${count} submission${count === 1 ? '' : 's'}`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] text-text-muted font-mono mt-1.5 select-none">
                {monthBlock.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-text-muted pt-0.5">
        <span>Less</span>
        {colors.map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}