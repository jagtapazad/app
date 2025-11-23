import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, Star, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import { submitWaitlist, getCurrentUser } from '@/utils/api.js';
import PrismaticBurst from "@/components/LandingPage/PrismaticBurst";
import { useRef } from "react";
import useScrollReveal from "@/hooks/useScrollReveal";
import TypingText from "@/components/LandingPage/TypingText";
import MagicBento_Agents from "@/components/LandingPage/MagicBento_Agents";
import MagicBento_Research from "@/components/LandingPage/MagicBento_Research";
import MagicBento_Testimonials from "@/components/LandingPage/MagicBento_Testimonials";
//Clerk Authentication
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';





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
  
  // Scroll Animation Refs
  const agentsRef = useRef(null);
  const superAgentRef = useRef(null);
  const useCasesRef = useRef(null);
  const demoRef = useRef(null);
  const testimonialsRef = useRef(null);
  const ctaRef = useRef(null);

  // Activate Scroll Animations
  useScrollReveal(agentsRef);
  useScrollReveal(superAgentRef);
  useScrollReveal(useCasesRef);
  useScrollReveal(demoRef);
  useScrollReveal(testimonialsRef);
  useScrollReveal(ctaRef);

  useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        }
      });
    },
    { threshold: 0.15 }
  );

  const elements = document.querySelectorAll(".reveal-on-scroll");
  elements.forEach(el => observer.observe(el));

  return () => observer.disconnect();
}, []);


  const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 40);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
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
    <div className="min-h-screen relative overflow-hidden ">


  {/* Header */}
  <header
    className={`
      fixed left-0 top-0 w-full z-40 transition-all duration-500 
      ${scrolled ? "pointer-events-none" : ""}
    `}
  >
    <div
      className={`
        mx-auto flex items-center justify-between transition-all duration-500
        ${scrolled
          ? "max-w-3xl mt-4 px-6 py-3 rounded-3xl bg-black/20 backdrop-blur-xl border-white/20 shadow-xl pointer-events-auto"
          : "max-w-7xl px-6 py-6 bg-transparent pointer-events-auto"
        }
      `}
    >
      {/* LOGO */}
      <div className="flex items-center gap-2 transition-all duration-500">
        <img
          src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png"
          alt="Sagent AI Logo"
          className={`object-contain transition-all duration-500
            ${scrolled ? "w-8 h-8" : "w-12 h-12"}
          `}
        />
        <span
          className={`
            text-white font-stacksans font-semibold transition-all duration-500
            ${scrolled ? "text-lg" : "text-2xl"}
          `}
        >
          agent AI
        </span>
      </div>

      {/* SIGN IN / USER SECTION */}
      <div className="flex items-center gap-3">
        {/* Shows only when user is NOT signed in */}
        <SignedOut>
          <SignInButton mode="modal">
            <Button
              variant="ghost"
              className={`
                text-white
                font-stacksans
                ${scrolled ? "px-4 py-1 text-sm" : "px-6 py-2 text-base"}
              `}
            >
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>

        {/* Shows only when user IS signed in */}
        <SignedIn>
          <Button
            variant="ghost"
            className={`
              text-white font-stacksans 
              bg-gradient-to-r from-cyan-500/15 to-blue-700/15
              /* Hover state */
              hover:text-white
              hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-blue-700/30
              hover:border-transparent transition-all duration-500
              ${scrolled ? "px-4 py-1 text-sm" : "px-6 py-2 text-base"}
            `}
            onClick={() => navigate("/chat")}
          >
            Chat
          </Button>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </div>
  </header>


      {/* Spacer so content doesn’t jump under navbar */}
      <div className="h-24"></div>


      {/* Hero Section */}

       {/* Full-Screen Hero Section */}
        <section className="relative z-20 h-screen flex flex-col text-center px-6 pointer-events-none">

          {/* HERO TITLE — centered vertically */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="font-stacksans font-[650] text-5xl sm:text-7xl lg:text-8xl font-bold leading-tight text-white flex flex-col items-center gap-4">
              <span>Let the Right AI</span>

              <TypingText
                text={["Handle Your Task.", "Build Your Product.", "Design Your Ideas."]}
                typingSpeed={75}
                pauseDuration={2500}
                showCursor={true}
                cursorCharacter=""
                className="text-5xl sm:text-7xl lg:text-8xl font-bold leading-tight "
                gradientClasses={[
                  "bg-gradient-to-b from-[#8CFFDE] to-[#75E7FF]",   // Neon Blue → Deep Blue
                  "bg-gradient-to-b from-[#75AEFF] to-[#54F8FF]",   // Purple → Deep Violet
                  "bg-gradient-to-b from-[#A8ADFF] to-[#75FFFF]"    // Aqua → Cyan Blue
                ]}
                
                variableSpeed={{ min: 50, max: 120 }}
              />
            </h1>
          </div>

          {/* SUBTITLE + BUTTON — sits below, with large spacing */}
          <div className="mt-8 sm:mt-12 lg:mt-16 mb-40 pointer-events-auto flex flex-col items-center gap-10">
            <p className="font-stacksans text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed tracking-tight">
              Sagent AI intelligently routes your queries to specialized agents,
              delivering comprehensive results beyond what any single AI can provide.
            </p>

            {!showTopEmailInput ? (
              <Button
                onClick={() => setShowTopEmailInput(true)}
                className="
                  h-14 px-8 font-stacksans font-medium text-lg transition-all duration-300

                  /* Default state */
                  bg-black/25 
                  backdrop-blur-md  
                  text-white/60

                  /* Hover state */
                  hover:text-white
                  hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-700/20
                  hover:border-transparent
                  
                "
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
                    className="flex-1 bg-white/5 border-white/0 text-white font-stacksans 
                      placeholder:text-gray-500 h-14 w-96 
                      placeholder:text-[15px] placeholder:font-stacksans 
                      !text-[15px]
                      backdrop-blur-sm
                      focus:bg-white/10
                      focus:outline-none
                      focus:ring-0
                      focus-visible:ring-0
                      focus:border-white/0"
                    autoFocus
                  />
                  <Button
                    onClick={handleTopWaitlistSubmit}
                    disabled={loading || !topEmail}
                    className="h-14 px-8 font-stacksans font-medium text-lg transition-all duration-300

                      /* Default state */
                      bg-black/25 
                      backdrop-blur-md
                      bg-gradient-to-r from-cyan-500/10 to-blue-700/10
                      
                      text-white/60

                      /* Hover state */
                      hover:text-white
                      hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-700/20
                      hover:border-transparent"
                      >
                    {loading ? "Joining..." : "Go"}
                  </Button>
                </div>
              </div>
            )}
          </div>

        </section>



   
      <main className="relative z-20 max-w-6xl mx-auto px-6 py-20 pointer-events-none">
        
        {/* Integrated Agents Section */}
        <div ref={agentsRef} className="reveal-on-scroll text-center mb-20">
          <h2 className="font-stacksans text-5xl sm:text-6xl font-bold text-white mb-20">
            Integrated With
            <br />
            <span className="font-stacksans bg-gradient-to-b from-[#A8ADFF] to-[#75FFFF] bg-clip-text text-transparent">
              30+ AI Agents.
            </span>
            
          </h2>

          {/* Magic Bento Cards */}
          <div className="flex justify-center">
            <MagicBento_Agents
              enableTilt={true}
              enableMagnetism={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              particleCount={8}
              glowColor="0, 200, 255"     // cyan glow (adjust if needed)
              spotlightRadius={260}
              textAutoHide={false}        // show full text
              clickEffect={false}         // optional
            />
          </div>
        </div>

        {/* One Super Agent Section */}
        <div ref={superAgentRef} className="reveal-on-scroll text-center mb-40">
          <h2 className="font-stacksans text-5xl sm:text-6xl font-bold text-white mb-6">
            One Super Agent.
            <br />
            <span className="font-stacksans bg-gradient-to-b from-[#A8ADFF] to-[#75FFFF] bg-clip-text text-transparent">
              Infinite capabilities.
            </span>
          </h2>
          <p className="font-stacksans text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed tracking-tight">
            Stop switching between multiple AI tools. Sagent AI orchestrates the best agents
            for your specific needs, delivering comprehensive, multi-dimensional insights.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div ref={useCasesRef} className="reveal-on-scroll mb-32 pointer-events-none text-center">
          
          <h2 className="font-stacksans text-5xl sm:text-6xl font-bold text-white mb-16">
            <span className="font-stacksans bg-gradient-to-b from-[#8CFFDE] to-[#75E7FF] bg-clip-text text-transparent">
              Powerful Use Cases
            </span>
          </h2>

          <MagicBento_Research
            enableStars={true}
            enableMagnetism={true}
            enableTilt={false}
            glowColor="0, 238, 255"
            particleCount={10}
            spotlightRadius={250}
          />
        </div>


        {/* Chat Interface Demo */}
        <div ref={demoRef} className="reveal-on-scroll mb-32">
          <div className="text-center mb-12">
            <h2 className="font-stacksans text-6xl font-bold text-white mb-4">See It In Action</h2>
            <p className="font-stacksans text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed tracking-tight">Watch how Sagent AI delivers comprehensive, multi-dimensional research</p>
          </div>
          
          <div className="bg-black/25 backdrop-blur-sm border border-white/0 rounded-2xl p-8 max-w-4xl mx-auto pointer-events-auto">
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
                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all backdrop-blur-md">
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

                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all backdrop-blur-md">
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

                    <div className="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all backdrop-blur-md">
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
                  <span key={agent} className="px-3 py-1 bg-cyan-500/10 border border-blue-500/20 rounded-md text-xs text-blue-300">
                    {agent}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div ref={testimonialsRef} className="reveal-on-scroll mb-32 pointer-events-auto">
          <h2 className="font-stacksans text-5xl text-center text-white mb-12">
            Trusted by Industry Leaders
          </h2>

          <MagicBento_Testimonials
             
            />
        </div>

        {/* Final CTA */}
        <div ref={ctaRef} className="reveal-on-scroll text-center">
          <h2 className="font-stacksans text-5xl sm:text-6xl font-bold text-white mb-6">
            Ready to experience
            <br />
            <span className="font-stacksans bg-gradient-to-b from-[#A8ADFF] to-[#75FFFF] bg-clip-text text-transparent">
              Intelligent AI Routing?
            </span>
          </h2>
          
          {/* Bottom Email + Join Waitlist */}
          <div className="mt-8 max-w-2xl mx-auto pointer-events-auto">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border-white/0 text-white font-stacksans 
                      placeholder:text-gray-500 h-14 w-96 
                      placeholder:text-[15px] placeholder:font-stacksans 
                      !text-[15px]
                      backdrop-blur-sm
                      focus:bg-white/10
                      focus:outline-none
                      focus:ring-0
                      focus-visible:ring-0
                      focus:border-white/0"
                data-testid="bottom-email-input"
              />
              <Button
                onClick={handleBottomWaitlistSubmit}
                disabled={loading || !email}
                className="h-14 px-8 font-stacksans font-medium text-lg transition-all duration-300

                  /* Default state */
                  bg-black/25 
                  backdrop-blur-md  
                  text-white/60

                  /* Hover state */
                  hover:text-white
                  hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-700/20
                  hover:border-transparent
                  "
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
      <footer className="relative z-20 py-12 px-6 text-center text-gray-600 text-sm border-t border-white/10">
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

      {/* TRUE fullscreen fixed background */}
      <div className="fixed inset-0 z-0 ">
        <PrismaticBurst
          animationType="hover"
          intensity={2}
          speed={0.4}
          distort={0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={3}
          rayCount={0}
          mixBlendMode="screen"
          colors={['#00eeff', '#0077ff', '#000014']}
        />
      </div>
      {/* Cinematic Dark Blur Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none 
        bg-gradient-to-b from-black/60 via-black/40 to-black/70 
        backdrop-blur-[4px]">
      </div>
    </div>
  );
}