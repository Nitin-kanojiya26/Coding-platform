import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">DevArena</h1>
      <div className="flex items-center gap-3">
        <span>{user?.name || 'Guest'}</span>
        <img
          src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
          alt="avatar"
          className="w-8 h-8 rounded-full"
        />
      </div>
    </header>
  );
};

export default Navbar;