import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/client';

const Profile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/users/stats')
      .then(res => setStats(res.data.stats))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="bg-white p-4 rounded shadow mt-4">
        <p><strong>Name:</strong> {user?.name}</p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Problems Solved:</strong> {stats?.solved?.total || 0}</p>
        <p><strong>Acceptance Rate:</strong> {stats?.acceptanceRate || 0}%</p>
        <p><strong>Total Submissions:</strong> {stats?.totalSubmissions || 0}</p>
      </div>
    </div>
  );
};

export default Profile;