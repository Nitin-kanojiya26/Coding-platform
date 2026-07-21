import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Code, Award, TrendingUp, CheckCircle2, 
  ArrowLeft, Calendar, Flame 
} from 'lucide-react';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const [profileRes, statsRes] = await Promise.all([
          API.get(`/users/${id}/profile`),
          API.get(`/users/${id}/stats`)
        ]);
        setProfileData(profileRes.data.user || profileRes.data);
        setStats(statsRes.data.stats || statsRes.data);
      } catch (err) {
        console.error('Public profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPublicData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#000000] flex items-center justify-center"><div className="w-6 h-6 border-2 border-zinc-800 border-t-sky-400 rounded-full animate-spin" /></div>;
  if (!profileData || !stats) return <div className="min-h-screen bg-[#000000] flex items-center justify-center text-zinc-600 font-mono text-xs">[SYS_ERR]: Node unresolvable.</div>;

  const solved = stats.solved || { total: 0, easy: 0, medium: 0, hard: 0 };
  const difficultyData = [
    { name: 'Easy', value: solved.easy, color: '#00b8a3' },
    { name: 'Medium', value: solved.medium, color: '#ffb800' },
    { name: 'Hard', value: solved.hard, color: '#ff2d55' },
  ];

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-8 py-10 text-zinc-300 font-sans antialiased">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#050507] rounded-xl p-5 border border-zinc-900">
            <div className="flex items-center gap-4">
              <img src={profileData.avatar} alt="Avatar" className="w-16 h-16 rounded-lg border border-zinc-800 object-cover bg-zinc-900" />
              <div>
                <h2 className="text-base font-semibold text-white">{profileData.name}</h2>
                <p className="text-xs text-zinc-500 font-mono">{profileData.Role || 'user'}</p>
              </div>
            </div>
            <button onClick={() => navigate(-1)} className="mt-4 w-full py-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-xs text-zinc-400 flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Registry
            </button>
          </div>
        </div>

        {/* Right Metrics Panels */}
        <div className="lg:col-span-8 space-y-5">
          {/* Performance Metrics */}
          <div className="bg-[#050507] rounded-xl p-6 border border-zinc-900">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-6 flex items-center gap-2">
              <Award className="h-3.5 w-3.5" /> Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex justify-center">
                <div className="w-36 h-36 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={difficultyData} innerRadius={54} outerRadius={66} paddingAngle={4} dataKey="value">
                        {difficultyData.map((e, i) => <Cell key={i} fill={e.value > 0 ? e.color : '#1f1f23'} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-white">{solved.total}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">Solved</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-3.5">
                {difficultyData.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono"><span style={{color: d.color}} className="font-medium">{d.name}</span><span className="text-white">{d.value}</span></div>
                    <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ backgroundColor: d.color, width: `${solved.total > 0 ? (d.value / solved.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-zinc-900/60 flex items-center justify-between text-xs font-mono text-zinc-500">
                  <span>Total Submissions: <strong className="text-zinc-300">{stats.totalSubmissions}</strong></span>
                  <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-cyan-500" /> Acc: <strong className="text-cyan-400">{stats.acceptanceRate}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-[#050507] rounded-xl p-5 border border-zinc-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 pb-2 border-b border-zinc-900/40">
              <span className="text-zinc-400 font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" /> Submission Activity
              </span>
              <div className="flex gap-4 font-mono text-zinc-500 text-[11px]">
                <span>Active: <strong className="text-white">{stats.activeDays} days</strong></span>
                <span>Streak: <strong className="text-amber-500">{stats.maxStreak} days</strong></span>
              </div>
            </div>
            <div className="w-full overflow-x-auto scrollbar-none py-1">
              <div className="min-w-[760px]">
                <ActivityHeatmap submissions={stats.submissionDates.map(date => ({ submittedAt: date }))} mode="submission" />
              </div>
            </div>
          </div>

          {/* Recent Accomplishments */}
          <div className="bg-[#050507] rounded-xl p-5 border border-zinc-900">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3 pb-2 border-b border-zinc-900/40 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" /> Recent Accomplishments
            </h3>
            <div className="space-y-2">
              {stats.recentAccepted.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/60 border border-zinc-900/70 px-4 py-2.5 rounded-lg text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00b8a3]" />
                    <span className="text-zinc-200 font-medium">{s.problem?.title}</span>
                  </div>
                  <span className="text-zinc-500 font-mono">{new Date(s.submittedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}