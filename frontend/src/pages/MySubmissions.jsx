import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { History, ArrowUpRight, Clock } from 'lucide-react';

export default function MySubmissions() {
  const [dsaSubmissions, setDsaSubmissions] = useState([]);
  const [buildSubmissions, setBuildSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'dsa' | 'build'

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const [dsaRes, buildRes] = await Promise.all([
          API.get('/submissions/my?limit=1000').catch(() => ({ data: { submissions: [] } })),
          API.get('/build/submissions').catch(() => ({ data: { submissions: [] } })),
        ]);

        const rawDsa = dsaRes.data?.submissions || dsaRes.data?.data?.submissions || dsaRes.data || [];
        const rawBuild = buildRes.data?.submissions || buildRes.data?.data?.submissions || buildRes.data || [];

        setDsaSubmissions(Array.isArray(rawDsa) ? rawDsa : []);
        setBuildSubmissions(Array.isArray(rawBuild) ? rawBuild : []);
      } catch (err) {
        console.error('Failed to sync submissions telemetry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Normalize DSA and Build submissions into a unified stream
  const unifiedStream = useMemo(() => {
    const normalizedDsa = dsaSubmissions.map((s) => ({
      _id: s._id,
      type: 'dsa',
      title: s.problem?.title || 'Unknown Problem',
      slug: s.problem?.slug || s.problem?._id,
      linkUrl: `/problems/${s.problem?.slug || s.problem?._id || '#'}`,
      status: s.status || 'Pending',
      runtime: s.runtime,
      memory: s.memory,
      score: null,
      passed: null,
      total: null,
      language: s.language || 'cpp',
      submittedAt: s.submittedAt || s.createdAt,
    }));

    const normalizedBuild = buildSubmissions.map((s) => ({
      _id: s._id,
      type: 'build',
      title: s.problemId?.title || 'Build API Challenge',
      slug: s.problemId?.slug,
      linkUrl: `/build/${s.problemId?.slug || '#'}`,
      status: s.status || 'Pending',
      runtime: null,
      memory: null,
      score: s.score ?? 0,
      passed: s.passed ?? 0,
      total: s.total ?? 0,
      language: 'Node.js',
      submittedAt: s.createdAt,
    }));

    return [...normalizedDsa, ...normalizedBuild].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
  }, [dsaSubmissions, buildSubmissions]);

  // Filtered submissions based on active category tab
  const filteredSubmissions = useMemo(() => {
    if (activeTab === 'dsa') return unifiedStream.filter((s) => s.type === 'dsa');
    if (activeTab === 'build') return unifiedStream.filter((s) => s.type === 'build');
    return unifiedStream;
  }, [unifiedStream, activeTab]);

  // Compute submission statistics
  const stats = useMemo(() => {
    const total = filteredSubmissions.length;
    const accepted = filteredSubmissions.filter((s) => {
      const st = (s.status || '').toLowerCase();
      return st === 'accepted' || st === 'ac';
    }).length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, rate };
  }, [filteredSubmissions]);

  // Verdict text styling
  const getVerdictStyles = (status = '') => {
    const lower = status.toLowerCase();
    if (lower === 'accepted' || lower === 'ac') {
      return { text: 'text-success font-medium', label: 'Accepted' };
    }
    if (lower === 'wrong_answer' || lower === 'wrong answer' || lower === 'wa') {
      return { text: 'text-danger font-medium', label: 'Wrong Answer' };
    }
    if (lower.includes('compile') || lower === 'ce') {
      return { text: 'text-warning font-medium', label: 'Compile Error' };
    }
    if (lower.includes('runtime') || lower === 'rte') {
      return { text: 'text-danger font-medium', label: 'Runtime Error' };
    }
    if (lower.includes('limit') || lower === 'tle') {
      return { text: 'text-warning font-medium', label: 'Time Limit Exceeded' };
    }
    return { text: 'text-text-muted', label: status || 'Pending' };
  };

  if (loading) {
    return (
      <div className="w-full space-y-4 pt-2 animate-pulse">
        <div className="h-6 w-44 bg-surface-raised rounded" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 pt-1 pb-12 text-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <History className="h-4 w-4 text-accent" /> Submission History
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            View all your past code runs, test results, and submission history.
          </p>
        </div>

        {/* Compact stats summary */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            Total: <strong className="text-text">{stats.total}</strong>
          </span>
          <span className="text-border/60">•</span>
          <span>
            Accepted: <strong className="text-success">{stats.accepted}</strong>
          </span>
          <span className="text-border/60">•</span>
          <span>
            Pass Rate: <strong className="text-accent">{stats.rate}%</strong>
          </span>
        </div>
      </div>

      {/* Minimal Category Tabs */}
      <div className="flex items-center gap-5 border-b border-border/30 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'all'
              ? 'border-accent text-text font-semibold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          All Submissions ({unifiedStream.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dsa')}
          className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'dsa'
              ? 'border-accent text-text font-semibold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Algorithms ({dsaSubmissions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('build')}
          className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'build'
              ? 'border-accent-build text-accent-build font-semibold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          Backend APIs ({buildSubmissions.length})
        </button>
      </div>

      {/* Flat Seamless Submission Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Clock className="h-5 w-5 mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">No submissions recorded yet.</p>
          <Link
            to={activeTab === 'build' ? '/build' : '/problems'}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Start solving problems <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                <th className="py-2.5 px-3 font-medium">Time Submitted</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium">Problem</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Runtime / Score</th>
                <th className="py-2.5 px-3 font-medium text-right">Memory / Tests</th>
                <th className="py-2.5 px-3 font-medium pl-6">Language</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/25">
              {filteredSubmissions.map((sub, idx) => {
                const verdict = getVerdictStyles(sub.status);

                return (
                  <tr
                    key={sub._id || idx}
                    className="hover:bg-surface-raised/35 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-text-muted text-[11px] whitespace-nowrap">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : '—'}
                    </td>

                    {/* Type Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {sub.type === 'build' ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-build/15 text-accent-build">
                          API
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-raised text-text-muted">
                          DSA
                        </span>
                      )}
                    </td>

                    {/* Problem Name Link */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={sub.linkUrl}
                        className="font-normal text-text hover:text-accent transition-colors inline-flex items-center gap-1 group"
                      >
                        <span className="truncate max-w-[200px] sm:max-w-xs">{sub.title}</span>
                        <ArrowUpRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Verdict */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={`/submissions/${sub._id}`}
                        className={`${verdict.text} hover:underline inline-flex items-center gap-1 group`}
                        title="View submission details and code"
                      >
                        <span>{verdict.label}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Runtime / Score */}
                    <td className="py-2.5 px-3 text-right text-text whitespace-nowrap">
                      {sub.type === 'build'
                        ? `${sub.score ?? 0}%`
                        : sub.runtime !== undefined && sub.runtime !== null
                        ? `${sub.runtime} ms`
                        : '—'}
                    </td>

                    {/* Memory / Tests */}
                    <td className="py-2.5 px-3 text-right text-text whitespace-nowrap">
                      {sub.type === 'build'
                        ? `${sub.passed ?? 0}/${sub.total ?? 0} tests`
                        : sub.memory !== undefined && sub.memory !== null
                        ? `${sub.memory} MB`
                        : '—'}
                    </td>

                    {/* Language */}
                    <td className="py-2.5 px-3 text-text-muted pl-6 whitespace-nowrap lowercase">
                      {sub.language || '—'}
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