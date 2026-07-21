import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Code, Award, TrendingUp, CheckCircle2, 
  ArrowLeft, Calendar, Flame 
} from 'lucide-react';

// ─── Custom colors ──────────────────────────────────────────────
const EASY_COLOR = '#6ee774';
const MEDIUM_COLOR = '#ffb800';
const HARD_COLOR = '#ff2d55';

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

  if (loading) return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-base border-t-accent rounded-full animate-spin" />
    </div>
  );
  if (!profileData || !stats) return (
    <div className="min-h-screen bg-primary flex items-center justify-center text-muted font-mono text-xs">
      [SYS_ERR]: Node unresolvable.
    </div>
  );

  const solved = stats.solved || { total: 0, easy: 0, medium: 0, hard: 0 };
  const difficultyData = [
    { name: 'Easy', value: solved.easy, color: EASY_COLOR },
    { name: 'Medium', value: solved.medium, color: MEDIUM_COLOR },
    { name: 'Hard', value: solved.hard, color: HARD_COLOR },
  ];

  return (
    <div className="min-h-screen bg-primary px-4 sm:px-8 py-10 text-secondary font-sans antialiased">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-card rounded-xl p-5 border border-base">
            <div className="flex items-center gap-4">
              <img 
                src={profileData.avatar} 
                alt="Avatar" 
                className="w-16 h-16 rounded-lg border border-light object-cover bg-secondary" 
              />
              <div>
                <h2 className="text-base font-semibold text-primary">{profileData.name}</h2>
                <p className="text-xs text-muted font-mono">{profileData.role}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(-1)} 
              className="mt-4 w-full py-1.5 rounded-lg border border-base bg-secondary hover:bg-hover text-xs text-muted hover:text-secondary flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Registry
            </button>
          </div>
        </div>

        {/* Right Metrics Panels */}
        <div className="lg:col-span-8 space-y-5">
          {/* Performance Metrics */}
          <div className="bg-card rounded-xl p-6 border border-base">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-6 flex items-center gap-2">
              <Award className="h-3.5 w-3.5" /> Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex justify-center">
                <div className="w-36 h-36 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={difficultyData} 
                        innerRadius={54} 
                        outerRadius={66} 
                        paddingAngle={4} 
                        dataKey="value"
                      >
                        {difficultyData.map((e, i) => (
                          <Cell key={i} fill={e.value > 0 ? e.color : '#2a2a2a'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{solved.total}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted">Solved</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-8 space-y-3.5">
                {difficultyData.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span style={{color: d.color}} className="font-medium">{d.name}</span>
                      <span className="text-primary">{d.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary border border-base rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          backgroundColor: d.color, 
                          width: `${solved.total > 0 ? (d.value / solved.total) * 100 : 0}%` 
                        }} 
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-base/60 flex items-center justify-between text-xs font-mono text-muted">
                  <span>Total Submissions: <strong className="text-secondary">{stats.totalSubmissions}</strong></span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-500" /> 
                    Acc: <strong className="text-cyan-400">{stats.acceptanceRate}%</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-card rounded-xl p-5 border border-base">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mb-4 pb-2 border-b border-base/40">
              <span className="text-muted font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted" /> Submission Activity
              </span>
              <div className="flex gap-4 font-mono text-muted text-[11px]">
                <span>Active: <strong className="text-primary">{stats.activeDays} days</strong></span>
                <span>Streak: <strong className="text-amber-500">{stats.maxStreak} days</strong></span>
              </div>
            </div>
            <div className="w-full overflow-x-auto scrollbar-none py-1">
              <div className="min-w-[760px]">
                <ActivityHeatmap 
                  submissions={stats.submissionDates.map(date => ({ submittedAt: date }))} 
                  mode="submission" 
                />
              </div>
            </div>
          </div>

          {/* Recent Accomplishments */}
          <div className="bg-card rounded-xl p-5 border border-base">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted mb-3 pb-2 border-b border-base/40 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" /> Recent Accomplishments
            </h3>
            <div className="space-y-2">
              {stats.recentAccepted?.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-secondary/60 border border-base/70 px-4 py-2.5 rounded-lg text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-3.5 w-3.5" style={{ color: EASY_COLOR }} />
                    <span className="text-secondary font-medium">{s.problem?.title}</span>
                  </div>
                  <span className="text-muted font-mono">{new Date(s.submittedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}