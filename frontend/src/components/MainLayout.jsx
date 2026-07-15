import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen w-full bg-[#0f172a]">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />  // ← This renders the nested route (Dashboard, Problems, etc.)
      </main>
    </div>
  );
}