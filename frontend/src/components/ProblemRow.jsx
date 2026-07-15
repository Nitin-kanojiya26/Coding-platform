import React from 'react';
import { Link } from 'react-router-dom';
import { useBookmark } from '../hooks/useBookmark';
import { Bookmark } from 'lucide-react';
import DifficultyBadge from './DifficultyBadge';

export default function ProblemRow({ problem }) {
  const { isBookmarked, toggleBookmark, loading: bookmarkLoading } = useBookmark(problem._id);

  return (
    <tr className="hover:bg-slate-800/30 transition-colors duration-200">
      <td className="px-6 py-4">{/* status icon */}</td>
      <td className="px-6 py-4">
        <Link
          to={`/problems/${problem.slug}`}
          className="text-cyan-400 hover:underline font-medium transition-colors duration-200"
        >
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
}