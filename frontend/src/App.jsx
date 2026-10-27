import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import Bookmarks from './pages/Bookmarks';
import MySubmissions from './pages/MySubmissions';
import Settings from './pages/Settings';
import CreateProblem from './pages/CreateProblem';
import PublicProfile from './pages/PublicProfile';
import EditProblem from './pages/EditProblem';
import Sheet from './pages/Sheet';
import SheetsList from './pages/SheetsList';
import SubmissionDetail from './pages/SubmissionDetail';
import BuildProblems from './pages/BuildProblems';
import BuildWorkspace from './pages/BuildWorkspace';
import CreateBuildProblem from './pages/CreateBuildProblem';
import Contests from './pages/Contests';
import ContestLobby from './pages/ContestLobby';
import ContestArena from './pages/ContestArena';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg text-text">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Fullscreen Dedicated Arena Workspace */}
      <Route
        path="/contests/:id/arena"
        element={
          <ProtectedRoute>
            <ContestArena />
          </ProtectedRoute>
        }
      />

      {/* Protected Main Layout Pages */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
        <Route path="/problems/:slug" element={<ProtectedRoute><ProblemDetail /></ProtectedRoute>} />
        <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
        <Route path="/contests/:id" element={<ProtectedRoute><ContestLobby /></ProtectedRoute>} />
        <Route path="/build" element={<ProtectedRoute><BuildProblems /></ProtectedRoute>} />
        <Route path="/build/:slug" element={<ProtectedRoute><BuildWorkspace /></ProtectedRoute>} />
        <Route path="/problems/:slug/submissions/:id" element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />
        <Route path="/submissions/:id" element={<ProtectedRoute><SubmissionDetail /></ProtectedRoute>} />
        <Route path="/sheets/:sheetId" element={<ProtectedRoute><Sheet /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
        <Route path="/my-submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/sheets" element={<ProtectedRoute><SheetsList /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/create-problem" element={<AdminRoute><CreateProblem /></AdminRoute>} />
        <Route path="/edit-problem/:id" element={<AdminRoute><EditProblem /></AdminRoute>} />
        <Route path="/create-build-problem" element={<AdminRoute><CreateBuildProblem /></AdminRoute>} />
        <Route path="/edit-build-problem/:slug" element={<AdminRoute><CreateBuildProblem /></AdminRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            gutter={8}
            toastOptions={{
              duration: 3500,
              style: {
                background: 'rgba(10, 10, 10, 0.95)',
                color: '#ffffff',
                border: '1px solid #222222',
                fontSize: '12.5px',
                fontWeight: '500',
                padding: '10px 16px',
                borderRadius: '8px',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                fontFamily: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`,
                letterSpacing: '-0.01em',
              },
              success: {
                iconTheme: {
                  primary: '#2cbb5d',
                  secondary: '#0a0a0a',
                },
                style: {
                  border: '1px solid rgba(44, 187, 93, 0.3)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#0a0a0a',
                },
                style: {
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#f97316',
                  secondary: '#0a0a0a',
                },
                style: {
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}