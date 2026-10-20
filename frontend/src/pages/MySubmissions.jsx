import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { History, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await API.get('/submissions/my?limit=1000');
        setSubmissions(res.data.submissions || res.data?.data?.submissions || res.data || []);
      } catch (err) {
        console.error('Failed to sync submissions telemetry:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Compute submission statistics
  const stats = useMemo(() => {
    const total = submissions.length;
    const accepted = submissions.filter(s => {
      const st = (s.status || '').toLowerCase();
      return st === 'accepted' || st === 'ac';
    }).length;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    return { total, accepted, rate };
  }, [submissions]);

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
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-10 bg-surface-raised/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 pt-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-text flex items-center gap-2">
            <History className="h-4 w-4 text-accent" /> Submission History
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Complete record of your code executions, memory metrics, and evaluation verdicts.
          </p>
        </div>

        {/* Compact stats summary */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>Total: <strong className="font-mono text-text">{stats.total}</strong></span>
          <span className="text-border/60">•</span>
          <span>Accepted: <strong className="font-mono text-success">{stats.accepted}</strong></span>
          <span className="text-border/60">•</span>
          <span>Pass Rate: <strong className="font-mono text-accent">{stats.rate}%</strong></span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Clock className="h-5 w-5 mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">No submissions recorded yet.</p>
          <Link
            to="/problems"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Start solving problems <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        /* Flat LeetCode Submission Table */
        <div className="border-t border-border/40 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[11px] font-medium text-text-muted select-none">
                <th className="py-2.5 px-3 font-medium">Time Submitted</th>
                <th className="py-2.5 px-3 font-medium">Problem</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Runtime</th>
                <th className="py-2.5 px-3 font-medium text-right">Memory</th>
                <th className="py-2.5 px-3 font-medium pl-6">Language</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/25">
              {submissions.map((sub, idx) => {
                const verdict = getVerdictStyles(sub.status);
                const problemTitle = sub.problem?.title || 'Unknown Problem';
                const problemSlug = sub.problem?.slug || sub.problem?._id || sub.problemId || '#';

                return (
                  <tr
                    key={sub._id || idx}
                    className="hover:bg-surface-raised/35 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-text-muted font-mono text-[11px] whitespace-nowrap">
                      {sub.submittedAt
                        ? new Date(sub.submittedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                        : '—'}
                    </td>

                    {/* Problem Name Link */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={`/problems/${problemSlug}`}
                        className="font-normal text-text hover:text-accent transition-colors inline-flex items-center gap-1 group"
                      >
                        <span className="truncate max-w-[200px] sm:max-w-xs">{problemTitle}</span>
                        <ArrowUpRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Verdict */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Link
                        to={`/submissions/${sub._id}`}
                        className={`${verdict.text} hover:underline inline-flex items-center gap-1 group`}
                        title="View submission details, rate graph, and code"
                      >
                        <span>{verdict.label}</span>
                        <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Runtime */}
                    <td className="py-2.5 px-3 text-right font-mono text-text whitespace-nowrap">
                      {sub.runtime !== undefined && sub.runtime !== null ? `${sub.runtime} ms` : '—'}
                    </td>

                    {/* Memory */}
                    <td className="py-2.5 px-3 text-right font-mono text-text whitespace-nowrap">
                      {sub.memory !== undefined && sub.memory !== null ? `${sub.memory} MB` : '—'}
                    </td>

                    {/* Language */}
                    <td className="py-2.5 px-3 font-mono text-text-muted pl-6 whitespace-nowrap lowercase">
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