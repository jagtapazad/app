import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Sparkles, Network, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { submitWaitlist } from '@/utils/api';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await submitWaitlist({ email, name });
      setSubmitted(true);
      toast.success('Successfully joined the waitlist!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f1729] to-[#0a0a0f] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <header className="relative z-10 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-200 to-gray-500 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-black">S</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">agent AI</span>
        </div>
        <Button
          variant="ghost"
          className="glass text-white hover:bg-white/10"
          onClick={() => {
            const redirectUrl = `${window.location.origin}/chat`;
            window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
          }}
          data-testid="signin-button"
        >
          Sign In
        </Button>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">AI-Powered Agent Orchestration</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Smarter Research.
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Better Results.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            Sagent AI orchestrates specialized AI agents to deliver comprehensive,
            multi-dimensional research beyond what any single AI can provide.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-xl mx-auto mt-12" data-testid="waitlist-form">
              <div className="glass-strong rounded-2xl p-8 space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12"
                  data-testid="waitlist-name-input"
                />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12"
                  data-testid="waitlist-email-input"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl"
                  data-testid="waitlist-submit-button"
                >
                  {loading ? 'Joining...' : 'Join Waitlist'}
                  {!loading && <Sparkles className="ml-2 w-4 h-4" />}
                </Button>
              </div>
            </form>
          ) : (
            <div className="max-w-xl mx-auto mt-12 glass-strong rounded-2xl p-8" data-testid="waitlist-success">
              <div className="flex items-center justify-center gap-3 text-green-400">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-lg font-medium">You're on the list!</span>
              </div>
              <p className="text-gray-400 mt-4">We'll notify you when we're ready to launch.</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-32">
          <div className="glass rounded-2xl p-8 space-y-4 hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Network className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">Multi-Agent Orchestration</h3>
            <p className="text-gray-400">
              Intelligently routes queries to specialized agents for comprehensive results.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 space-y-4 hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">Smart UI Generation</h3>
            <p className="text-gray-400">
              Automatically formats responses with graphs, tables, and visual elements.
            </p>
          </div>

          <div className="glass rounded-2xl p-8 space-y-4 hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold">Iterative Refinement</h3>
            <p className="text-gray-400">
              Edit any section of results with natural language instructions.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-8 px-6 text-center text-gray-500 text-sm">
        <p>&copy; 2025 Sagent AI. All rights reserved.</p>
      </footer>
    </div>
  );
}