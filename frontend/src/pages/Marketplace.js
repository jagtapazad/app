import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getAllAgents, getSubscribedAgents, subscribeAgent, unsubscribeAgent } from '@/utils/api';

export default function Marketplace({ user }) {
  const [agents, setAgents] = useState([]);
  const [subscribedIds, setSubscribedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'People', 'Market Research', 'Scientific Research', 'Others'];

  useEffect(() => {
    loadAgents();
    loadSubscribed();
  }, []);

  const loadAgents = async () => {
    try {
      // Use public endpoint in dev mode
      const response = await getAllAgents().catch(() => {
        // Fallback to axios direct call for public endpoint
        return window.axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/agents/public`);
      });
      setAgents(response.data || []);
    } catch (error) {
      console.error('Agent load error:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribed = async () => {
    try {
      const response = await getSubscribedAgents();
      setSubscribedIds(response.data.map(a => a.id));
    } catch (error) {
      console.error('Failed to load subscribed agents');
    }
  };

  const handleSubscribe = async (agentId) => {
    try {
      await subscribeAgent(agentId);
      setSubscribedIds(prev => [...prev, agentId]);
      toast.success('Subscribed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to subscribe');
    }
  };

  const handleUnsubscribe = async (agentId) => {
    try {
      await unsubscribeAgent(agentId);
      setSubscribedIds(prev => prev.filter(id => id !== agentId));
      toast.success('Unsubscribed successfully!');
    } catch (error) {
      toast.error('Failed to unsubscribe');
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || agent.categories?.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png" 
              alt="Sagent AI Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-medium text-white">agent AI</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/chat" className="text-gray-400 hover:text-white transition-colors">Chat</a>
            <a href="/marketplace" className="text-white">Marketplace</a>
            <a href="/my-agents" className="text-gray-400 hover:text-white transition-colors">My Agents</a>
            <a href="/analytics" className="text-gray-400 hover:text-white transition-colors">Analytics</a>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
              <span className="text-white text-sm">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Agent Marketplace</h1>
          <p className="text-xl text-gray-400">Discover and subscribe to specialized AI agents</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-12"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'ghost'}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 
                  'bg-white text-black hover:bg-gray-200' : 
                  'text-gray-400 hover:text-white hover:bg-white/5'
                }
                data-testid={`category-${cat.toLowerCase().replace(' ', '-')}`}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map(agent => (
              <div 
                key={agent.id} 
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                data-testid={`agent-card-${agent.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{agent.name}</h3>
                    {agent.is_opensource && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        Open Source
                      </Badge>
                    )}
                  </div>
                  {subscribedIds.includes(agent.id) && (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{agent.description}</p>

                {/* Categories */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {agent.categories?.slice(0, 2).map(cat => (
                    <span key={cat} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Cost */}
                <div className="mb-4 text-sm">
                  <span className="text-gray-500">Cost per query: </span>
                  <span className="text-white font-medium">${agent.cost_per_query.toFixed(2)}</span>
                </div>

                {/* Subscribe Button */}
                {subscribedIds.includes(agent.id) ? (
                  <Button
                    onClick={() => handleUnsubscribe(agent.id)}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                    data-testid={`unsubscribe-${agent.id}`}
                  >
                    Unsubscribe
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(agent.id)}
                    className="w-full bg-white text-black hover:bg-gray-200"
                    data-testid={`subscribe-${agent.id}`}
                  >
                    Subscribe
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredAgents.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No agents found matching your search.</p>
          </div>
        )}
      </main>
    </div>
  );
}