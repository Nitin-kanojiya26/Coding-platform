import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Trophy, Crown, Medal, ArrowUpRight, CheckCircle2, Layers, Users, Sparkles, Cpu, Target } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { getAvatarSrc } from '../utils/avatar';

// ─── Helper to derive 1-2 initial letters ──────────────────────
const getInitials = (name) => {
  if (!name) return 'U';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ─── Crisp Initials Avatar Badge ───────────────────────────────
function InitialsAvatar({ name, className = "w-8 h-8 text-xs" }) {
  const initials = getInitials(name);
  return (
    <div
      className={`relative flex items-center justify-center bg-secondary border border-base font-bold select-none overflow-hidden shrink-0 shadow-inner ${className}`}
    >
      <span className="font-sans text-primary tracking-tight leading-none">
        {initials}
      </span>
    </div>
  );
}

// ─── Avatar Wrapper with Image Error Handling ──────────────────
function LeaderboardAvatar({ avatar, name, className }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = getAvatarSrc(avatar);
  const hasAvatar = Boolean(avatar && !imgError);

  if (!hasAvatar) {
    return <InitialsAvatar name={name} className={className} />;
  }

  return (
    <img
      src={avatarSrc}
      alt={name || 'User avatar'}
      className={`${className} object-cover p-0.5 border border-base bg-primary shadow-md`}
      onError={() => setImgError(true)}
    />
  );
}

// ─── Compact, Theme-Aware Radar / Spider HUD Chart ──────────
function TacticalRadarHud({ 
  solved, 
  tries, 
  accuracy, 
  maxSolved, 
  maxTries, 
  strokeColor, 
  fillColor,
  isDark
}) {
  const normSolved = Math.min(Math.round((solved / Math.max(maxSolved, 1)) * 100), 100);
  const normTries = Math.min(Math.round((tries / Math.max(maxTries, 1)) * 100), 100);
  const normAcc = Math.min(Math.round(accuracy), 100);
  const normEff = Math.min(Math.round((normAcc + normSolved) / 2), 100);
  const normVol = Math.min(Math.round((normTries + normSolved) / 2), 100);

  const radarData = [
    { subject: 'SUCCESS', value: normAcc, raw: `${accuracy.toFixed(1)}%` },
    { subject: 'COMPLETED', value: normSolved, raw: solved },
    { subject: 'ATTEMPTS', value: normTries, raw: tries },
    { subject: 'ACTIVITY', value: normVol, raw: `${normVol} pt` },
    { subject: 'CONSISTENT', value: normEff, raw: `${normEff}%` },
  ];

  return (
    <div className="w-full h-36 relative flex items-center justify-center my-2 drop-shadow-xl">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
          <PolarGrid 
            stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)"} 
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ 
              fill: isDark ? '#888888' : '#64748b', 
              fontSize: 9, 
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 600 
            }}
          />
          <Tooltip
            cursor={{ stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-card border border-base px-3 py-1.5 rounded-lg text-xs font-sans shadow-xl backdrop-blur-md">
                    <span className="text-muted">{data.subject}: </span>
                    <span className="font-semibold text-primary">{data.raw}</span>
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar
            name="Metrics"
            dataKey="value"
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);

  // Check dark/light mode dynamically from the HTML element class
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get('/leaderboard');
        setRankings(res.data.leaderboard || res.data || []);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-base border-t-transparent accent-bg rounded-full animate-spin" style={{ borderTopColor: 'var(--color-accent)' }} />
          <Cpu className="absolute w-5 h-5 accent animate-pulse" />
        </div>
      </div>
    );
  }

  const maxSolved = Math.max(...rankings.map(r => r.problemsSolved || 0), 1);
  const maxTries = Math.max(...rankings.map(r => r.acceptedSubmissions || 0), 1);

  const topThree = rankings.slice(0, 3);
  const remainingRankings = rankings.slice(3);

  const defaultChartColor = isDark ? "#ffffff" : "#0f172a"; // Adapts to theme accent

  const getPodiumStyles = (rank) => {
    if (rank === 1) return {
      icon: <Crown className="h-5 w-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" />,
      glow: 'border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-[0_0_30px_-5px_rgba(234,179,8,0.15)]',
      badge: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30',
      textAccent: 'text-yellow-600 dark:text-yellow-500',
      chartColor: '#eab308' // yellow-500
    };
    if (rank === 2) return {
      icon: <Medal className="h-5 w-5 text-slate-400 dark:text-slate-300 drop-shadow-[0_0_8px_rgba(148,163,184,0.6)]" />,
      glow: 'border-slate-400/30 bg-gradient-to-b from-slate-400/10 to-transparent shadow-[0_0_30px_-5px_rgba(148,163,184,0.1)]',
      badge: 'bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30',
      textAccent: 'text-slate-600 dark:text-slate-300',
      chartColor: '#94a3b8' // slate-400
    };
    if (rank === 3) return {
      icon: <Medal className="h-5 w-5 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />,
      glow: 'border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent shadow-[0_0_30px_-5px_rgba(249,115,22,0.1)]',
      badge: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30',
      textAccent: 'text-orange-600 dark:text-orange-500',
      chartColor: '#f97316' // orange-500
    };
    return {
      icon: <span className="text-sm text-primary font-bold">{rank}</span>,
      badge: 'bg-secondary text-primary border border-base',
    };
  };

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-6 py-12 text-primary font-sans antialiased">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-base">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-base text-primary text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5 accent" /> Hall of Fame
            </div>
            <h1 className="text-3xl font-black text-primary tracking-tight flex items-center gap-3">
              Global Leaderboard
            </h1>
            <p className="text-sm text-muted max-w-xl">
              Recognizing the top dedicated learners and creative minds in the community.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-secondary border border-base px-4 py-2 rounded-2xl backdrop-blur-sm">
            <div className="p-1.5 accent-bg rounded-lg text-primary">
              <Users className="h-4 w-4" style={{ color: 'var(--color-bg-primary)' }} />
            </div>
            <div>
              <div className="text-xs text-muted font-medium">Active Members</div>
              <div className="text-sm font-bold text-primary leading-none mt-0.5">{rankings.length}</div>
            </div>
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center border border-dashed border-base rounded-3xl bg-secondary/50">
            <Trophy className="h-12 w-12 text-muted mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-1">No rankings yet</h3>
            <p className="text-muted text-sm">Solve challenges to claim your spot on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-16">
            
            {/* Premium Podium for Top 3 */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                {[topThree[1], topThree[0], topThree[2]].map((userProfile, idx) => {
                  if (!userProfile) return null;
                  
                  const exactIndex = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                  const rank = exactIndex + 1;
                  const styles = getPodiumStyles(rank);
                  const solved = userProfile.problemsSolved || 0;
                  const tries = userProfile.acceptedSubmissions || 0;
                  const rate = parseFloat(userProfile.acceptanceRate || 0);

                  const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;
                  const displayName = userProfile.username || userProfile.name;
                  
                  // Central gold card should be larger/higher
                  const isFirst = rank === 1;

                  return (
                    <Link
                      to={`/profile/${targetProfileId}`}
                      key={targetProfileId || exactIndex}
                      className={`group relative rounded-[2rem] p-6 transition-all duration-300 flex flex-col items-center text-center gap-4 border bg-card hover:-translate-y-2 backdrop-blur-xl ${styles.glow} ${
                        isFirst ? 'md:mb-8 md:scale-105 z-10' : 'z-0'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute -top-4 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-lg ${styles.badge}`}>
                        {styles.icon} Rank {rank}
                      </div>

                      {/* User Avatar */}
                      <div className="relative mt-3">
                        <LeaderboardAvatar
                          avatar={userProfile.avatar}
                          name={displayName}
                          className={`${isFirst ? 'h-24 w-24' : 'h-20 w-20'} rounded-full group-hover:scale-105 transition-transform duration-300 ring-4 ring-primary shadow-xl`}
                        />
                      </div>

                      <div className="space-y-1">
                        <h3 className={`text-xl font-bold truncate max-w-[200px] transition-colors ${styles.textAccent}`}>
                          {displayName}
                        </h3>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted font-medium">
                          <Target className="h-3.5 w-3.5" />
                          Top Performer
                        </div>
                      </div>

                      {/* Tactical Spider Radar Chart HUD */}
                      <TacticalRadarHud
                        solved={solved}
                        tries={tries}
                        accuracy={rate}
                        maxSolved={maxSolved}
                        maxTries={maxTries}
                        strokeColor={styles.chartColor}
                        fillColor={styles.chartColor}
                        isDark={isDark}
                      />

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 w-full gap-2 mt-2">
                        <div className="bg-secondary border border-base p-2.5 rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Completed</span>
                          <span className="text-sm font-black text-primary">{solved}</span>
                        </div>
                        <div className="bg-secondary border border-base p-2.5 rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Attempts</span>
                          <span className="text-sm font-black text-primary">{tries}</span>
                        </div>
                        <div className="bg-secondary border border-base p-2.5 rounded-2xl flex flex-col items-center justify-center">
                          <span className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">Success Rate</span>
                          <span className={`text-sm font-black ${styles.textAccent}`}>
                            {rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* General Roster List View (Ranks 4+) */}
            {remainingRankings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-primary px-2 flex items-center gap-2">
                  <Layers className="h-5 w-5 accent" /> All Rankings
                </h3>
                
                <div className="bg-card border border-base rounded-3xl overflow-hidden backdrop-blur-md shadow-sm">
                  {/* Table Header */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-4 border-b border-base text-xs font-semibold tracking-wider text-muted uppercase bg-secondary/50">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-5">Member</div>
                    <div className="col-span-2 text-right">Completed</div>
                    <div className="col-span-2 text-right">Total Attempts</div>
                    <div className="col-span-2 text-right">Success Rate</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y border-base flex flex-col">
                    {remainingRankings.map((userProfile, index) => {
                      const rank = index + 4;
                      const styles = getPodiumStyles(rank);
                      const solved = userProfile.problemsSolved || 0;
                      const totalSubmissions = userProfile.acceptedSubmissions || 0;
                      const rate = parseFloat(userProfile.acceptanceRate || 0);

                      const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;
                      const displayName = userProfile.username || userProfile.name;

                      return (
                        <Link
                          to={`/profile/${targetProfileId}`}
                          key={targetProfileId || index}
                          className="group grid grid-cols-1 sm:grid-cols-12 items-center gap-4 px-6 py-4 hover:bg-hover transition-colors duration-200 border-b border-base last:border-0"
                        >
                          <div className="col-span-1 flex items-center">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold shadow-sm ${styles.badge}`}>
                              {styles.icon}
                            </div>
                          </div>

                          <div className="col-span-5 flex items-center gap-4 min-w-0 mt-3 sm:mt-0">
                            <LeaderboardAvatar
                              avatar={userProfile.avatar}
                              name={displayName}
                              className="h-10 w-10 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-base transition-all"
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-primary accent-hover transition-colors block truncate">
                                {displayName}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 flex justify-between sm:justify-end items-center mt-2 sm:mt-0">
                            <span className="sm:hidden text-xs text-muted">Completed:</span>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-semibold text-primary">{solved}</span>
                            </div>
                          </div>

                          <div className="col-span-2 flex justify-between sm:justify-end items-center mt-1 sm:mt-0">
                            <span className="sm:hidden text-xs text-muted">Attempts:</span>
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-4 w-4 text-muted" />
                              <span className="text-sm font-semibold text-primary">{totalSubmissions}</span>
                            </div>
                          </div>

                          <div className="col-span-2 flex justify-between sm:justify-end items-center mt-1 sm:mt-0">
                            <span className="sm:hidden text-xs text-muted">Success Rate:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-primary">{rate.toFixed(1)}%</span>
                              <ArrowUpRight className="h-4 w-4 text-muted opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 accent-hover transition-all duration-300" />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}