import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, Zap } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAnalytics } from '@/utils/api';
import { toast } from 'sonner';

export default function Pricing({ user }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await getAnalytics();
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  // Prepare chart data
  const agentUsageData = analytics?.agent_usage ? 
    Object.entries(analytics.agent_usage).map(([name, data]) => ({
      name,
      queries: data.queries,
      cost: data.cost
    })) : [];

  const pieData = agentUsageData.map(item => ({
    name: item.name,
    value: item.queries
  }));

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px]" />
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
            <a href="/agents" className="text-gray-400 hover:text-white transition-colors">Agents</a>
            <a href="/pricing" className="text-white">Pricing</a>
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
          <h1 className="text-5xl font-bold text-white mb-4">Analytics</h1>
          <p className="text-xl text-gray-400">Track your AI agent usage and performance</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">Total Queries</span>
                </div>
                <div className="text-3xl font-bold text-white">{analytics?.total_queries || 0}</div>
                <div className="text-sm text-gray-500 mt-1">All time</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400 text-sm">Total Cost</span>
                </div>
                <div className="text-3xl font-bold text-white">${(analytics?.total_cost || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">All time</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Credits Used</span>
                </div>
                <div className="text-3xl font-bold text-white">${(analytics?.credits?.used_credits || 0).toFixed(2)}</div>
                <div className="text-sm text-gray-500 mt-1">of ${(analytics?.credits?.total_credits || 0).toFixed(2)}</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-400 text-sm">Avg Cost/Query</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  ${analytics?.total_queries > 0 ? ((analytics?.total_cost || 0) / analytics.total_queries).toFixed(3) : '0.000'}
                </div>
                <div className="text-sm text-gray-500 mt-1">Per query</div>
              </div>
            </div>

            {/* Charts */}
            {agentUsageData.length > 0 && (
              <>
                {/* Agent Usage Bar Chart */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Agent Usage</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentUsageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#999" angle={-45} textAnchor="end" height={100} />
                      <YAxis stroke="#999" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="queries" fill="#3b82f6" name="Queries" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Cost Distribution */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Query Distribution</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Cost by Agent</h2>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={agentUsageData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" stroke="#999" />
                        <YAxis dataKey="name" type="category" stroke="#999" width={100} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                        />
                        <Bar dataKey="cost" fill="#10b981" name="Cost ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {agentUsageData.length === 0 && (
              <div className="text-center py-20">
                <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No analytics data yet. Start using agents to see insights!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}