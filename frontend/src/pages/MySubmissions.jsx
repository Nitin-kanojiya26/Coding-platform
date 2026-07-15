import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await API.get('/submissions/my');
        setSubmissions(res.data.submissions || []);
      } catch (err) {
        console.error('Failed to fetch submissions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const getStatusIcon = (status) => {
    if (status === 'accepted') return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (status === 'wrong_answer') return <XCircle className="h-5 w-5 text-red-400" />;
    return <Clock className="h-5 w-5 text-yellow-400" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">My Submissions</h1>
      {submissions.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 border border-zinc-800 rounded-2xl bg-zinc-950/20">
          <p>No submissions yet.</p>
          <Link to="/problems" className="text-cyan-400 hover:underline text-sm">
            Solve a problem →
          </Link>
        </div>
      ) : (
        <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-zinc-900/60 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Problem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Verdict
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Runtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-zinc-900/30 transition">
                  <td className="px-6 py-4">
                    <Link
                      to={`/problems/${sub.problem?.slug || '#'}`}
                      className="text-cyan-400 hover:underline font-medium"
                    >
                      {sub.problem?.title || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{sub.language}</td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    {getStatusIcon(sub.status)}
                    <span className="text-sm">{sub.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{sub.runtime ?? '—'} ms</td>
                  <td className="px-6 py-4 text-sm text-zinc-300">{sub.memory ?? '—'} MB</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}