import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { Trophy, Medal, Loader2, Crown } from 'lucide-react';

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await API.get('/leaderboard');
        setRankings(res.data.leaderboard || res.data || []);
      } catch (err) {
        console.error('Leaderboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-amber-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-slate-500 font-mono font-bold">#{rank}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Global Leaderboard</h1>
        <span className="text-sm text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {rankings.length} users
        </span>
      </div>

      {rankings.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-slate-800 rounded-2xl bg-slate-900/20">
          <p>No users ranked yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Solved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Accepted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Acceptance Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rankings.map((user, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={user.userId || index}
                    className="hover:bg-slate-800/30 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">{getRankIcon(rank)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                          alt={user.username}
                          className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                        />
                        <span className="font-medium text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.problemsSolved || 0}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{user.acceptedSubmissions || 0}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-cyan-400">
                        {parseFloat(user.acceptanceRate || 0).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}