import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Clock, ArrowUpRight } from 'lucide-react';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await API.get('/submissions/my');
        setSubmissions(res.data.submissions || res.data || []);
      } catch (err) {
        console.error('Failed to sync compilation logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#000000]">
        <div className="w-5 h-5 border-2 border-zinc-800 border-t-space-blue rounded-full animate-spin" />
      </div>
    );
  }

  // Pure LeetCode Verdict Text Colors
  const getVerdictStyles = (status = '') => {
    const lower = status.toLowerCase();
    if (lower === 'accepted' || lower === 'ac') {
      return { text: 'text-emerald-500 font-medium', label: 'Accepted' };
    }
    if (lower === 'wrong_answer' || lower === 'wa') {
      return { text: 'text-rose-500 font-medium', label: 'Wrong Answer' };
    }
    if (lower.includes('compile') || lower === 'ce') {
      return { text: 'text-amber-500 font-medium', label: 'Compile Error' };
    }
    if (lower.includes('runtime') || lower === 'rte') {
      return { text: 'text-rose-500 font-medium', label: 'Runtime Error' };
    }
    if (lower.includes('limit') || lower === 'tle') {
      return { text: 'text-amber-500 font-medium', label: 'Time Limit Exceeded' };
    }
    return { text: 'text-zinc-400', label: status || 'Pending' };
  };

  return (
    <div className="min-h-screen bg-[#000000] px-4 sm:px-8 py-12 text-zinc-400 font-sans antialiased selection:bg-space-blue/10 selection:text-space-blue">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Synced App-Wide Header Style */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-900">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-space-blue" />
              <h1 className="text-base font-semibold text-white tracking-tight">
                All Submissions
              </h1>
            </div>
            <p className="text-xs text-zinc-500">
              Your runtime engine history and solution compilation matrices.
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-zinc-900 rounded-xl bg-[#020203] space-y-3">
            <Clock className="h-5 w-5 mx-auto text-zinc-800" />
            <p className="text-xs font-mono text-zinc-600">NO_SUBMISSIONS_LOGGED</p>
            <Link 
              to="/problems" 
              className="inline-flex items-center gap-1 text-xs text-space-blue hover:text-white transition-colors duration-150"
            >
              Scan main directory <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          /* Synced Border Layout with LeetCode Denseness */
          <div className="border border-zinc-900 rounded-xl bg-[#050507] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-5 font-medium">Time Submitted</th>
                    <th className="py-3 px-5 font-medium">Question</th>
                    <th className="py-3 px-5 font-medium">Status</th>
                    <th className="py-3 px-5 font-medium text-right">Runtime</th>
                    <th className="py-3 px-5 font-medium text-right">Memory</th>
                    <th className="py-3 px-5 font-medium pl-8">Language</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 font-sans text-xs">
                  {submissions.map((sub, idx) => {
                    const verdict = getVerdictStyles(sub.status);
                    
                    return (
                      <tr 
                        key={sub._id || idx} 
                        className="group hover:bg-[#08080b]/60 transition-colors duration-150"
                      >
                        {/* Time Column */}
                        <td className="py-3.5 px-5 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                          {sub.submittedAt 
                            ? new Date(sub.submittedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })
                            : '—'
                          }
                        </td>

                        {/* Question Name Column */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <Link
                            to={`/problems/${sub.problem?.slug || '#'}`}
                            className="font-medium text-zinc-200 group-hover:text-white hover:!text-space-blue transition-colors duration-150 inline-flex items-center gap-1"
                          >
                            {sub.problem?.title || 'Unknown Problem'}
                            <ArrowUpRight className="h-3 w-3 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>

                        {/* LeetCode Pure Status Text */}
                        <td className="py-3.5 px-5 whitespace-nowrap text-sm">
                          <span className={verdict.text}>
                            {verdict.label}
                          </span>
                        </td>

                        {/* Performance Diagnostics */}
                        <td className="py-3.5 px-5 text-right font-mono text-zinc-300 whitespace-nowrap">
                          {sub.runtime !== undefined && sub.runtime !== null ? `${sub.runtime} ms` : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-zinc-300 whitespace-nowrap">
                          {sub.memory !== undefined && sub.memory !== null ? `${sub.memory} MB` : '—'}
                        </td>

                        {/* Language Block */}
                        <td className="py-3.5 px-5 font-mono text-zinc-400 pl-8 whitespace-nowrap lowercase">
                          {sub.language || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}