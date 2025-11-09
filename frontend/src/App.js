import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import ChatInterface from './pages/ChatInterface';
import Marketplace from './pages/Marketplace';
import Pricing from './pages/Pricing';
import { processSession, getCurrentUser } from './utils/api';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster position="top-right" theme="dark" />
    </BrowserRouter>
  );
}

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // DEVELOPMENT MODE: Mock user for testing without auth
  const DEV_MODE = true;
  const mockUser = {
    id: 'demo-user-123',
    name: 'Demo User',
    email: 'demo@sagent.ai',
    picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces'
  };

  useEffect(() => {
    const initAuth = async () => {
      // Development mode: Skip auth and use mock user
      if (DEV_MODE) {
        setUser(mockUser);
        // Set a mock token for API calls
        localStorage.setItem('session_token', 'dev-mock-token-123');
        setLoading(false);
        return;
      }

      // Check for session_id in URL fragment
      const hash = window.location.hash;
      if (hash && hash.includes('session_id=')) {
        const sessionId = hash.split('session_id=')[1].split('&')[0];
        
        try {
          const response = await processSession(sessionId);
          localStorage.setItem('session_token', response.data.session_token);
          
          // Clean URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Set user
          setUser(response.data);
          setLoading(false);
          
          // Redirect to chat if on landing
          if (location.pathname === '/') {
            navigate('/chat');
          }
          return;
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem('session_token');
        }
      }

      // Check existing session
      const token = localStorage.getItem('session_token');
      if (token) {
        try {
          const response = await getCurrentUser();
          setUser(response.data);
        } catch (error) {
          console.error('Session check error:', error);
          localStorage.removeItem('session_token');
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<ChatInterface user={user || mockUser} />} />
      <Route path="/marketplace" element={<Marketplace user={user || mockUser} />} />
      <Route path="/my-agents" element={<MyAgents user={user || mockUser} />} />
      <Route path="/pricing" element={<Pricing user={user || mockUser} />} />
    </Routes>
  );
}

export default App;