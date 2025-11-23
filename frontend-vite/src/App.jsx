import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import ChatInterface from './pages/ChatInterface';
import Marketplace from './pages/Marketplace';
import Pricing from './pages/Pricing';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* Protected Routes - require sign in */}
        <Route
          path="/chat"
          element={
            <>
              <SignedIn>
                <ChatInterface />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        
        <Route
          path="/agents"
          element={
            <>
              <SignedIn>
                <Marketplace />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        
        <Route
          path="/pricing"
          element={
            <>
              <SignedIn>
                <Pricing />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
      
      <Toaster position="top-right" theme="dark" />
    </BrowserRouter>
  );
}

export default App;