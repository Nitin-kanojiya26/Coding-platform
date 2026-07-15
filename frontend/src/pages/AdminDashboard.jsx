import React, { useState, useEffect } from 'react';
import API from '../api/client';
import { Shield, Users, FileText, Code, CheckCircle, Loader2, Ban, ShieldCheck } from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const cards = [
    { icon: Users, label: 'Users', value: data?.totalUsers || 0, color: 'text-blue-400' },
    { icon: FileText, label: 'Problems', value: data?.totalProblems || 0, color: 'text-purple-400' },
    { icon: Code, label: 'Submissions', value: data?.totalSubmissions || 0, color: 'text-cyan-400' },
    { icon: CheckCircle, label: 'Accepted', value: data?.acceptedSubmissions || 0, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 transition-all duration-200 hover:border-cyan-500/30 card-hover"
          >
            <div className="flex items-center gap-3">
              <card.icon className={`h-6 w-6 ${card.color}`} />
              <div>
                <p className="text-sm text-slate-400">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Platform Overview
        </h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-slate-500">Acceptance Rate</p>
            <p className="text-2xl font-bold text-cyan-400">{data?.acceptanceRate || 0}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Problems by Difficulty</p>
            <div className="flex gap-3 mt-1">
              <span className="text-emerald-400">Easy: {data?.problems?.easy || 0}</span>
              <span className="text-amber-400">Medium: {data?.problems?.medium || 0}</span>
              <span className="text-rose-400">Hard: {data?.problems?.hard || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User list (simplified) */}
      {data?.users && data.users.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-800/30">
                <tr>
                  <th className="px-6 py-2 text-left text-xs text-slate-500">Name</th>
                  <th className="px-6 py-2 text-left text-xs text-slate-500">Email</th>
                  <th className="px-6 py-2 text-left text-xs text-slate-500">Role</th>
                  <th className="px-6 py-2 text-left text-xs text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.users.slice(0, 5).map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/20 transition-colors duration-200">
                    <td className="px-6 py-2 text-sm text-white">{u.name}</td>
                    <td className="px-6 py-2 text-sm text-slate-400">{u.email}</td>
                    <td className="px-6 py-2 text-sm text-slate-400 capitalize">{u.role}</td>
                    <td className="px-6 py-2 text-sm">
                      {u.isBanned ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <Ban className="h-3 w-3" /> Banned
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}