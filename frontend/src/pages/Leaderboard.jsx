import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Trophy, Crown, Medal, ArrowUpRight, CheckCircle2, Layers, Users, Sparkles, Cpu } from 'lucide-react';
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
      className={`relative flex items-center justify-center bg-[#121212] border border-white/10 font-bold select-none overflow-hidden shrink-0 ${className}`}
    >
      <span
        className="font-mono text-white tracking-tight text-[11px] leading-none"
        style={{
          textShadow: `
            -1px -0.5px 0px rgba(56, 189, 248, 0.8), 
             1px  0.5px 0px rgba(249, 115, 22, 0.8)
          `,
        }}
      >
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
      className={`${className} object-cover bg-primary p-0.5 border border-light shadow-md`}
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
  strokeColor = "#38bdf8", 
  fillColor = "#38bdf8",
  isDark = true 
}) {
  // Normalize values (0-100 scale) for balanced polygon plotting
  const normSolved = Math.min(Math.round((solved / maxSolved) * 100), 100);
  const normTries = Math.min(Math.round((tries / maxTries) * 100), 100);
  const normAcc = Math.min(Math.round(accuracy), 100);
  const normEff = Math.min(Math.round((normAcc + normSolved) / 2), 100);
  const normVol = Math.min(Math.round((normTries + normSolved) / 2), 100);

  const radarData = [
    { subject: 'ACC', value: normAcc, raw: `${accuracy.toFixed(1)}%` },
    { subject: 'SOLVED', value: normSolved, raw: solved },
    { subject: 'TRIES', value: normTries, raw: tries },
    { subject: 'VOLUME', value: normVol, raw: `${normVol} pts` },
    { subject: 'EFF', value: normEff, raw: `${normEff}%` },
  ];

  return (
    // Reduced height from h-40 to h-28 for a more compact radar footprint
    <div className="w-full h-28 relative flex items-center justify-center my-0.5">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
          <PolarGrid 
            stroke={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)"} 
            strokeDasharray="2 2" 
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ 
              fill: isDark ? '#a1a1aa' : '#475569', 
              fontSize: 8, 
              fontFamily: 'monospace',
              fontWeight: 600 
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-[10px] font-mono shadow-md backdrop-blur-md">
                    <span className="text-slate-500 dark:text-slate-400">{data.subject}: </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{data.raw}</span>
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
            fillOpacity={isDark ? 0.25 : 0.35}
            strokeWidth={1.5}
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
          <div className="w-10 h-10 border-2 border-base border-t-accent rounded-full animate-spin" />
          <Cpu className="absolute w-4 h-4 text-accent animate-pulse" />
        </div>
      </div>
    );
  }

  const maxSolved = Math.max(...rankings.map(r => r.problemsSolved || 0), 1);
  const maxTries = Math.max(...rankings.map(r => r.acceptedSubmissions || 0), 1);

  const topThree = rankings.slice(0, 3);
  const remainingRankings = rankings.slice(3);

  const getPodiumStyles = (rank) => {
    if (rank === 1) return {
      icon: <Crown className="h-4 w-4 text-amber-400 fill-amber-400/10" />,
      glow: 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      textAccent: 'text-amber-400',
      chartColor: '#f59e0b'
    };
    if (rank === 2) return {
      icon: <Medal className="h-4 w-4 text-slate-300 fill-slate-300/10" />,
      glow: 'border-slate-400/20 bg-gradient-to-b from-slate-400/5 to-transparent',
      badge: 'bg-slate-400/10 text-slate-300 border border-slate-400/20',
      textAccent: 'text-slate-300',
      chartColor: '#cbd5e1'
    };
    if (rank === 3) return {
      icon: <Medal className="h-4 w-4 text-amber-700 fill-amber-700/10" />,
      glow: 'border-amber-700/20 bg-gradient-to-b from-amber-700/5 to-transparent',
      badge: 'bg-amber-700/10 text-amber-600 border border-amber-700/20',
      textAccent: 'text-amber-600',
      chartColor: '#d97706'
    };
    return {
      icon: <span className="text-[11px] text-muted font-bold font-mono">{rank}</span>,
      glow: 'border-base bg-secondary/40',
      badge: 'bg-secondary text-muted border border-base',
      textAccent: 'text-muted',
      chartColor: '#38bdf8'
    };
  };

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-6 py-12 text-muted font-sans antialiased selection:bg-accent/10 selection:text-accent">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Workspace Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-base">
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-primary tracking-tight flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-accent drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" /> 
              Leaderboard <span className="text-muted font-mono font-normal text-xs uppercase tracking-widest mt-1">// Top Performers</span>
            </h1>
            <p className="text-xs text-muted max-w-xl">
              Celebrating top problem solvers and active community members based on their multi-dimensional performance metrics.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center bg-secondary border border-base px-3.5 py-1.5 rounded-xl">
            <Users className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-mono font-bold text-secondary tracking-wide">
              {rankings.length} ACTIVE MEMBERS
            </span>
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="py-20 text-center text-muted text-xs font-mono tracking-wide border border-dashed border-base rounded-2xl bg-card/20">
            No rankings available yet. Solve problems to join the leaderboard!
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Podium Area with Radar Charts for Top 3 */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
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
                  
                  return (
                    <Link
                      to={`/profile/${targetProfileId}`}
                      key={targetProfileId || exactIndex}
                      className={`group relative border rounded-2xl p-4 transition-all duration-300 flex flex-col items-center text-center gap-3 hover:border-light/80 bg-card/20 hover:bg-card/60 block ${styles.glow} ${
                        rank === 1 ? 'md:py-6 md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-10' : 'z-0'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`h-6 px-3 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${styles.badge}`}>
                        {styles.icon} Rank {rank}
                      </div>

                      {/* User Info & Enlarged Avatar */}
                      <div className="flex items-center gap-3.5 w-full px-2 my-1 text-left">
                        <div className="relative shrink-0">
                          <LeaderboardAvatar
                            avatar={userProfile.avatar}
                            name={displayName}
                            className="h-14 w-14 rounded-2xl group-hover:scale-105 transition-transform duration-200"
                          />
                          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-primary" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="text-base font-bold text-secondary group-hover:text-accent transition-colors block truncate">
                            {displayName}
                          </span>
                          <span className="text-[10px] font-mono text-muted uppercase tracking-widest flex items-center gap-1 mt-0.5">
                            <Sparkles className="h-2.5 w-2.5 text-accent" /> High Accuracy
                          </span>
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

                      <div className="w-full border-t border-base/60 my-0.5" />

                      {/* Quick Metrics */}
                      <div className="grid grid-cols-3 w-full gap-1.5">
                        <div className="bg-secondary/50 border border-base/40 p-1.5 rounded-xl">
                          <span className="text-[8px] text-muted block uppercase font-mono tracking-wider">Solved</span>
                          <span className="text-xs font-bold text-secondary font-mono mt-0.5 block">{solved}</span>
                        </div>
                        <div className="bg-secondary/50 border border-base/40 p-1.5 rounded-xl">
                          <span className="text-[8px] text-muted block uppercase font-mono tracking-wider">Tries</span>
                          <span className="text-xs font-bold text-muted font-mono mt-0.5 block">{tries}</span>
                        </div>
                        <div className="bg-secondary/50 border border-base/40 p-1.5 rounded-xl">
                          <span className="text-[8px] text-muted block uppercase font-mono tracking-wider">Accuracy</span>
                          <span className={`text-xs font-black font-mono mt-0.5 block ${styles.textAccent}`}>
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
              <div className="space-y-3">
                <div className="px-4 text-[10px] font-mono tracking-widest text-muted uppercase hidden sm:grid sm:grid-cols-12 gap-4">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-5">Member</div>
                  <div className="col-span-2 text-right">Solved</div>
                  <div className="col-span-2 text-right">Total Tries</div>
                  <div className="col-span-2 text-right">Accuracy</div>
                </div>

                <div className="space-y-2">
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
                        className="group bg-card/20 border border-base/80 hover:border-light/80 rounded-xl p-3.5 transition-all duration-150 grid grid-cols-12 items-center gap-4 hover:bg-card/40"
                      >
                        <div className="col-span-1 flex items-center">
                          <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 ${styles.badge}`}>
                            {styles.icon}
                          </div>
                        </div>

                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                          <LeaderboardAvatar
                            avatar={userProfile.avatar}
                            name={displayName}
                            className="h-9 w-9 rounded-xl shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-secondary group-hover:text-accent transition-colors block truncate">
                              {displayName}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
                          <span className="text-xs font-bold text-secondary font-mono">{solved}</span>
                        </div>

                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <Layers className="h-3 w-3 text-muted" />
                          <span className="text-xs font-semibold text-muted font-mono">{totalSubmissions}</span>
                        </div>

                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <span className="text-xs font-bold text-secondary font-mono">{rate.toFixed(1)}%</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-accent transition-all duration-200 ml-1" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}