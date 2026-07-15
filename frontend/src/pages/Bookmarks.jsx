import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { Bookmark, Loader2 } from 'lucide-react';
import DifficultyBadge from '../components/DifficultyBadge';

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const res = await API.get('/users/bookmarks');
        setBookmarks(res.data.bookmarks || []);
      } catch (err) {
        console.error('Failed to fetch bookmarks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookmarks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bookmark className="h-8 w-8 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">Your Bookmarks</h1>
        <span className="text-sm text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {bookmarks.length}
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-slate-800 rounded-2xl bg-slate-900/20">
          <Bookmark className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p>No bookmarks yet.</p>
          <Link to="/problems" className="text-cyan-400 hover:underline text-sm transition-colors duration-200">
            Explore problems →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((problem) => (
            <Link
              key={problem._id}
              to={`/problems/${problem.slug}`}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 transition-all duration-300 card-hover group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold group-hover:text-cyan-400 transition-colors duration-200">
                    {problem.title}
                  </h3>
                  <div className="mt-2">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>
                </div>
                <Bookmark className="h-5 w-5 text-cyan-400 fill-cyan-400/20" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(problem.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}