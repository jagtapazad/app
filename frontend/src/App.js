import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
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

  useEffect(() => {
    const initAuth = async () => {
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={
        user ? <ChatPlaceholder user={user} /> : <Navigate to="/" replace />
      } />
      <Route path="/marketplace" element={
        user ? <MarketplacePlaceholder user={user} /> : <Navigate to="/" replace />
      } />
      <Route path="/my-agents" element={
        user ? <MyAgentsPlaceholder user={user} /> : <Navigate to="/" replace />
      } />
      <Route path="/analytics" element={
        user ? <AnalyticsPlaceholder user={user} /> : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

// Placeholder components (will be replaced with full implementations)
function ChatPlaceholder({ user }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1729] to-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-200 to-gray-500 flex items-center justify-center shadow-lg mx-auto">
          <span className="text-3xl font-bold text-black">S</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Welcome, {user.name}!</h1>
        <p className="text-gray-400">Chat interface coming soon...</p>
        <p className="text-sm text-gray-500">Backend is ready. Frontend pages in progress.</p>
      </div>
    </div>
  );
}

function MarketplacePlaceholder({ user }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1729] to-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
        <p className="text-gray-400">14 AI Agents ready to use</p>
      </div>
    </div>
  );
}

function MyAgentsPlaceholder({ user }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1729] to-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">My Agents</h1>
        <p className="text-gray-400">Your subscribed agents</p>
      </div>
    </div>
  );
}

function AnalyticsPlaceholder({ user }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1729] to-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400">Your usage statistics</p>
      </div>
    </div>
  );
}

export default App;