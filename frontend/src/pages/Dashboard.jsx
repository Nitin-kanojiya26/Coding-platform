import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    api.get('/users/stats')
      .then(res => setStats(res.data.stats))
      .catch(console.error);
    api.get('/users/activity?limit=5')
      .then(res => setActivity(res.data.activities))
      .catch(console.error);
  }, []);

  const difficultyData = [
    { name: 'Easy', value: stats?.solved?.easy || 0 },
    { name: 'Medium', value: stats?.solved?.medium || 0 },
    { name: 'Hard', value: stats?.solved?.hard || 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Problems Solved</p>
          <p className="text-2xl font-bold">{stats?.solved?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Acceptance Rate</p>
          <p className="text-2xl font-bold">{stats?.acceptanceRate || 0}%</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <p className="text-gray-500">Total Submissions</p>
          <p className="text-2xl font-bold">{stats?.totalSubmissions || 0}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold">Difficulty Distribution</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={difficultyData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-gray-500">No submissions yet.</p>
        ) : (
          <ul>
            {activity.map(a => (
              <li key={a.id} className="border-b py-2">
                <span className="font-medium">{a.problem.title}</span> –{' '}
                <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'accepted' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                  {a.status}
                </span>
                <span className="text-gray-400 text-sm ml-2">{new Date(a.submittedAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;