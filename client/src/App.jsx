import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'

// Layout Components
import Layout from './components/Layout/Layout'
import ProtectedRoute from './components/Auth/ProtectedRoute'

// Page Components
import Home from './pages/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import Sessions from './pages/Sessions/Sessions'
import SessionDetail from './pages/Sessions/SessionDetail'
import CreateSession from './pages/Sessions/CreateSession'
import EditSession from './pages/Sessions/EditSession'
import Profile from './pages/Profile/Profile'
import Users from './pages/Admin/Users'
import AdminStats from './pages/Admin/AdminStats'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="sessions/create" element={
                  <ProtectedRoute allowedRoles={['admin', 'speaker']}>
                    <CreateSession />
                  </ProtectedRoute>
                } />
                <Route path="sessions/:id/edit" element={
                  <ProtectedRoute allowedRoles={['admin', 'speaker']}>
                    <EditSession />
                  </ProtectedRoute>
                } />
                <Route path="profile" element={<Profile />} />
                
                {/* Admin Routes */}
                <Route path="admin/users" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="admin/stats" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminStats />
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            {/* Toast Notifications */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  theme: {
                    primary: '#4ade80',
                  },
                },
                error: {
                  duration: 5000,
                  theme: {
                    primary: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
