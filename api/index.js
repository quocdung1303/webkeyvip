import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ Loaded user from localStorage:', parsedUser);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('❌ Error loading user from localStorage:', error);
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user));
        console.log('💾 Saved user to localStorage:', user);
      } catch (error) {
        console.error('❌ Error saving user to localStorage:', error);
      }
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogin = (userData) => {
    console.log('🔐 Login successful:', userData);
    setUser(userData);
  };

  const handleLogout = () => {
    console.log('👋 Logging out...');
    setUser(null);
    localStorage.removeItem('user');
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, adminOnly = false }) => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{ color: 'white', fontSize: '20px' }}>Đang tải...</div>
        </div>
      );
    }

    if (!user) {
      console.log('⚠️ Not authenticated, redirecting to login');
      return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role !== 'admin') {
      console.log('⚠️ Not admin, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  // Public Route (redirect if already logged in)
  const PublicRoute = ({ children }) => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{ color: 'white', fontSize: '20px' }}>Đang tải...</div>
        </div>
      );
    }

    if (user) {
      console.log('✅ Already logged in, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }

    return children;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '20px' }}>Đang tải...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login onLogin={handleLogin} />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register onRegister={handleLogin} />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <Admin user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
