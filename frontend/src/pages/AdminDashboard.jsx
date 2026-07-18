import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { Shield, Users, FileText, Code, CheckCircle, Ban, ShieldCheck, Heart, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/admin/dashboard');
        setData(res.data.data || res.data);
      } catch (err) {
        console.error('Admin fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="w-5 h-5 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Active Learners', value: data?.totalUsers || 0, icon: Users, desc: 'Happy coding minds' },
    { label: 'Total Challenges', value: data?.totalProblems || 0, icon: FileText, desc: 'Created for growth' },
    { label: 'Code Runs', value: data?.totalSubmissions || 0, icon: Code, desc: 'Attempts at learning' },
    { label: 'Success Moments', value: data?.acceptedSubmissions || 0, icon: CheckCircle, desc: 'Passed with flying colors' },
  ];

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-8 py-12 text-zinc-300 font-sans antialiased selection:bg-space-blue/10 selection:text-space-blue">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Friendly & Inviting Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-space-blue" />
              <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                Welcome back, Admin! <Sparkles className="h-4 w-4 text-amber-400 inline animate-pulse" />
              </h1>
            </div>
            <p className="text-xs text-zinc-500">
              Here is a quick look at how your wonderful platform and community are doing today.
            </p>
          </div>
          <div className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-900 px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Platform Active
          </div>
        </div>

        {/* Vibrant Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div 
                key={idx} 
                className="bg-[#050507] border border-zinc-900 hover:border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-zinc-400 font-medium group-hover:text-zinc-300 transition-colors">
                    {card.label}
                  </span>
                  <Icon className="h-4 w-4 text-zinc-600 group-hover:text-space-blue transition-colors" />
                </div>
                <div className="mt-4 space-y-0.5">
                  <div className="text-2xl font-semibold tracking-tight text-white">
                    {card.value.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-zinc-500 italic">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Analytics & User Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Platform Pulse & Success Ratios */}
          <div className="lg:col-span-1 border border-zinc-900 rounded-xl bg-[#050507] p-6 flex flex-col justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Heart className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm font-medium text-white">
                  Platform Pulse
                </h2>
              </div>
              <p className="text-xs text-zinc-500">A beautiful overview of problem distributions.</p>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Community Acceptance Rate</span>
                  <span className="text-space-blue font-semibold">{data?.acceptanceRate || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900/40">
                  <div 
                    className="h-full bg-space-blue transition-all duration-500 rounded-full" 
                    style={{ width: `${data?.acceptanceRate || 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-900/60 space-y-2">
                <span className="text-xs font-medium text-zinc-400 block">
                  Challenges by Level
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-lg text-center">
                    <div className="text-emerald-400 font-semibold">{data?.problems?.easy || 0}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Easy going</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-lg text-center">
                    <div className="text-amber-400 font-semibold">{data?.problems?.medium || 0}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Balanced</div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 p-2 rounded-lg text-center">
                    <div className="text-rose-400 font-semibold">{data?.problems?.hard || 0}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Tough ones</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Member Profiles */}
          <div className="lg:col-span-2 border border-zinc-900 rounded-xl bg-[#050507] overflow-hidden flex flex-col justify-between">
            <div className="px-5 py-4 bg-zinc-950/40 border-b border-zinc-900 flex justify-between items-center">
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-white">
                  Our Newest Members
                </h3>
                <p className="text-xs text-zinc-500">Say hello to the creators who recently joined us!</p>
              </div>
              <span className="text-[10px] font-medium text-zinc-400 bg-zinc-900/60 px-2.5 py-1 rounded-full border border-zinc-855">
                Showing top 5
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/10 text-xs text-zinc-500">
                    <th className="py-2.5 px-5 font-medium">User Profile</th>
                    <th className="py-2.5 px-5 font-medium w-28">Permission</th>
                    <th className="py-2.5 px-5 font-medium w-28 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 text-xs">
                  {data?.users?.slice(0, 5).map((u, idx) => (
                    <tr 
                      key={u._id || idx} 
                      className="group hover:bg-[#08080b]/60 transition-colors duration-150"
                    >
                      {/* Name & Mail Column Block */}
                      <td className="py-3 px-5">
                        <div className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                          {u.name || 'Friendly Coder'}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {u.email || '—'}
                        </div>
                      </td>

                      {/* User Role */}
                      <td className="py-3 px-5 text-zinc-400 text-xs capitalize">
                        {u.role || 'Member'}
                      </td>

                      {/* Soft Status Indicators */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {u.isBanned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2.5 py-0.5 rounded-full">
                            <Ban className="h-2.5 w-2.5" /> Paused
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="h-2.5 w-2.5" /> Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!data?.users || data.users.length === 0) && (
                    <tr>
                      <td colSpan="3" className="text-center py-10 text-xs text-zinc-500">
                        No member records available right now.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}