import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, ChevronDown, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { previewAgentChain, executeChatQuery, getChatHistory } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ChatInterface({ user }) {
  const [query, setQuery] = useState('');
  const [agentChain, setAgentChain] = useState([]);
  const [fetchUI, setFetchUI] = useState(true);
  const [personalized, setPersonalized] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const response = await getChatHistory(10);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  // Preview agent chain as user types
  useEffect(() => {
    if (query.trim().length > 10) {
      const debounce = setTimeout(async () => {
        try {
          const response = await previewAgentChain({ query, fetch_ui: fetchUI, personalized });
          setAgentChain(response.data.agent_chain || []);
        } catch (error) {
          console.error('Preview error:', error);
        }
      }, 500);
      return () => clearTimeout(debounce);
    } else {
      setAgentChain([]);
    }
  }, [query, fetchUI, personalized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isExecuting) return;

    setIsExecuting(true);
    const userQuery = query;
    setQuery('');

    try {
      const response = await executeChatQuery({
        query: userQuery,
        agent_chain: agentChain,
        fetch_ui: fetchUI,
        personalized
      });

      const newMessage = {
        query: userQuery,
        agent_chain: agentChain,
        response: response.data,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMessage]);
      setAgentChain([]);
      toast.success('Query executed successfully!');
    } catch (error) {
      toast.error('Failed to execute query');
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const changeAgent = (index, newAgentId) => {
    const updated = [...agentChain];
    updated[index] = { ...updated[index], agent_id: newAgentId };
    setAgentChain(updated);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
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
            <a href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</a>
            <a href="/my-agents" className="text-gray-400 hover:text-white transition-colors">My Agents</a>
            <a href="/analytics" className="text-gray-400 hover:text-white transition-colors">Analytics</a>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
              <span className="text-white text-sm">{user?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Messages */}
        <div className="space-y-8 mb-32">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Start Your Research</h2>
              <p className="text-gray-400">Ask a question and let our AI agents handle it</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="space-y-4">
                {/* User Query */}
                <div className="flex justify-end">
                  <div className="max-w-2xl bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <p className="text-white">{msg.query}</p>
                  </div>
                </div>

                {/* Agent Response */}
                <div className="space-y-4">
                  {/* Agent Chain Used */}
                  <div className="flex gap-2 flex-wrap">
                    {msg.agent_chain?.map((agent, i) => (
                      <div key={i} className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300">
                        {agent.agent_name}
                      </div>
                    ))}
                  </div>

                  {/* Response Content */}
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    {msg.response?.synthesized?.markdown && (
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown>{msg.response.synthesized.markdown}</ReactMarkdown>
                      </div>
                    )}

                    {/* UI Components (Graphs/Tables) */}
                    {msg.response?.synthesized?.ui_components && Array.isArray(msg.response.synthesized.ui_components) && msg.response.synthesized.ui_components.length > 0 && (
                      <div className="mt-6 space-y-4">
                        {msg.response.synthesized.ui_components.map((component, i) => (
                          <div key={i}>
                            {component.type === 'graph' && component.data && Array.isArray(component.data) && (
                              <div className="bg-black/30 p-4 rounded-xl">
                                <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={component.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#999" />
                                    <YAxis stroke="#999" />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            {component.type === 'table' && component.data && Array.isArray(component.data) && component.data.length > 0 && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                  <thead className="text-gray-400 border-b border-white/10">
                                    <tr>
                                      {Object.keys(component.data[0] || {}).map(key => (
                                        <th key={key} className="px-4 py-2">{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="text-gray-300">
                                    {component.data.map((row, ri) => (
                                      <tr key={ri} className="border-b border-white/5">
                                        {Object.values(row).map((val, vi) => (
                                          <td key={vi} className="px-4 py-2">{String(val)}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {isExecuting && (
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing your query...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Fixed Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-20">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Agent Chain Preview */}
          {agentChain.length > 0 && (
            <div className="mb-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
              <div className="text-xs text-gray-400 mb-3">Routing to:</div>
              <div className="flex gap-2 flex-wrap">
                {agentChain.map((agent, i) => (
                  <div key={i} className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2">
                    <span className="text-sm text-blue-300">{agent.agent_name}</span>
                    <ChevronDown className="w-4 h-4 text-blue-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Switch checked={fetchUI} onCheckedChange={setFetchUI} />
              <span className="text-sm text-gray-400">Fetch UI</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={personalized} onCheckedChange={setPersonalized} />
              <span className="text-sm text-gray-400">Personalize</span>
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-gray-500 h-14 text-base"
              disabled={isExecuting}
              data-testid="chat-input"
            />
            <Button
              type="submit"
              disabled={!query.trim() || isExecuting}
              className="h-14 px-6 bg-white text-black hover:bg-gray-200"
              data-testid="send-button"
            >
              {isExecuting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}