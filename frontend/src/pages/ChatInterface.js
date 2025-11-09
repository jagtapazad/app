import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Plus, MessageSquare, Trash2, Edit2, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { previewAgentChain, executeChatQuery, getChatHistory } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface({ user }) {
  const [query, setQuery] = useState('');
  const [agentChain, setAgentChain] = useState([]);
  const [fetchUI, setFetchUI] = useState(true);
  const [personalized, setPersonalized] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const chatEndRef = useRef(null);

  const allAgents = ['Scira AI', 'GPT Researcher', 'Deerflow', 'Linkup.so', 'Abacus.ai', 'Octagon AI', 'Perplexity', 'Exa', 'AnswerThis.io', 'Parallel AI', 'Morphic', 'OpenAI Research', 'Nebius'];

  const getLoadingMessages = (agents) => [
    { icon: '🔍', text: 'Analyzing your query...' },
    { icon: '🎯', text: 'Finding the right AI agents...' },
    { icon: '🤖', text: `Checking with ${agents.join(', ')}...`, showAgents: true },
    { icon: '⚡', text: 'Synthesizing the answer...' }
  ];

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread]);

  const loadThreads = async () => {
    try {
      const response = await getChatHistory(50);
      const history = response.data || [];
      
      // Group messages by thread_id
      const threadMap = {};
      
      history.forEach(item => {
        const threadId = item.thread_id || item.id;
        if (!threadMap[threadId]) {
          threadMap[threadId] = {
            id: threadId,
            messages: [],
            title: item.query,
            timestamp: item.timestamp
          };
        }
        threadMap[threadId].messages.push({
          query: item.query,
          response: item.response,
          timestamp: item.timestamp,
          isLoading: false
        });
      });
      
      // Convert to array and sort by timestamp
      const threadsArray = Object.values(threadMap).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setThreads(threadsArray);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  const createNewThread = () => {
    setCurrentThread(null);
    setQuery('');
    setIsNewChatActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isExecuting) return;

    setIsExecuting(true);
    setLoadingStage(0);
    
    // Randomly select 3 agents for this query
    const shuffled = [...allAgents].sort(() => 0.5 - Math.random());
    const randomAgents = shuffled.slice(0, 3);
    setSelectedAgents(randomAgents);
    
    const userQuery = query;
    const currentAgentChain = agentChain.length > 0 ? agentChain : [{ agent_name: 'Perplexity', purpose: 'Answer query' }];
    
    // Cycle through loading messages faster (1.5 seconds each)
    const loadingInterval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % 4);
    }, 1500);
    
    // Create new thread only if no current thread exists OR if New Chat was clicked
    if (!currentThread || isNewChatActive) {
      const newThread = {
        id: `thread-${Date.now()}`,
        messages: [{
          query: userQuery,
          response: null,
          timestamp: new Date().toISOString(),
          isLoading: true
        }],
        title: userQuery,
        timestamp: new Date().toISOString()
      };
      
      setCurrentThread(newThread);
      setThreads(prev => [newThread, ...prev]);
      setIsNewChatActive(false);
    } else {
      // Add to existing thread (follow-up)
      const updatedThread = {
        ...currentThread,
        messages: [...(currentThread.messages || []), {
          query: userQuery,
          response: null,
          timestamp: new Date().toISOString(),
          isLoading: true
        }]
      };
      setCurrentThread(updatedThread);
      setThreads(prev => prev.map(t => t.id === currentThread.id ? updatedThread : t));
    }
    
    setQuery('');
    setAgentChain([]);

    try {
      const response = await executeChatQuery({
        query: userQuery,
        thread_id: currentThread?.id || null,
        agent_chain: currentAgentChain,
        fetch_ui: fetchUI,
        personalized
      });

      clearInterval(loadingInterval);

      // Get the thread_id from response (backend confirms which thread it saved to)
      const savedThreadId = response.data.thread_id || currentThread?.id || `thread-${Date.now()}`;

      // Update the last message with response
      setCurrentThread(prev => {
        if (!prev) return prev;
        const updatedMessages = [...(prev.messages || [])];
        const lastMsgIndex = updatedMessages.length - 1;
        if (lastMsgIndex >= 0) {
          updatedMessages[lastMsgIndex] = {
            ...updatedMessages[lastMsgIndex],
            response: response.data,
            isLoading: false
          };
        }
        return { ...prev, id: savedThreadId, messages: updatedMessages };
      });
      
      setThreads(prev => prev.map(t => {
        if (currentThread && (t.id === currentThread.id || t.id === savedThreadId)) {
          const updatedMessages = [...(t.messages || [])];
          const lastMsgIndex = updatedMessages.length - 1;
          if (lastMsgIndex >= 0) {
            updatedMessages[lastMsgIndex] = {
              ...updatedMessages[lastMsgIndex],
              response: response.data,
              isLoading: false
            };
          }
          return { ...t, id: savedThreadId, messages: updatedMessages };
        }
        return t;
      }));
      
    } catch (error) {
      clearInterval(loadingInterval);
      toast.error('Failed to execute query');
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
      setLoadingStage(0);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Sidebar - Chat History */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} border-r border-white/10 bg-black/50 backdrop-blur-sm transition-all duration-300 overflow-hidden flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png" 
              alt="Sagent AI Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-medium text-white">agent AI</span>
          </div>
          <Button
            onClick={createNewThread}
            className="w-full bg-white text-black hover:bg-gray-200 h-10"
            data-testid="new-chat-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setCurrentThread(thread)}
                className={`w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors ${
                  currentThread?.id === thread.id ? 'bg-white/10' : ''
                }`}
                data-testid={`thread-${thread.id}`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{thread.title || thread.messages?.[0]?.query || thread.query || 'Untitled'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(thread.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm">
            <a href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</a>
            <a href="/my-agents" className="text-gray-400 hover:text-white transition-colors">My Agents</a>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  onClick={() => setSidebarOpen(true)}
                  className="text-white hover:bg-white/10"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
              )}
              <h1 className="text-lg font-medium text-white">Search</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/analytics" className="text-gray-400 hover:text-white transition-colors text-sm">Analytics</a>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                <span className="text-white text-sm">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {!currentThread ? (
              /* Empty State */
              <div className="text-center py-32">
                <Sparkles className="w-20 h-20 text-blue-400 mx-auto mb-6" />
                <h2 className="text-4xl font-bold text-white mb-4">What can I help with?</h2>
                <p className="text-gray-400 text-lg">Click "New Chat" to start a conversation</p>
              </div>
            ) : (
              /* Thread Display - ChatGPT/Perplexity Style with Messages */
              <div className="space-y-8">
                {/* Messages */}
                {(currentThread.messages || []).map((message, msgIndex) => (
                  <div key={msgIndex} className="space-y-4">
                    {/* User Query - Simple heading like Perplexity */}
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{message.query}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Loading State with progressive messages */}
                    {message.isLoading && (
                      <div className="space-y-4 py-6">
                        <div className="flex items-center gap-3 text-gray-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="text-lg">{getLoadingMessages(selectedAgents)[loadingStage].text}</span>
                        </div>
                        {/* Show agent badges when checking with agents */}
                        {loadingStage === 2 && (
                          <div className="flex gap-2 flex-wrap ml-9">
                            {selectedAgents.map(agent => (
                              <span key={agent} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                                {agent}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Answer Section */}
                    {!message.isLoading && message.response && (
                      <div className="space-y-6">
                        <div className="prose prose-lg prose-invert max-w-none">
                          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Answer</div>
                          {message.response?.synthesized?.markdown ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.response.synthesized.markdown}
                            </ReactMarkdown>
                          ) : (
                            <div className="text-gray-300 leading-relaxed">
                              {message.response?.results?.map((result, i) => (
                                <div key={i} className="mb-4">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.content}</ReactMarkdown>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Fixed Input Area */}
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-6 py-6">
            {/* Agent Chain Preview */}
            {agentChain.length > 0 && (
              <div className="mb-3 flex gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Routing to:</span>
                {agentChain.map((agent, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md">
                    {agent.agent_name}
                  </span>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Switch checked={personalized} onCheckedChange={setPersonalized} />
                <span className="text-xs text-gray-400">Personalize</span>
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-12 text-base focus:border-blue-500"
                disabled={isExecuting}
                data-testid="chat-input"
              />
              <Button
                type="submit"
                disabled={!query.trim() || isExecuting}
                className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white"
                data-testid="send-button"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}