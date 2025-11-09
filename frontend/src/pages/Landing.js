import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, Star, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { submitWaitlist, getCurrentUser } from '@/utils/api';

export default function Landing() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [showTopEmailInput, setShowTopEmailInput] = useState(false);
  const [topEmail, setTopEmail] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('session_token');
    if (token) {
      try {
        const response = await getCurrentUser();
        setUser(response.data);
      } catch (error) {
        console.error('Not authenticated');
      }
    }
  };

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
      setTimeout(() => {
        setIsWaitlistOpen(false);
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleTopWaitlistSubmit = async () => {
    if (!topEmail) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      // For top section, we'll just collect email without name
      await submitWaitlist({ email: topEmail, name: 'Waitlist User' });
      toast.success('Successfully joined the waitlist!');
      setTopEmail('');
      setShowTopEmailInput(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const handleBottomWaitlistSubmit = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await submitWaitlist({ email, name: 'Waitlist User' });
      toast.success('Successfully joined the waitlist!');
      setEmail('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  const openWaitlist = () => {
    setIsWaitlistOpen(true);
    setSubmitted(false);
    setName('');
    if (!email && topEmail) {
      setEmail(topEmail);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated glowing background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[180px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          {/* Logo */}
          <img 
            src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png" 
            alt="Sagent AI Logo" 
            className="w-12 h-12 object-contain"
          />
          <span className="text-2xl font-medium text-white">agent AI</span>
        </div>
        {user ? (
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 border border-white/20"
            onClick={() => navigate('/chat')}
            data-testid="chat-button"
          >
            Chat
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 border border-white/20"
            onClick={() => {
              const redirectUrl = `${window.location.origin}/chat`;
              window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
            }}
            data-testid="signin-button"
          >
            Sign In
          </Button>
        )}
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        {/* Hero Content */}
        <div className="text-center space-y-8 mb-32">
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold leading-tight text-white">
            Let the Right AI
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Handle Your Task.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Sagent AI intelligently routes your queries to specialized agents,
            delivering comprehensive results beyond what any single AI can provide.
          </p>

          {/* Top Join Waitlist - Shows email input on click */}
          <div className="mt-12">
            {!showTopEmailInput ? (
              <Button
                onClick={() => setShowTopEmailInput(true)}
                className="h-14 px-8 bg-white text-black hover:bg-gray-200 font-medium text-lg"
                data-testid="top-join-waitlist-button"
              >
                Join Waitlist
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Enter your email..."
                    value={topEmail}
                    onChange={(e) => setTopEmail(e.target.value)}
                    className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-14 text-base backdrop-blur-sm"
                    data-testid="top-email-input"
                    autoFocus
                  />
                  <Button
                    onClick={handleTopWaitlistSubmit}
                    disabled={loading || !topEmail}
                    className="h-14 px-6 bg-white text-black hover:bg-gray-200 font-medium"
                    data-testid="top-go-button"
                  >
                    {loading ? 'Joining...' : 'Go'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Integrated Agents Section */}
        <div className="text-center mb-20">
          <p className="text-gray-500 text-sm uppercase tracking-wider mb-8">Integrated with 30+ AI Agents</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-4xl font-bold text-white mb-2">30+</div>
              <div className="text-sm text-gray-400">Context Handling</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-4xl font-bold text-green-400 mb-2">↓60%</div>
              <div className="text-sm text-gray-400">TAT</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-4xl font-bold text-blue-400 mb-2">80%</div>
              <div className="text-sm text-gray-400">Increased Precision</div>
            </div>
            <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-4xl font-bold text-purple-400 mb-2">40%</div>
              <div className="text-sm text-gray-400">Platform Retention</div>
            </div>
          </div>
        </div>

        {/* One Super Agent Section */}
        <div className="text-center mb-32">
          <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            One Super Agent.
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Infinite capabilities.
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Stop switching between multiple AI tools. Sagent AI orchestrates the best agents
            for your specific needs, delivering comprehensive, multi-dimensional insights.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-32">
          <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Market Research</h3>
            <p className="text-gray-400 leading-relaxed">
              Aggregate insights from multiple specialized research agents to get comprehensive market analysis in seconds.
            </p>
          </div>

          <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Scientific Research</h3>
            <p className="text-gray-400 leading-relaxed">
              Route complex scientific queries to specialized agents for accurate, citation-backed research.
            </p>
          </div>

          <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">People Search</h3>
            <p className="text-gray-400 leading-relaxed">
              Find and analyze information about people across multiple sources with intelligent agent routing.
            </p>
          </div>
        </div>

        {/* Chat Interface Demo */}
        <div className="mb-32">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">See It In Action</h2>
            <p className="text-gray-400 text-lg">Watch how Sagent AI delivers comprehensive, multi-dimensional research</p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto">
            {/* Demo Chat Query */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-3">Find me reddits where users want 10-minute fashion delivery</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Research completed in 12 seconds</span>
              </div>
            </div>

            {/* Demo Answer */}
            <div className="space-y-6">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Answer</div>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p className="text-lg">
                    <strong className="text-white">10-minute fashion delivery</strong> is a concept that has sparked curiosity and debate among Reddit users, 
                    especially in entrepreneurial and urban communities. Many users are intrigued by the idea of getting clothes delivered as quickly 
                    as groceries or food, but there are also concerns about feasibility, worker conditions, and real user demand.
                  </p>
                  
                  <div className="bg-black/30 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-sm italic text-gray-400">
                      "An instant fashion delivery app which can deliver you clothes just like blinkit delivers groceries or zomato delivers food."
                    </p>
                    <p className="text-xs text-gray-500 mt-2">— r/StartUpIndia</p>
                  </div>

                  <h4 className="text-xl font-semibold text-white mt-6">Reddit Threads Discussing 10-Minute Fashion Delivery</h4>
                  
                  <div className="space-y-3">
                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-400 font-bold">1</span>
                        </div>
                        <div>
                          <h5 className="text-white font-medium mb-1">Would you use an Instant Fashion Delivery App?</h5>
                          <p className="text-sm text-gray-400">reddit.com - Discussion on practicality and demand</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-400 font-bold">2</span>
                        </div>
                        <div>
                          <h5 className="text-white font-medium mb-1">Fashion Delivery in 29 minutes - A Good Idea?</h5>
                          <p className="text-sm text-gray-400">r/Startup_Ideas - Users debate implementation challenges</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-400 font-bold">3</span>
                        </div>
                        <div>
                          <h5 className="text-white font-medium mb-1">Worked part-time at Blinkit — 10-minute delivery reality</h5>
                          <p className="text-sm text-gray-400">r/pune - Worker shares experience with quick delivery</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-gray-400">
                    Several Reddit communities have explored the idea of <strong className="text-white">instant or 10-minute fashion delivery apps</strong>, 
                    with users weighing in on whether they would use such a service and what challenges might arise.
                  </p>
                </div>
              </div>
            </div>

            {/* Agent Badges */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs text-gray-500 mb-3">Powered by</div>
              <div className="flex gap-2 flex-wrap">
                {['Perplexity', 'Exa', 'Scira AI'].map(agent => (
                  <span key={agent} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-300">
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="mb-32">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Trusted by Industry Leaders</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "Sagent AI has completely transformed our research workflow. What used to take our team 3-4 hours now happens in minutes. The multi-agent routing is brilliant."
              </p>
              <div>
                <div className="text-white font-medium">Rajesh Kumar</div>
                <div className="text-gray-500 text-sm">Product, Meesho</div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "The ability to get comprehensive insights from multiple AI agents simultaneously is a game-changer. We've seen a 60% reduction in research time."
              </p>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces" 
                  alt="Priya Sharma"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="text-white font-medium">Priya Sharma</div>
                  <div className="text-gray-500 text-sm">Head of Strategy, Zepto</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, idx) => (
                  <Star key={idx} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                "Finally, an AI platform that understands context and routes to the right specialist. Our team's productivity has increased by 40% since adopting Sagent AI."
              </p>
              <div className="flex items-center gap-3">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces" 
                  alt="Arjun Patel"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="text-white font-medium">Arjun Patel</div>
                  <div className="text-gray-500 text-sm">Director of Analytics, Walmart</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to experience
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              intelligent AI routing?
            </span>
          </h2>
          
          {/* Bottom Email + Join Waitlist */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-14 text-base backdrop-blur-sm"
                data-testid="bottom-email-input"
              />
              <Button
                onClick={handleBottomWaitlistSubmit}
                disabled={loading || !email}
                className="h-14 px-8 bg-white text-black hover:bg-gray-200 font-medium text-lg whitespace-nowrap"
                data-testid="bottom-join-button"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 text-center text-gray-600 text-sm border-t border-white/10">
        <p>&copy; 2025 Sagent AI. All rights reserved.</p>
      </footer>

      {/* Waitlist Modal */}
      <Dialog open={isWaitlistOpen} onOpenChange={setIsWaitlistOpen}>
        <DialogContent className="bg-black/95 border border-white/20 backdrop-blur-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">Join the Waitlist</DialogTitle>
          </DialogHeader>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6 mt-4" data-testid="waitlist-form">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Email Address</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-12 text-base"
                    data-testid="waitlist-email-input"
                    readOnly={email}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Your Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-12 text-base"
                    data-testid="waitlist-name-input"
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-gray-200 font-medium"
                data-testid="waitlist-submit-button"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
                {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </form>
          ) : (
            <div className="py-8" data-testid="waitlist-success">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                  <p className="text-gray-400">We'll notify you when Sagent AI launches.</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}