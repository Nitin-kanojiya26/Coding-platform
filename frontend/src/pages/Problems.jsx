import { useEffect, useState } from 'react';
import api from '../api/client';
import { Link } from 'react-router-dom';

const Problems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/problems')
      .then(res => {
        setProblems(res.data.problems);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8">Loading problems...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Problems</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody>
            {problems.map(p => (
              <tr key={p._id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/problems/${p.slug}`} className="text-blue-600 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${p.difficulty === 'easy' ? 'bg-green-200' : p.difficulty === 'medium' ? 'bg-yellow-200' : 'bg-red-200'}`}>
                    {p.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4">{p.tags.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Problems;