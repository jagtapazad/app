import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';
import { getSubscribedAgents } from '@/utils/api';
import { toast } from 'sonner';

export default function MyAgents({ user }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscribedAgents();
  }, []);

  const loadSubscribedAgents = async () => {
    try {
      const response = await getSubscribedAgents();
      setAgents(response.data || []);
    } catch (error) {
      toast.error('Failed to load subscribed agents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
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
            <a href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</a>
            <a href="/my-agents" className="text-white">My Agents</a>
            <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
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
          <h1 className="text-5xl font-bold text-white mb-4">My Agents</h1>
          <p className="text-xl text-gray-400">Your subscribed AI agents with priority routing</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Total Agents</span>
            </div>
            <div className="text-3xl font-bold text-white">{agents.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Active</span>
            </div>
            <div className="text-3xl font-bold text-white">{agents.length}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400 text-sm">Avg Cost</span>
            </div>
            <div className="text-3xl font-bold text-white">
              ${agents.length > 0 ? (agents.reduce((sum, a) => sum + a.cost_per_query, 0) / agents.length).toFixed(2) : '0.00'}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">This Month</span>
            </div>
            <div className="text-3xl font-bold text-white">--</div>
          </div>
        </div>

        {/* Agents List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-6">You haven't subscribed to any agents yet.</p>
            <a 
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Browse Marketplace
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map(agent => (
              <div 
                key={agent.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
                data-testid={`my-agent-${agent.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{agent.name}</h3>
                      {agent.is_opensource && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                          Open Source
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 mb-4">{agent.description}</p>
                    
                    {/* Categories */}
                    <div className="flex gap-2 flex-wrap mb-4">
                      {agent.categories?.map(cat => (
                        <span key={cat} className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Cost per query: </span>
                        <span className="text-white font-medium">${agent.cost_per_query.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status: </span>
                        <span className="text-green-400 font-medium">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div className="ml-6">
                    <div className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl">
                      <div className="text-xs text-gray-400 mb-1">Priority</div>
                      <div className="text-2xl font-bold text-white">High</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}