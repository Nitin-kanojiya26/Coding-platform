import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import toast from 'react-hot-toast';
import {
  Shield, Users, FileText, Code, Ban, ShieldCheck,
  Heart, Sparkles, Edit, Trash2, Loader2, Plus, Search,
  Boxes, Server,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [buildProblems, setBuildProblems] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [banReasons, setBanReasons] = useState({});

  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [buildSearch, setBuildSearch] = useState('');

  // Sheet Form
  const [sheetForm, setSheetForm] = useState({ name: '', description: '', imageUrl: '' });

  const handleCreateSheet = async (e) => {
    e.preventDefault();
    if (!sheetForm.name) return;
    try {
      await API.post('/sheets', sheetForm);
      setSheetForm({ name: '', description: '', imageUrl: '' });
      toast.success('Sheet created successfully!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sheet');
    }
  };

  const handleDeleteSheet = async (sheetId) => {
    if (!window.confirm('Delete this sheet permanently?')) return;
    try {
      await API.delete(`/sheets/${sheetId}`);
      toast.success('Sheet deleted successfully!');
      setSheets((prev) => prev.filter((s) => s._id !== sheetId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, problemsRes, sheetsRes, buildRes] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/problems'),
        API.get('/sheets'),
        API.get('/build/problems').catch(() => ({ data: { problems: [] } })),
      ]);
      setData(statsRes.data.data || statsRes.data);
      const rawProblems = problemsRes.data.problems || [];
      setProblems(rawProblems.map(p => ({
        ...p,
        tags: (p.tags || []).map(t => String(t).toLowerCase())
      })));
      setSheets(sheetsRes.data || []);
      setBuildProblems(buildRes.data?.problems || []);
    } catch (err) {
      console.error('Admin fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBanToggle = async (userId, isCurrentlyBanned) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (isCurrentlyBanned) {
        await API.put(`/admin/users/${userId}/unban`);
      } else {
        const reason = banReasons[userId] || 'Policy violation';
        await API.put(`/admin/users/${userId}/ban`, { reason });
      }
      await fetchData();
      toast.success(isCurrentlyBanned ? 'User unbanned' : 'User banned');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handlePromote = async (userId) => {
    if (!window.confirm('Promote this user to Admin?')) return;
    setActionLoading((prev) => ({ ...prev, [`promote-${userId}`]: true }));
    try {
      await API.put(`/admin/users/${userId}/promote`);
      toast.success('User promoted to Admin');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`promote-${userId}`]: false }));
    }
  };

  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm('Delete this problem permanently?')) return;
    setActionLoading((prev) => ({ ...prev, [`delete-${problemId}`]: true }));
    try {
      await API.delete(`/problems/${problemId}`);
      toast.success('Problem deleted');
      setProblems((prev) => prev.filter((p) => p._id !== problemId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`delete-${problemId}`]: false }));
    }
  };

  const handleEditProblem = (problemId) => {
    navigate(`/edit-problem/${problemId}`);
  };

  const handleEditBuildProblem = (slug) => {
    navigate(`/edit-build-problem/${slug}`);
  };

  const handleDeleteBuildProblem = async (slug) => {
    if (!window.confirm(`Delete project "${slug}" permanently?`)) return;
    setActionLoading((prev) => ({ ...prev, [`delete-build-${slug}`]: true }));
    try {
      await API.delete(`/build/problems/${slug}`);
      toast.success('Project challenge deleted');
      setBuildProblems((prev) => prev.filter((p) => p.slug !== slug));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [`delete-build-${slug}`]: false }));
    }
  };

  const filteredUsers = (data?.users || []).filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const filteredProblems = problems.filter((p) => {
    const q = problemSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  });

  const filteredBuildProblems = buildProblems.filter((p) => {
    const q = buildSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => String(t).toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: data?.totalUsers || 0, icon: Users },
    { label: 'DSA Problems', value: data?.totalProblems || 0, icon: Code },
    { label: 'Project Challenges', value: buildProblems.length || 0, icon: Server },
    { label: 'Submissions', value: data?.totalSubmissions || 0, icon: FileText },
    { label: 'Banned Accounts', value: data?.bannedUsers || 0, icon: Ban },
  ];

  return (
    <div className="w-full space-y-6 pt-1 text-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" /> Administration Control Panel
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor users, manage challenges, and configure learning tracks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            to="/create-build-problem"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-bg hover:opacity-90 rounded transition-opacity shadow-sm"
          >
            <Server className="h-3.5 w-3.5" />
            <span>New Project Challenge</span>
          </Link>
          <Link
            to="/create-problem"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-text text-bg hover:opacity-90 rounded transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New DSA Problem</span>
          </Link>
        </div>
      </div>

      {/* Stat Strip (Flat) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-3 border-y border-border/40 text-xs">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={idx > 0 ? 'sm:border-l sm:border-border/30 sm:pl-3' : ''}>
              <span className="text-[11px] text-text-muted flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-text-muted" />
                <span>{card.label}</span>
              </span>
              <span className="font-mono text-sm sm:text-base font-semibold text-text mt-0.5 block">
                {card.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid: Create Sheet + Users Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Create Sheet & Pulse */}
        <div className="space-y-4">
          <div className="p-4 border border-border/40 bg-surface/40 rounded space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-accent" /> Create New Sheet
            </h2>
            <form onSubmit={handleCreateSheet} className="space-y-2.5 text-xs">
              <input
                placeholder="Sheet Name (e.g. Blind 75)"
                required
                value={sheetForm.name}
                onChange={(e) => setSheetForm({ ...sheetForm, name: e.target.value })}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted outline-none focus:border-border"
              />
              <input
                placeholder="Description"
                value={sheetForm.description}
                onChange={(e) => setSheetForm({ ...sheetForm, description: e.target.value })}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted outline-none focus:border-border"
              />
              <input
                placeholder="Image URL (optional)"
                value={sheetForm.imageUrl}
                onChange={(e) => setSheetForm({ ...sheetForm, imageUrl: e.target.value })}
                className="w-full text-xs rounded border border-border/40 bg-surface-raised/40 px-2.5 py-1.5 text-text placeholder-text-muted outline-none focus:border-border"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-text text-bg hover:opacity-90 font-medium text-xs rounded transition-opacity"
              >
                Add Sheet
              </button>
            </form>
          </div>

          {/* Manage Sheets List */}
          <div className="p-4 border border-border/40 bg-surface/40 rounded space-y-2.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text">Existing Sheets</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {sheets.map(s => (
                <div key={s._id} className="flex justify-between items-center py-1 border-b border-border/20 last:border-0 text-xs">
                  <span className="truncate pr-2 font-medium text-text">{s.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSheet(s._id)}
                    className="text-danger hover:opacity-80 p-0.5"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: User Management */}
        <div className="lg:col-span-2 border border-border/40 bg-surface/40 rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-text">
              Users ({filteredUsers.length})
            </span>
            <div className="relative w-full sm:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-surface-raised/40 border border-border/40 rounded text-text placeholder-text-muted focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Role</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-raised/30 transition-colors">
                    <td className="py-2 px-3">
                      <div className="font-medium text-text">{u.name || 'Unknown'}</div>
                      <div className="text-[10px] text-text-muted font-mono">{u.email || '—'}</div>
                    </td>
                    <td className="py-2 px-3 text-text-muted capitalize">{u.role || 'member'}</td>
                    <td className="py-2 px-3">
                      {u.isBanned ? (
                        <span className="text-[10px] text-danger bg-danger/10 px-1.5 py-0.5 rounded">Banned</span>
                      ) : (
                        <span className="text-[10px] text-success bg-success/10 px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handlePromote(u._id)}
                            disabled={actionLoading[`promote-${u._id}`]}
                            className="text-[10px] px-2 py-0.5 rounded border border-border/40 hover:bg-surface-raised text-text transition-colors"
                          >
                            Promote
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBanToggle(u._id, u.isBanned)}
                          disabled={actionLoading[u._id]}
                          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                            u.isBanned
                              ? 'text-success hover:bg-success/10 border border-success/30'
                              : 'text-danger hover:bg-danger/10 border border-danger/30'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Problem Management Table */}
      <div className="border border-border/40 bg-surface/40 rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text">
            Problems ({filteredProblems.length})
          </span>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
            <input
              type="text"
              placeholder="Search problem..."
              value={problemSearch}
              onChange={(e) => setProblemSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-surface-raised/40 border border-border/40 rounded text-text placeholder-text-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                <th className="py-2 px-3">Title</th>
                <th className="py-2 px-3">Difficulty</th>
                <th className="py-2 px-3">Tags</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredProblems.slice(0, 20).map((p) => (
                <tr key={p._id} className="hover:bg-surface-raised/30 transition-colors">
                  <td className="py-2 px-3 font-medium text-text">{p.title}</td>
                  <td className="py-2 px-3 capitalize">
                    <span className={p.difficulty === 'easy' ? 'text-success' : p.difficulty === 'medium' ? 'text-warning' : 'text-danger'}>
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-text-muted text-[11px] font-mono">
                    {(p.tags || []).slice(0, 3).join(', ')}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditProblem(p._id)}
                        className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProblem(p._id)}
                        disabled={actionLoading[`delete-${p._id}`]}
                        className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REST API Challenges (Build Mode) Table */}
      <div className="border border-border/40 bg-surface/40 rounded overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-text">
              Project Challenges ({filteredBuildProblems.length})
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />
              <input
                type="text"
                placeholder="Search projects..."
                value={buildSearch}
                onChange={(e) => setBuildSearch(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-surface-raised/40 border border-border/40 rounded text-text placeholder-text-muted focus:outline-none"
              />
            </div>
            <Link
              to="/create-build-problem"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 rounded transition-colors whitespace-nowrap"
            >
              <Plus className="h-3 w-3" />
              <span>New</span>
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                <th className="py-2 px-3">Project</th>
                <th className="py-2 px-3">Slug</th>
                <th className="py-2 px-3">Difficulty</th>
                <th className="py-2 px-3">Test Cases</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredBuildProblems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-text-muted text-xs">
                    No project challenges found. Click "New Project Challenge" above to create one.
                  </td>
                </tr>
              ) : (
                filteredBuildProblems.map((bp) => (
                  <tr key={bp.slug || bp._id} className="hover:bg-surface-raised/30 transition-colors">
                    <td className="py-2 px-3">
                      <div className="font-medium text-text">{bp.title}</div>
                      <div className="text-[10px] text-text-muted font-mono">{bp.runtime || 'node-express'}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-text-muted">
                      {bp.slug}
                    </td>
                    <td className="py-2 px-3 capitalize">
                      <span className={
                        bp.difficulty?.toLowerCase() === 'easy' ? 'text-success' :
                        bp.difficulty?.toLowerCase() === 'medium' ? 'text-warning' : 'text-danger'
                      }>
                        {bp.difficulty || 'Medium'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-text-muted font-mono text-[11px]">
                      {(bp.testCases || []).length} integration tests
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/build/${bp.slug}`}
                          className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text transition-colors"
                          title="Open Challenge"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Code className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleEditBuildProblem(bp.slug)}
                          className="p-1 rounded hover:bg-surface-raised text-text-muted hover:text-text transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBuildProblem(bp.slug)}
                          disabled={actionLoading[`delete-build-${bp.slug}`]}
                          className="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}