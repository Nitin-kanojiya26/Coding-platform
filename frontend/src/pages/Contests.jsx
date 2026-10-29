import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Trophy,
  Clock,
  Users,
  Lock,
  Globe,
  KeyRound,
  Search,
  Code2,
  Boxes,
  Plus,
  Loader2,
  CheckCircle2,
  X,
  ArrowRight,
  Flame,
  Shuffle,
  Sparkles,
  Check,
  Calendar,
  Zap,
} from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

export default function Contests() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'running', 'scheduled', 'ended'
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'dsa', 'api'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingContest, setCreatingContest] = useState(false);

  // Problem selection & Timing modes
  const [selectionMode, setSelectionMode] = useState('random'); // 'random' | 'manual'
  const [timingMode, setTimingMode] = useState('now'); // 'now' | 'schedule'
  const [availableProblems, setAvailableProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [problemSearch, setProblemSearch] = useState('');
  const [problemDiffFilter, setProblemDiffFilter] = useState('all');

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    type: 'dsa',
    kind: 'private',
    scoring: 'icpc',
    startTime: '',
    durationMinutes: 90,
    maxParticipants: 50,
    allowLateJoin: false,
    easyCount: 1,
    mediumCount: 2,
    hardCount: 1,
  });

  const fetchContests = async () => {
    try {
      setLoading(true);
      const res = await API.get('/contests');
      const data = res.data?.contests || [];
      setContests(data);
    } catch (err) {
      console.error('Failed to fetch contests:', err);
      toast.error('Unable to load contests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProblems = async (type) => {
    try {
      setLoadingProblems(true);
      if (type === 'api') {
        const res = await API.get('/build/problems');
        setAvailableProblems(res.data?.problems || []);
      } else {
        const res = await API.get('/problems', { params: { limit: 100 } });
        setAvailableProblems(res.data?.problems || []);
      }
    } catch (err) {
      console.error('Failed to fetch problem bank:', err);
      toast.error('Unable to load problem choices.');
    } finally {
      setLoadingProblems(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  useEffect(() => {
    if (showCreateModal && selectionMode === 'manual') {
      fetchAvailableProblems(createForm.type);
    }
  }, [showCreateModal, selectionMode, createForm.type]);

  const handleToggleProblem = (prob) => {
    const pId = prob._id || prob.id;
    const isSelected = selectedProblems.some((p) => (p._id || p.id) === pId);
    if (isSelected) {
      setSelectedProblems((prev) => prev.filter((p) => (p._id || p.id) !== pId));
    } else {
      const maxLimit = user?.role === 'admin' ? 15 : 8;
      if (selectedProblems.length >= maxLimit) {
        toast.error(`You can select up to ${maxLimit} problems.`);
        return;
      }
      setSelectedProblems((prev) => [...prev, prob]);
    }
  };

  const formatDateTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return dateStr;
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.length !== 8) {
      toast.error('Contest join code must be 8 characters.');
      return;
    }

    try {
      setJoiningByCode(true);
      const res = await API.post('/contests/join-by-code', { joinCode: cleanCode });
      toast.success(res.data?.message || 'Joined contest.');
      setShowJoinCodeModal(false);
      setJoinCodeInput('');
      const contestId = res.data?.contest?._id || res.data?.contest?.id;
      if (contestId) {
        navigate(`/contests/${contestId}`);
      } else {
        fetchContests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid join code.');
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleRegister = async (contestId) => {
    try {
      await API.post(`/contests/${contestId}/join`);
      toast.success('Registered for contest.');
      fetchContests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register.');
    }
  };

  const handleCreateContest = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error('Contest title is required.');
      return;
    }

    let startIso = new Date().toISOString();
    if (timingMode === 'schedule') {
      if (!createForm.startTime) {
        toast.error('Start time is required for scheduled contests.');
        return;
      }
      startIso = new Date(createForm.startTime).toISOString();
    }

    let selectionPayload;
    let problemsPayload = [];

    if (selectionMode === 'manual') {
      if (selectedProblems.length < 1) {
        toast.error('Please select at least 1 problem from the list.');
        return;
      }
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      selectionPayload = { mode: 'manual' };
      problemsPayload = selectedProblems.map((p, idx) => ({
        problemId: p._id || p.id,
        label: letters[idx] || `P${idx + 1}`,
        points: 100,
      }));
    } else {
      const totalProblems =
        Number(createForm.easyCount) + Number(createForm.mediumCount) + Number(createForm.hardCount);
      if (totalProblems < 1) {
        toast.error('Please configure at least 1 problem.');
        return;
      }
      selectionPayload = {
        mode: 'random',
        counts: {
          easy: Number(createForm.easyCount),
          medium: Number(createForm.mediumCount),
          hard: Number(createForm.hardCount),
        },
      };
    }

    try {
      setCreatingContest(true);
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        type: createForm.type,
        kind: user?.role === 'admin' ? createForm.kind : 'private',
        scoring: createForm.scoring,
        startTime: startIso,
        durationMinutes: Number(createForm.durationMinutes),
        maxParticipants: Number(createForm.maxParticipants),
        allowLateJoin: createForm.allowLateJoin,
        selection: selectionPayload,
        problems: problemsPayload,
      };

      const res = await API.post('/contests', payload);
      toast.success('Contest created successfully.');
      setShowCreateModal(false);
      const newContestId = res.data?.contest?._id || res.data?.contest?.id;
      if (newContestId) {
        navigate(`/contests/${newContestId}`);
      } else {
        fetchContests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating contest.');
    } finally {
      setCreatingContest(false);
    }
  };

  const filteredContests = contests.filter((c) => {
    const statusMatch =
      activeTab === 'all' ||
      (activeTab === 'running' && c.status === 'running') ||
      (activeTab === 'scheduled' && c.status === 'scheduled') ||
      (activeTab === 'ended' && c.status === 'ended');

    const typeMatch = selectedType === 'all' || c.type === selectedType;

    const queryMatch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return statusMatch && typeMatch && queryMatch;
  });

  const filteredAvailableProblems = availableProblems.filter((p) => {
    const matchesDiff =
      problemDiffFilter === 'all' ||
      (p.difficulty || '').toLowerCase() === problemDiffFilter.toLowerCase();
    const query = problemSearch.toLowerCase().trim();
    const matchesQuery =
      !query ||
      (p.title && p.title.toLowerCase().includes(query)) ||
      (p.slug && p.slug.toLowerCase().includes(query)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(query)));
    return matchesDiff && matchesQuery;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 text-text select-none">
      
      {/* ─── Seamless Header (Matching LeetCode / Problems Page) ──────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-text tracking-tight flex items-center gap-2">
            Contests
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Coding competitions and challenges
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowJoinCodeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface border border-border text-xs text-text hover:bg-surface-raised transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-accent-blue" />
            <span>Enter Code</span>
          </button>

          <button
            onClick={() => {
              const defaultStart = new Date(Date.now() + 15 * 60 * 1000);
              defaultStart.setMinutes(defaultStart.getMinutes() - defaultStart.getTimezoneOffset());
              setCreateForm((prev) => ({
                ...prev,
                startTime: defaultStart.toISOString().slice(0, 16),
              }));
              setTimingMode('now');
              setSelectionMode('random');
              setSelectedProblems([]);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent/15 text-accent border border-accent/40 font-medium text-xs hover:bg-accent/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Contest</span>
          </button>
        </div>
      </div>

      {/* ─── Flat Minimal Filter Controls ────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 border-b border-border/30 text-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'running', label: 'Live' },
            { id: 'scheduled', label: 'Upcoming' },
            { id: 'ended', label: 'Past' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded transition-colors text-xs font-medium ${
                activeTab === tab.id
                  ? 'bg-surface-raised text-text font-semibold'
                  : 'text-text-muted hover:text-text hover:bg-surface-raised/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Search & Category Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-surface-inset border border-border text-text text-xs rounded px-2.5 py-1 focus:outline-none focus:border-border"
          >
            <option value="all">All Categories</option>
            <option value="dsa">Algorithms</option>
            <option value="api">Backend APIs</option>
          </select>

          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Filter contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-inset border border-border text-text text-xs rounded pl-8 pr-3 py-1 placeholder-text-muted focus:outline-none focus:border-border"
            />
          </div>
        </div>
      </div>


      {/* ─── Seamless Flat Table (Matching Problems & Leaderboard) ───── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>Loading contests...</span>
        </div>
      ) : filteredContests.length === 0 ? (
        <div className="py-20 text-center space-y-1.5 border-b border-border/20">
          <Trophy className="w-6 h-6 mx-auto text-text-muted/60" />
          <p className="text-xs text-text-muted">No contests found matching criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                <th className="py-2.5 px-3 w-10 text-center">Status</th>
                <th className="py-2.5 px-3">Contest</th>
                <th className="py-2.5 px-3 w-28">Category</th>
                <th className="py-2.5 px-3 w-36">Schedule</th>
                <th className="py-2.5 px-3 w-24">Duration</th>
                <th className="py-2.5 px-3 w-24">Joined</th>
                <th className="py-2.5 px-3 w-24 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredContests.map((contest) => {
                const isRunning = contest.status === 'running';
                const isScheduled = contest.status === 'scheduled';
                const isEnded = contest.status === 'ended';
                const isDSA = contest.type === 'dsa';
                const isRegistered = contest.hasJoined;

                return (
                  <tr
                    key={contest._id}
                    onClick={() => {
                      if (isRunning) navigate(`/contests/${contest._id}/arena`);
                      else navigate(`/contests/${contest._id}`);
                    }}
                    className="hover:bg-surface-raised/35 transition-colors cursor-pointer group"
                  >
                    {/* Status Dot */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {isRunning ? (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                          </span>
                        ) : isScheduled ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-info" title="Upcoming"></span>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-border" title="Ended"></span>
                        )}
                      </div>
                    </td>

                    {/* Title + Meta */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text group-hover:text-accent transition-colors truncate max-w-xs sm:max-w-md">
                          {contest.title}
                        </span>

                        <span className="text-[10px] text-text-muted font-mono flex items-center gap-0.5">
                          {contest.kind === 'public' ? (
                            <Globe className="w-2.5 h-2.5 text-text-muted" />
                          ) : (
                            <Lock className="w-2.5 h-2.5 text-warning" />
                          )}
                        </span>

                        {isRegistered && (
                          <span className="text-[10px] font-mono text-success flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      {contest.description && (
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                          {contest.description}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-medium ${
                          isDSA ? 'text-text' : 'text-accent font-semibold'
                        }`}
                      >
                        {isDSA ? 'Algorithms' : 'Backend APIs'}
                      </span>
                    </td>

                    {/* Schedule */}
                    <td className="py-3 px-3 whitespace-nowrap text-text-muted text-[11px]">
                      {formatDateTime(contest.startTime)}
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 whitespace-nowrap text-text-muted font-mono text-[11px]">
                      {contest.durationMinutes}m
                    </td>

                    {/* Participants */}
                    <td className="py-3 px-3 whitespace-nowrap text-text-muted font-mono text-[11px]">
                      {contest.participantsCount || 1}
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-right pr-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {isRunning ? (
                        isRegistered || contest.allowLateJoin || user?.role === 'admin' ? (
                          <Link
                            to={`/contests/${contest._id}/arena`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white font-medium text-xs transition-colors shadow-xs"
                          >
                            Enter <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            to={`/contests/${contest._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-raised border border-border text-text-muted text-xs hover:border-border/80 transition-colors"
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-400" /> Lobby
                          </Link>
                        )
                      ) : isScheduled ? (
                        isRegistered ? (
                          <Link
                            to={`/contests/${contest._id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-raised border border-border hover:bg-border/30 text-text text-xs transition-colors"
                          >
                            Lobby
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleRegister(contest._id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-raised border border-border hover:border-accent text-accent text-xs transition-colors"
                          >
                            Register
                          </button>
                        )
                      ) : (
                        <Link
                          to={`/contests/${contest._id}/arena`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-text-muted hover:text-text hover:bg-surface-raised text-xs transition-colors"
                        >
                          Standings
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Join With Code Modal (Flat Minimalist) ───────────────────── */}
      {showJoinCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-surface border border-border rounded-md p-5 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/30">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Join Private Contest
              </h3>
              <button
                onClick={() => setShowJoinCodeModal(false)}
                className="text-text-muted hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-muted">
              Enter the 8-character invitation code provided by the contest host.
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="8-CHAR CODE"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full text-center text-lg font-mono font-bold tracking-[4px] uppercase px-3 py-2 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={joiningByCode || joinCodeInput.trim().length !== 8}
                className="w-full py-2 rounded bg-surface-raised border border-border hover:border-accent text-text hover:text-accent font-medium text-xs disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
              >
                {joiningByCode ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  'Join Lobby'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create Contest Modal (Flat Minimalist) ────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-md p-5 sm:p-6 shadow-2xl relative space-y-4 my-8 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/30 shrink-0">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <span>Create Contest</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContest} className="space-y-4 overflow-y-auto pr-1">
              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly Challenge 12"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-accent text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Contest overview, rules, or guidelines..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-accent text-xs"
                  />
                </div>
              </div>

              {/* Category & Scoring */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Category</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setCreateForm({
                        ...createForm,
                        type: newType,
                        scoring: newType === 'api' ? 'points' : 'icpc',
                      });
                      setSelectedProblems([]);
                      if (selectionMode === 'manual') {
                        fetchAvailableProblems(newType);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-border text-xs"
                  >
                    <option value="dsa">Algorithms</option>
                    <option value="api">Backend APIs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Rules & Scoring</label>
                  <select
                    value={createForm.scoring}
                    onChange={(e) => setCreateForm({ ...createForm, scoring: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-border text-xs"
                  >
                    <option value="icpc">Standard Rules (+20m penalty per wrong answer)</option>
                    <option value="points">Score per Test Case (Partial score)</option>
                  </select>
                </div>
              </div>

              {user?.role === 'admin' && (
                <div>
                  <label className="text-[11px] font-medium text-text-muted block mb-1">Visibility</label>
                  <select
                    value={createForm.kind}
                    onChange={(e) => setCreateForm({ ...createForm, kind: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-border text-xs"
                  >
                    <option value="public">Public (Visible to everyone)</option>
                    <option value="private">Private (Join via 8-character invitation code)</option>
                  </select>
                </div>
              )}

              {/* Late Join Policy */}
              <div className="flex items-center justify-between p-2.5 rounded bg-surface-raised/40 border border-border/40">
                <div className="pr-4">
                  <span className="text-[11px] font-medium text-text block">Allow Late Join</span>
                  <span className="text-[10px] text-text-muted">
                    If unchecked (default), only users who registered before the contest started can enter and submit while live.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={createForm.allowLateJoin}
                  onChange={(e) => setCreateForm({ ...createForm, allowLateJoin: e.target.checked })}
                  className="h-4 w-4 rounded accent-accent cursor-pointer"
                />
              </div>

              {/* Timing Options: Start Now vs Schedule for Later */}
              <div className="p-3 rounded bg-surface-raised/40 border border-border/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text">Contest Timing</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTimingMode('now')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        timingMode === 'now'
                          ? 'bg-success/15 text-success border border-success/40'
                          : 'text-text-muted hover:text-text bg-surface-raised border border-border/30'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Start Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimingMode('schedule')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        timingMode === 'schedule'
                          ? 'bg-accent/15 text-accent border border-accent/40'
                          : 'text-text-muted hover:text-text bg-surface-raised border border-border/30'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Schedule for Later</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {timingMode === 'schedule' ? (
                    <div>
                      <label className="text-[10px] font-medium text-text-muted block mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        value={createForm.startTime}
                        onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-border font-mono text-[11px]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-text-muted py-1.5">
                      <span className="w-2 h-2 rounded-full bg-success"></span>
                      <span>Contest will unlock immediately upon creation.</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-medium text-text-muted block mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={20}
                      max={360}
                      value={createForm.durationMinutes}
                      onChange={(e) => setCreateForm({ ...createForm, durationMinutes: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-surface-inset border border-border text-text focus:outline-none focus:border-border font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Problem Selection: Random Select vs Choose My Own Problems ─── */}
              <div className="p-3 rounded bg-surface-raised/40 border border-border/40 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-text uppercase tracking-wider block">
                      Problem Selection
                    </span>
                    <span className="text-[10px] text-text-muted">
                      Choose how problems are assigned to this contest
                    </span>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex items-center gap-1 bg-surface-inset p-0.5 rounded border border-border/40">
                    <button
                      type="button"
                      onClick={() => setSelectionMode('random')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                        selectionMode === 'random'
                          ? 'bg-accent/15 text-accent font-semibold border border-accent/40 shadow-xs'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Random Selection</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode('manual');
                        if (availableProblems.length === 0) {
                          fetchAvailableProblems(createForm.type);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-colors ${
                        selectionMode === 'manual'
                          ? 'bg-accent/15 text-accent font-semibold border border-accent/40 shadow-xs'
                          : 'text-text-muted hover:text-text'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Choose My Own Problems</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: Random Selection */}
                {selectionMode === 'random' ? (
                  <div className="space-y-2 pt-1 border-t border-border/20">
                    <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                      <span>Specify difficulty counts:</span>
                      <span className="font-semibold text-text">
                        Total: {Number(createForm.easyCount) + Number(createForm.mediumCount) + Number(createForm.hardCount)} problems
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-success font-medium block mb-0.5">Easy</span>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={createForm.easyCount}
                          onChange={(e) => setCreateForm({ ...createForm, easyCount: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-surface-inset border border-border text-text text-center font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-warning font-medium block mb-0.5">Medium</span>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={createForm.mediumCount}
                          onChange={(e) => setCreateForm({ ...createForm, mediumCount: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-surface-inset border border-border text-text text-center font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-danger font-medium block mb-0.5">Hard</span>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          value={createForm.hardCount}
                          onChange={(e) => setCreateForm({ ...createForm, hardCount: e.target.value })}
                          className="w-full px-2 py-1 rounded bg-surface-inset border border-border text-text text-center font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TAB 2: Manual Selection (Choose My Own Problems) */
                  <div className="space-y-3 pt-1 border-t border-border/20">
                    {/* Selected Problems Pills */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-medium text-text">
                          Selected Challenges ({selectedProblems.length} / {user?.role === 'admin' ? 15 : 8}):
                        </span>
                        {selectedProblems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedProblems([])}
                            className="text-[10px] text-danger hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {selectedProblems.length === 0 ? (
                        <div className="p-2.5 rounded border border-dashed border-border/60 text-center text-[11px] text-text-muted">
                          Click any problem below to add it to the contest.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded bg-surface-inset border border-border/40">
                          {selectedProblems.map((prob, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const pId = prob._id || prob.id;
                            return (
                              <div
                                key={pId}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-raised border border-border text-[11px] text-text font-medium"
                              >
                                <span className="font-mono text-accent font-bold">{letter}.</span>
                                <span className="truncate max-w-[140px]">{prob.title}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleProblem(prob)}
                                  className="text-text-muted hover:text-danger ml-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Filter and Search Bar for Problems */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search challenges by title or tag..."
                          value={problemSearch}
                          onChange={(e) => setProblemSearch(e.target.value)}
                          className="w-full bg-surface-inset border border-border text-text text-xs rounded pl-8 pr-3 py-1 placeholder-text-muted focus:outline-none focus:border-border"
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {['all', 'easy', 'medium', 'hard'].map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => setProblemDiffFilter(diff)}
                            className={`px-2 py-0.5 rounded text-[10px] capitalize font-medium transition-colors ${
                              problemDiffFilter === diff
                                ? 'bg-surface-raised text-text font-bold border border-border'
                                : 'text-text-muted hover:text-text'
                            }`}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Problem List (Scrollable) */}
                    <div className="max-h-52 overflow-y-auto rounded border border-border/40 bg-surface-inset divide-y divide-border/20">
                      {loadingProblems ? (
                        <div className="py-8 text-center text-text-muted text-xs flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          <span>Loading problem bank...</span>
                        </div>
                      ) : filteredAvailableProblems.length === 0 ? (
                        <div className="py-8 text-center text-text-muted text-xs">
                          No problems match your search criteria.
                        </div>
                      ) : (
                        filteredAvailableProblems.map((prob) => {
                          const pId = prob._id || prob.id;
                          const selectedIndex = selectedProblems.findIndex(
                            (p) => (p._id || p.id) === pId
                          );
                          const isSelected = selectedIndex !== -1;

                          return (
                            <div
                              key={pId}
                              onClick={() => handleToggleProblem(prob)}
                              className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs select-none ${
                                isSelected
                                  ? 'bg-accent/10 border-l-2 border-accent'
                                  : 'hover:bg-surface-raised/40'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border text-[10px] font-mono font-bold transition-colors ${
                                    isSelected
                                      ? 'bg-accent text-white border-accent'
                                      : 'border-border/60 bg-surface'
                                  }`}
                                >
                                  {isSelected ? String.fromCharCode(65 + selectedIndex) : ''}
                                </div>

                                <div className="min-w-0">
                                  <div className="font-medium text-text truncate">
                                    {prob.title}
                                  </div>
                                  {prob.tags && prob.tags.length > 0 && (
                                    <div className="text-[10px] text-text-muted truncate">
                                      {prob.tags.slice(0, 3).join(', ')}
                                    </div>
                                  )}
                                  {prob.summary && (
                                    <div className="text-[10px] text-text-muted truncate">
                                      {prob.summary}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                <DifficultyBadge difficulty={prob.difficulty || 'medium'} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={creatingContest}
                  className="w-full py-2.5 rounded bg-[#2cbb5d] hover:bg-[#2cbb5d]/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-xs"
                >
                  {creatingContest ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Contest...
                    </>
                  ) : timingMode === 'now' ? (
                    'Launch Contest Now'
                  ) : (
                    'Schedule Contest'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
