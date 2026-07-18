import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { Trophy, Crown, Medal, ArrowUpRight, CheckCircle2, Percent, Layers } from 'lucide-react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get('/leaderboard');
        setRankings(res.data.leaderboard || res.data || []);
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="w-6 h-6 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
      </div>
    );
  }

  // Curated elegant styles for top positions
  const getPodiumStyles = (rank) => {
    if (rank === 1) return {
      icon: <Crown className="h-4 w-4 text-amber-400 fill-amber-400/10" />,
      avatarGlow: 'ring-2 ring-amber-500/30 bg-amber-500/5',
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      barColor: 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
    };
    if (rank === 2) return {
      icon: <Medal className="h-4 w-4 text-slate-300 fill-slate-300/10" />,
      avatarGlow: 'ring-2 ring-slate-400/20 bg-slate-400/5',
      badge: 'bg-slate-400/10 text-slate-300 border border-slate-400/20',
      barColor: 'bg-gradient-to-r from-slate-400 to-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.15)]'
    };
    if (rank === 3) return {
      icon: <Medal className="h-4 w-4 text-amber-700 fill-amber-700/10" />,
      avatarGlow: 'ring-2 ring-amber-700/20 bg-amber-700/5',
      badge: 'bg-amber-700/10 text-amber-600 border border-amber-700/20',
      barColor: 'bg-gradient-to-r from-amber-700 to-amber-600 shadow-[0_0_12px_rgba(180,83,9,0.15)]'
    };
    return {
      icon: <span className="text-xs text-zinc-500 font-medium font-mono">{rank}</span>,
      avatarGlow: 'ring-1 ring-zinc-800',
      badge: 'bg-zinc-900 text-zinc-400 border border-zinc-800',
      barColor: 'bg-space-blue shadow-[0_0_10px_rgba(56,189,248,0.2)]'
    };
  };

  // Find the highest number of problems solved to calculate relative percentage dynamically
  const highestSolved = rankings.length > 0 ? Math.max(...rankings.map(u => u.problemsSolved || 1)) : 1;

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-6 py-12 text-zinc-400 font-sans antialiased selection:bg-space-blue/10 selection:text-space-blue">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Simple & Clean Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-900">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" /> Global Rankings
            </h1>
            <p className="text-xs text-zinc-500">
              Celebrating our community's top problem solvers and code minds.
            </p>
          </div>
          <span className="text-[11px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
            {rankings.length} members
          </span>
        </div>

        {rankings.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm border border-zinc-900 rounded-2xl bg-[#050507]">
            No rankings recorded yet. Keep submitting!
          </div>
        ) : (
          /* Smooth Human-First List Layout */
          <div className="space-y-3">
            {rankings.map((userProfile, index) => {
              const rank = index + 1;
              const styles = getPodiumStyles(rank);
              const solved = userProfile.problemsSolved || 0;
              const totalSubmissions = userProfile.acceptedSubmissions || 0;
              const rate = parseFloat(userProfile.acceptanceRate || 0);

              // Proportional width relative to the maximum problems solved on the platform (min width 5% for visibility)
              const dynamicBarPercentage = Math.max(5, (solved / highestSolved) * 100);

              return (
                <div
                  key={userProfile.userId || index}
                  className="group relative bg-[#070709] border border-zinc-900 hover:border-zinc-800/80 rounded-xl p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left Side: Position, Member Identity, and Dynamic Bar */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Position Token */}
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-medium flex-shrink-0 ${styles.badge}`}>
                      {styles.icon}
                    </div>

                    {/* Avatar Container */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={userProfile.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.username}`}
                        alt={userProfile.username}
                        className={`h-9 w-9 rounded-xl object-cover p-0.5 transition-transform duration-200 group-hover:scale-[1.02] ${styles.avatarGlow}`}
                      />
                    </div>

                    {/* User Profile Information & Dynamic Visual Bar */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors block truncate">
                        {userProfile.username}
                      </span>
                      
                      {/* Dynamic Proportional Progress Bar */}
                      <div className="h-1 w-full max-w-[180px] bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${styles.barColor}`}
                          style={{ width: `${dynamicBarPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Side: High-Visibility Performance Analytics */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 flex-shrink-0 pt-3 sm:pt-0 border-t border-zinc-900 sm:border-t-0">
                    
                    {/* Metric 1: Solved Counter */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/80 hidden xs:block" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-medium">
                          Solved
                        </span>
                        <span className="text-sm font-semibold text-zinc-100 mt-0.5 block font-mono">
                          {solved}
                        </span>
                      </div>
                    </div>

                    {/* Metric 2: Submission Log Counter */}
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-zinc-600 hidden xs:block" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-medium">
                          Submissions
                        </span>
                        <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-200 transition-colors mt-0.5 block font-mono">
                          {totalSubmissions}
                        </span>
                      </div>
                    </div>

                    {/* Metric 3: Accuracy Percentage */}
                    <div className="flex items-center gap-2 min-w-[70px]">
                      <Percent className="h-3.5 w-3.5 text-space-blue/80 hidden xs:block" />
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-medium">
                          Accuracy
                        </span>
                        <span className={`text-sm font-bold mt-0.5 block font-mono ${
                          rank <= 3 ? 'text-space-blue' : 'text-zinc-300'
                        }`}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Subtle Interactive Hover indicator */}
                    <ArrowUpRight className="h-4 w-4 text-zinc-700 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-zinc-400 transition-all duration-200 hidden md:block" />

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}