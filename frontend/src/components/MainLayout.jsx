import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    /* OUTER BOX LAYER: Flat Pure Black Base Void across entire viewport */
    <div className="min-h-screen w-full bg-[#000000] transition-colors duration-250">
      <Navbar />
      
      {/* Structural Containment Shell */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet /> 
      </main>
    </div>
  );
}