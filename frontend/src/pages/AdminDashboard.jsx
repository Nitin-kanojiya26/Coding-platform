import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import {
  Shield, Users, FileText, Code, CheckCircle, Ban, ShieldCheck,
  Heart, Sparkles, Edit, Trash2, Loader2, Plus, Search,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [banReasons, setBanReasons] = useState({});

  // ── Search states ──
  const [userSearch, setUserSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');

  const fetchData = async () => {
    try {
      const [statsRes, problemsRes] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/problems'),
      ]);
      setData(statsRes.data.data || statsRes.data);
      setProblems(problemsRes.data.problems || []);
    } catch (err) {
      console.error('Admin fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Ban/Unban handlers ──
  const handleBanToggle = async (userId, isCurrentlyBanned) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (isCurrentlyBanned) {
        await API.put(`/admin/users/${userId}/unban`);
      } else {
        const reason = banReasons[userId] || 'Policy violation';
        await API.put(`/admin/users/${userId}/ban`, { reason });
      }
      await fetchData(); // Refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  // ── Delete problem ──
  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Delete this problem permanently?')) return;
    setActionLoading((prev) => ({ ...prev, [`delete-${problemId}`]: true }));
    try {
      await API.delete(`/problems/id/${problemId}`);
      setProblems((prev) => prev.filter((p) => p._id !== problemId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`delete-${problemId}`]: false }));
    }
  };

  // ── Edit problem ──
  const handleEditProblem = (problemId) => {
    navigate(`/edit-problem/${problemId}`);
  };

  // ── Filter users and problems ──
  const filteredUsers = (data?.users || []).filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredProblems = problems.filter((p) =>
    p.title?.toLowerCase().includes(problemSearch.toLowerCase()) ||
    p.tags?.some((tag) => tag.toLowerCase().includes(problemSearch.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-primary">
        <Loader2 className="h-5 w-5 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
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
    <div className="min-h-screen bg-primary px-4 sm:px-8 py-12 text-secondary font-sans antialiased selection:bg-space-blue/10 selection:text-space-blue">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-base">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-space-blue" />
              <h1 className="text-lg font-semibold text-primary tracking-tight flex items-center gap-2">
                Welcome back, Admin! <Sparkles className="h-4 w-4 text-amber-400 inline animate-pulse" />
              </h1>
            </div>
            <p className="text-xs text-muted">
              Manage users, problems, and monitor platform health.
            </p>
          </div>
          <Link
            to="/create-problem"
            className="text-xs text-muted bg-secondary border border-base px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto hover:border-light transition-colors"
          >
            <Plus className="h-3 w-3" /> New Problem
          </Link>
        </div>

        {/* ─── Stat Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-base hover:border-light/80 rounded-xl p-5 flex flex-col justify-between min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs text-muted font-medium group-hover:text-secondary transition-colors">
                    {card.label}
                  </span>
                  <Icon className="h-4 w-4 text-muted group-hover:text-space-blue transition-colors" />
                </div>
                <div className="mt-4 space-y-0.5">
                  <div className="text-2xl font-semibold tracking-tight text-primary">
                    {card.value.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-muted italic">{card.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Platform Pulse ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 border border-base rounded-xl bg-card p-6 flex flex-col justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-secondary">
                <Heart className="h-4 w-4 text-rose-500" />
                <h2 className="text-sm font-medium text-primary">Platform Pulse</h2>
              </div>
              <p className="text-xs text-muted">Acceptance & difficulty distribution.</p>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Community Acceptance Rate</span>
                  <span className="text-space-blue font-semibold">{data?.acceptanceRate || 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden border border-base/40">
                  <div
                    className="h-full bg-space-blue transition-all duration-500 rounded-full"
                    style={{ width: `${data?.acceptanceRate || 0}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-base/60 space-y-2">
                <span className="text-xs font-medium text-muted block">Challenges by Level</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-secondary border border-base p-2 rounded-lg text-center">
                    <div className="text-emerald-400 font-semibold">{data?.problems?.easy || 0}</div>
                    <div className="text-[10px] text-muted mt-0.5">Easy</div>
                  </div>
                  <div className="bg-secondary border border-base p-2 rounded-lg text-center">
                    <div className="text-amber-400 font-semibold">{data?.problems?.medium || 0}</div>
                    <div className="text-[10px] text-muted mt-0.5">Medium</div>
                  </div>
                  <div className="bg-secondary border border-base p-2 rounded-lg text-center">
                    <div className="text-rose-400 font-semibold">{data?.problems?.hard || 0}</div>
                    <div className="text-[10px] text-muted mt-0.5">Hard</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── User Management with Search ─── */}
          <div className="lg:col-span-2 border border-base rounded-xl bg-card overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-secondary/40 border-b border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-primary">Users</h3>
                <p className="text-xs text-muted">Manage member accounts and access.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* 🔍 User Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-input border border-light rounded-lg text-primary placeholder-muted focus:border-light outline-none transition-colors w-48"
                  />
                </div>
                <span className="text-[10px] font-medium text-muted bg-secondary/60 px-2.5 py-1 rounded-full border border-light">
                  {filteredUsers.length} of {data?.users?.length || 0}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-base bg-secondary/10 text-xs text-muted">
                    <th className="py-2.5 px-5 font-medium">User</th>
                    <th className="py-2.5 px-5 font-medium">Role</th>
                    <th className="py-2.5 px-5 font-medium">Status</th>
                    <th className="py-2.5 px-5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base/40 text-xs">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="group hover:bg-hover/60 transition-colors duration-150">
                        <td className="py-3 px-5">
                          <div className="font-medium text-secondary group-hover:text-primary transition-colors">
                            {u.name || 'Unknown'}
                          </div>
                          <div className="text-[11px] text-muted mt-0.5">{u.email || '—'}</div>
                        </td>
                        <td className="py-3 px-5 text-muted capitalize">{u.role || 'member'}</td>
                        <td className="py-3 px-5">
                          {u.isBanned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2.5 py-0.5 rounded-full">
                              <Ban className="h-2.5 w-2.5" /> Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-0.5 rounded-full">
                              <ShieldCheck className="h-2.5 w-2.5" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!u.isBanned && (
                              <input
                                type="text"
                                placeholder="Reason"
                                value={banReasons[u._id] || ''}
                                onChange={(e) => setBanReasons(prev => ({ ...prev, [u._id]: e.target.value }))}
                                className="w-24 bg-input border border-light rounded px-1.5 py-0.5 text-[10px] text-muted placeholder-muted focus:border-light outline-none"
                              />
                            )}
                            <button
                              onClick={() => handleBanToggle(u._id, u.isBanned)}
                              disabled={actionLoading[u._id]}
                              className={`text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                                u.isBanned
                                  ? 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'
                                  : 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
                              }`}
                            >
                              {actionLoading[u._id] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.isBanned ? (
                                'Unban'
                              ) : (
                                'Ban'
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-xs text-muted">
                        {userSearch ? 'No users match your search.' : 'No users yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── Problem Management with Search ─── */}
        <div className="border border-base rounded-xl bg-card overflow-hidden">
          <div className="px-5 py-4 bg-secondary/40 border-b border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-primary">Problems</h3>
              <p className="text-xs text-muted">Edit or remove existing challenges.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* 🔍 Problem Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search by title or tag..."
                  value={problemSearch}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-input border border-light rounded-lg text-primary placeholder-muted focus:border-light outline-none transition-colors w-48"
                />
              </div>
              <Link
                to="/create-problem"
                className="text-[10px] font-medium text-space-blue hover:text-primary transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add New
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-base bg-secondary/10 text-xs text-muted">
                  <th className="py-2.5 px-5 font-medium">Title</th>
                  <th className="py-2.5 px-5 font-medium">Difficulty</th>
                  <th className="py-2.5 px-5 font-medium">Tags</th>
                  <th className="py-2.5 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base/40 text-xs">
                {filteredProblems.length > 0 ? (
                  filteredProblems.slice(0, 15).map((p) => (
                    <tr key={p._id} className="group hover:bg-hover/60 transition-colors duration-150">
                      <td className="py-3 px-5">
                        <span className="text-secondary group-hover:text-primary transition-colors">
                          {p.title}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`capitalize ${
                          p.difficulty === 'easy' ? 'text-emerald-400' :
                          p.difficulty === 'medium' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className="text-muted text-[10px]">
                          {(p.tags || []).slice(0, 3).join(', ')}
                          {(p.tags || []).length > 3 && ` +${p.tags.length - 3}`}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditProblem(p._id)}
                            className="p-1.5 rounded hover:bg-hover/60 transition-colors text-muted hover:text-space-blue"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProblem(p._id)}
                            disabled={actionLoading[`delete-${p._id}`]}
                            className="p-1.5 rounded hover:bg-hover/60 transition-colors text-muted hover:text-rose-400"
                            title="Delete"
                          >
                            {actionLoading[`delete-${p._id}`] ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-xs text-muted">
                      {problemSearch ? 'No problems match your search.' : 'No problems created yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}