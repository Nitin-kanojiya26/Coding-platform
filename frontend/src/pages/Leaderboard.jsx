import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Trophy, Crown, Medal, ArrowUpRight, CheckCircle2, Layers, Zap } from 'lucide-react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get('/leaderboard');
        // Standardize data injection matching structural layout array payload fallback
        setRankings(res.data.leaderboard || res.data || []);
      } catch (err) {
        console.error('[SYS_ERR]: Leaderboard compilation exception:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0c]">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 border-2 border-zinc-800/60 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-sky-400 border-r-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const getPodiumStyles = (rank) => {
    if (rank === 1) return {
      icon: <Crown className="h-4 w-4 text-amber-400 fill-amber-400/10" />,
      glow: 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      textAccent: 'text-amber-400'
    };
    if (rank === 2) return {
      icon: <Medal className="h-4 w-4 text-slate-300 fill-slate-300/10" />,
      glow: 'border-slate-400/20 bg-gradient-to-b from-slate-400/5 to-transparent',
      badge: 'bg-slate-400/10 text-slate-300 border border-slate-400/20',
      textAccent: 'text-slate-300'
    };
    if (rank === 3) return {
      icon: <Medal className="h-4 w-4 text-amber-700 fill-amber-700/10" />,
      glow: 'border-amber-700/20 bg-gradient-to-b from-amber-700/5 to-transparent',
      badge: 'bg-amber-700/10 text-amber-600 border border-amber-700/20',
      textAccent: 'text-amber-600'
    };
    return {
      icon: <span className="text-[11px] text-zinc-500 font-bold font-mono">{rank}</span>,
      glow: 'border-zinc-900 bg-zinc-950/40',
      badge: 'bg-zinc-900 text-zinc-400 border border-zinc-800',
      textAccent: 'text-zinc-400'
    };
  };

  const topThree = rankings.slice(0, 3);
  const remainingRankings = rankings.slice(3);

  return (
    <div className="min-h-screen bg-[#0a0a0c] px-4 sm:px-6 py-12 text-zinc-400 font-sans antialiased selection:bg-sky-500/10 selection:text-sky-400">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Workspace Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-zinc-900">
          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]" /> 
              Global Registry <span className="text-zinc-600 font-mono font-normal text-xs uppercase tracking-widest mt-1">// Core.v1</span>
            </h1>
            <p className="text-xs text-zinc-500 max-w-xl">
              Real-time platform performance tracking ranking the global community's top algorithmic minds and system problem solvers.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center bg-zinc-950 border border-zinc-900 px-3.5 py-1.5 rounded-xl">
            <Zap className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-xs font-mono font-bold text-zinc-300 tracking-wide">
              {rankings.length} NODES ACTIVE
            </span>
          </div>
        </div>

        {rankings.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono tracking-wide border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
            [SYS_ERR]: No metrics compiled. Submit instances to build data.
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Visual Podium Showcase Area (Top 3 Cards) */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {[topThree[1], topThree[0], topThree[2]].map((userProfile, idx) => {
                  if (!userProfile) return null;
                  
                  const exactIndex = idx === 0 ? 1 : idx === 1 ? 0 : 2;
                  const rank = exactIndex + 1;
                  const styles = getPodiumStyles(rank);
                  const rate = parseFloat(userProfile.acceptanceRate || 0);

                  // FIX: Extracts correct parameters dynamically tracking _id parameter fallback syntax
                  const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;
                  
                  return (
                    <Link
                      to={`/profile/${targetProfileId}`}
                      key={targetProfileId || exactIndex}
                      className={`group relative border rounded-2xl p-5 transition-all duration-300 flex flex-col items-center text-center gap-4 hover:border-zinc-700/80 bg-zinc-950/20 hover:bg-zinc-950/60 block ${styles.glow} ${
                        rank === 1 ? 'md:py-8 md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-10' : 'z-0'
                      }`}
                    >
                      <div className={`h-6 px-3 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${styles.badge}`}>
                        {styles.icon} Rank {rank}
                      </div>

                      <div className="relative mt-2">
                        <img
                          src={userProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.username || userProfile.name}`}
                          alt={userProfile.username || userProfile.name}
                          className="h-14 w-14 rounded-2xl border border-zinc-800 object-cover bg-black p-0.5 shadow-md group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </span>
                      </div>

                      <div className="space-y-0.5 max-w-full">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-sky-400 transition-colors block truncate px-2">
                          {userProfile.username || userProfile.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest block">
                          Verified Handler
                        </span>
                      </div>

                      <div className="w-full border-t border-zinc-900/60 my-1" />

                      <div className="grid grid-cols-3 w-full gap-2">
                        <div className="bg-zinc-950/50 border border-zinc-900/40 p-2 rounded-xl">
                          <span className="text-[9px] text-zinc-600 block uppercase font-mono tracking-wider">Solved</span>
                          <span className="text-xs font-bold text-zinc-200 font-mono mt-0.5 block">{userProfile.problemsSolved || 0}</span>
                        </div>
                        <div className="bg-zinc-950/50 border border-zinc-900/40 p-2 rounded-xl">
                          <span className="text-[9px] text-zinc-600 block uppercase font-mono tracking-wider">Logs</span>
                          <span className="text-xs font-bold text-zinc-400 font-mono mt-0.5 block">{userProfile.acceptedSubmissions || 0}</span>
                        </div>
                        <div className="bg-zinc-950/50 border border-zinc-900/40 p-2 rounded-xl">
                          <span className="text-[9px] text-zinc-600 block uppercase font-mono tracking-wider">Acc</span>
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

            {/* General Roster Index List View (Ranks 4+) */}
            {remainingRankings.length > 0 && (
              <div className="space-y-3">
                {/* Desktop Column Header */}
                <div className="px-4 text-[10px] font-mono tracking-widest text-zinc-600 uppercase hidden sm:grid sm:grid-cols-12 gap-4">
                  <div className="col-span-1">Pos</div>
                  <div className="col-span-5">Identity Profile</div>
                  <div className="col-span-2 text-right">Solved</div>
                  <div className="col-span-2 text-right">Total Logs</div>
                  <div className="col-span-2 text-right">Accuracy</div>
                </div>

                {/* Flat, Clean Responsive Grid Rows */}
                <div className="space-y-2">
                  {remainingRankings.map((userProfile, index) => {
                    const rank = index + 4;
                    const styles = getPodiumStyles(rank);
                    const solved = userProfile.problemsSolved || 0;
                    const totalSubmissions = userProfile.acceptedSubmissions || 0;
                    const rate = parseFloat(userProfile.acceptanceRate || 0);

                    // FIX: Appends matching tracking keys
                    const targetProfileId = userProfile._id || userProfile.userId || userProfile.id;

                    return (
                      <Link
                        to={`/profile/${targetProfileId}`}
                        key={targetProfileId || index}
                        className="group bg-[#070709] border border-zinc-900/80 hover:border-zinc-800/80 rounded-xl p-3.5 transition-all duration-150 grid grid-cols-12 items-center gap-4 hover:bg-zinc-950/40"
                      >
                        {/* 1. Position Token */}
                        <div className="col-span-1 flex items-center">
                          <div className={`h-6 w-6 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 ${styles.badge}`}>
                            {styles.icon}
                          </div>
                        </div>

                        {/* 2. Identity Profile */}
                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                          <img
                            src={userProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.username || userProfile.name}`}
                            alt={userProfile.username || userProfile.name}
                            className="h-8 w-8 rounded-xl object-cover bg-black border border-zinc-900 p-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-sky-400 transition-colors block truncate">
                              {userProfile.username || userProfile.name}
                            </span>
                          </div>
                        </div>

                        {/* 3. Solved Metric */}
                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
                          <span className="text-xs font-bold text-zinc-200 font-mono">{solved}</span>
                        </div>

                        {/* 4. Total Logs */}
                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <Layers className="h-3 w-3 text-zinc-700" />
                          <span className="text-xs font-semibold text-zinc-400 font-mono">{totalSubmissions}</span>
                        </div>

                        {/* 5. Accuracy Rate */}
                        <div className="col-span-2 flex justify-end items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-300 font-mono">{rate.toFixed(1)}%</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-sky-400 transition-all duration-200 ml-1" />
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