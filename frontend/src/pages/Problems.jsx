import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBookmark } from '../hooks/useBookmark';
import { Search, Bookmark, CheckCircle, Circle } from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

// 🔥 LOCAL COMPONENT – no new file needed
const ProblemRow = ({ problem, isSolved }) => {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <tr className="hover:bg-slate-800/30 transition-colors duration-200">
      <td className="px-6 py-4">
        {isSolved ? (
          <CheckCircle className="h-5 w-5 text-emerald-400" />
        ) : (
          <Circle className="h-5 w-5 text-slate-600" />
        )}
      </td>
      <td className="px-6 py-4">
        <Link to={`/problems/${problem.slug}`} className="text-cyan-400 hover:underline font-medium">
          {problem.title}
        </Link>
      </td>
      <td className="px-6 py-4">
        <DifficultyBadge difficulty={problem.difficulty} />
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {problem.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="bg-slate-800 px-2 py-0.5 rounded text-xs text-slate-400">
              {tag}
            </span>
          ))}
          {problem.tags.length > 3 && (
            <span className="text-xs text-slate-500">+{problem.tags.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <button
          onClick={toggleBookmark}
          disabled={bookmarkLoading}
          className="p-1.5 rounded-lg hover:bg-slate-800 transition-all duration-200"
        >
          <Bookmark
            className={`h-5 w-5 transition-all duration-200 ${
              isBookmarked ? 'fill-cyan-400 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          />
        </button>
      </td>
    </tr>
  );
};

export default function Problems() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    API.get('/problems')
      .then((res) => {
        setProblems(res.data.problems);
        setFiltered(res.data.problems);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      const result = problems.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
      setFiltered(result);
    } else {
      setFiltered(problems);
    }
  }, [searchTerm, problems]);

  const solvedIds = user?.solvedProblems?.map((p) => p._id) || [];

  if (loading) return <div className="text-center py-12 text-slate-400">Loading problems...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Problems</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search problems..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all duration-200"
        />
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-800/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tags</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Bookmark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((problem) => (
              <ProblemRow key={problem._id} problem={problem} isSolved={solvedIds.includes(problem._id)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500">No problems match your search.</div>
        )}
      </div>
    </div>
  );
}