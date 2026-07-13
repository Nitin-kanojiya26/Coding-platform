import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col gap-4 min-h-screen">
      <h2 className="text-2xl font-bold">DevArena</h2>
      <nav className="flex flex-col gap-2">
        <Link to="/dashboard" className="hover:bg-gray-700 p-2 rounded">Dashboard</Link>
        <Link to="/problems" className="hover:bg-gray-700 p-2 rounded">Problems</Link>
        <Link to="/leaderboard" className="hover:bg-gray-700 p-2 rounded">Leaderboard</Link>
        <Link to="/profile" className="hover:bg-gray-700 p-2 rounded">Profile</Link>
        {user?.role === 'admin' && (
          <Link to="/admin" className="hover:bg-gray-700 p-2 rounded">Admin</Link>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;