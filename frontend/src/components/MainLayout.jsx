import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  const location = useLocation();
  const isWorkspace = 
    /^\/problems\/[^/]+$/.test(location.pathname) || 
    /^\/build\/[^/]+$/.test(location.pathname);

  return (
    <div className="min-h-screen w-full bg-bg text-text font-sans antialiased flex flex-col selection:bg-accent/30 selection:text-white">
      {/* Navbar Container */}
      <Navbar />

      {/* Main Page Canvas */}
      {isWorkspace ? (
        <main className="w-full flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <main className="w-full flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <Outlet />
        </main>
      )}
    </div>
  );
}
