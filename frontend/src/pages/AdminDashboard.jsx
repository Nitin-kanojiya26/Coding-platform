import { useEffect, useState } from 'react';
import api from '../api/client';

const AdminDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(res => setData(res.data.data))
      .catch(console.error);
  }, []);

  if (!data) return <div className="text-center p-8">Loading admin data...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
        <div className="bg-white p-4 rounded shadow">Users: {data.totalUsers}</div>
        <div className="bg-white p-4 rounded shadow">Problems: {data.totalProblems}</div>
        <div className="bg-white p-4 rounded shadow">Submissions: {data.totalSubmissions}</div>
        <div className="bg-white p-4 rounded shadow">Accepted: {data.acceptedSubmissions}</div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <p>Acceptance Rate: {data.acceptanceRate}%</p>
        <p>Easy: {data.problems.easy}, Medium: {data.problems.medium}, Hard: {data.problems.hard}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;