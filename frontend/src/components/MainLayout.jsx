import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    <div className="min-h-screen w-full bg-bg text-text font-sans antialiased flex flex-col selection:bg-accent/30 selection:text-white">
      {/* Floating Header Container */}
      <Navbar />

      {/* Main Page Canvas */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5 w-full flex-1">
        <Outlet />
      </main>
    </div>
  );
}
