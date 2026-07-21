import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function MainLayout() {
  return (
    
    <div className="min-h-screen w-full bg-primary transition-colors duration-250">
      <Navbar />
      
      {/* Structural Containment Shell */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet /> 
      </main>
    </div>
  );
}