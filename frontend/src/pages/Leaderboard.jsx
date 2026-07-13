import { useEffect, useState } from 'react';
import api from '../api/client';

const Leaderboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard')
      .then(res => {
        setData(res.data.leaderboard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="bg-white rounded shadow overflow-hidden mt-4">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">#</th>
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Problems Solved</th>
              <th className="px-6 py-3 text-left">Accepted</th>
              <th className="px-6 py-3 text-left">Acceptance Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user, i) => (
              <tr key={user.userId} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{user.rank}</td>
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">{user.problemsSolved}</td>
                <td className="px-6 py-4">{user.acceptedSubmissions}</td>
                <td className="px-6 py-4">{user.acceptanceRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;