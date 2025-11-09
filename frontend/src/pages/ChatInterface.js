import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Plus, MessageSquare, Clock, Copy, RotateCcw, ChevronRight, Search, X, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { previewAgentChain, executeChatQuery, getChatHistory, editMessageSection } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface({ user }) {
  const [query, setQuery] = useState('');
  const [agentChain, setAgentChain] = useState([]);
  const [personalized, setPersonalized] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchHistory, setSearchHistory] = useState('');
  const chatEndRef = useRef(null);

  const allAgents = ['Scira AI', 'GPT Researcher', 'Deerflow', 'Linkup.so', 'Abacus.ai', 'Octagon AI', 'Perplexity', 'Exa', 'AnswerThis.io', 'Parallel AI', 'Morphic', 'OpenAI Research', 'Nebius', 'Clado.ai', 'Appoloi'];

  const examplePrompts = [
    "Find recent market research on AI agents",
    "Who are the top researchers in quantum computing?",
    "Analyze the competitive landscape of SaaS companies",
    "What are the latest developments in renewable energy?"
  ];

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

  // Preview agent chain as user types (debounced)
  useEffect(() => {
    if (query.trim().length > 15) {
      const debounce = setTimeout(async () => {
        try {
          const response = await previewAgentChain({ query, personalized });
          setAgentChain(response.data.agent_chain || []);
        } catch (error) {
          console.error('Preview error:', error);
        }
      }, 800);
      return () => clearTimeout(debounce);
    } else {
      setAgentChain([]);
    }
  }, [query, personalized]);

  const loadThreads = async () => {
    try {
      const response = await getChatHistory(50);
      const history = response.data || [];
      
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
          id: item.id,
          query: item.query,
          response: item.response,
          timestamp: item.timestamp,
          isLoading: false
        });
      });
      
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
    
    const shuffled = [...allAgents].sort(() => 0.5 - Math.random());
    const randomAgents = shuffled.slice(0, 3);
    setSelectedAgents(randomAgents);
    
    const userQuery = query;
    const currentAgentChain = agentChain.length > 0 ? agentChain : [{ agent_name: 'Perplexity', purpose: 'Answer query' }];
    
    const loadingInterval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % 4);
    }, 1500);
    
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
        fetch_ui: true,
        personalized
      });

      clearInterval(loadingInterval);

      const savedThreadId = response.data.thread_id || currentThread?.id || `thread-${Date.now()}`;

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

  const handleContextMenu = (e, messageId, sectionId) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId,
      sectionId
    });
  };

  const handleEditOperation = async (operation, instruction = '') => {
    if (!contextMenu) return;
    
    try {
      await editMessageSection({
        message_id: contextMenu.messageId,
        section_id: contextMenu.sectionId,
        operation,
        instruction
      });
      toast.success(`${operation.charAt(0).toUpperCase() + operation.slice(1)} operation applied`);
      setContextMenu(null);
    } catch (error) {
      toast.error('Failed to apply edit');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const deleteThread = async (threadId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this conversation?')) return;
    
    try {
      // Delete from database - delete all messages with this thread_id
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/thread/${threadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('session_token')}`
        }
      });
      
      // Remove from state
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      // Clear current thread if it's the one being deleted
      if (currentThread?.id === threadId) {
        setCurrentThread(null);
      }
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const filteredThreads = threads.filter(t => 
    t.title?.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black flex" onClick={() => setContextMenu(null)}>
      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} border-r border-white/10 bg-black/50 backdrop-blur-sm transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-1 mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png" 
              alt="Sagent AI Logo" 
              className="w-8 h-8 object-contain"
            />
            <span className="text-lg font-medium text-white">agent AI</span>
          </div>
          <Button
            onClick={createNewThread}
            className="w-full bg-white text-black hover:bg-gray-200 h-10 mb-3"
            data-testid="new-chat-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          
          {/* Search History */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search conversations..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {filteredThreads.map((thread) => (
              <div
                key={thread.id}
                className={`group relative rounded-lg hover:bg-white/5 transition-colors ${
                  currentThread?.id === thread.id ? 'bg-white/10 border border-white/20' : ''
                }`}
              >
                <button
                  onClick={() => setCurrentThread(thread)}
                  className="w-full text-left p-3"
                  data-testid={`thread-${thread.id}`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0 pr-6">
                      <p className="text-sm text-white truncate font-medium">{thread.title || thread.messages?.[0]?.query || thread.query || 'Untitled'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(thread.timestamp).toLocaleDateString()} · {thread.messages?.length || 1} msg
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => deleteThread(thread.id, e)}
                  className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded"
                  data-testid={`delete-thread-${thread.id}`}
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-sm">
            <a href="/agents" className="text-gray-400 hover:text-white transition-colors">Agents</a>
            <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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
            </div>
            <div className="flex items-center gap-4">
              <a href="/agents" className="text-gray-400 hover:text-white transition-colors text-sm">Agents</a>
              <a href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</a>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                <span className="text-white text-sm">{user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-4 min-h-[calc(100vh-200px)] flex flex-col justify-center">
            {!currentThread ? (
              <div className="text-center">
                <img 
                  src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/37zbur7o_Screenshot%202025-11-05%20at%2011.17.40%20PM.png"
                  alt="Sagent AI Logo"
                  className="w-16 h-16 mx-auto mb-4 object-contain"
                />
                <h2 className="text-3xl font-bold text-white mb-3">What can I help with?</h2>
                <p className="text-gray-400 mb-6">Ask a question and let our specialized AI agents research it for you</p>
                
                {/* Example Prompts - Compact */}
                <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(prompt)}
                      className="text-left p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group"
                    >
                      <p className="text-sm text-gray-300 group-hover:text-white transition-colors">{prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {(currentThread.messages || []).map((message, msgIndex) => (
                  <div key={msgIndex} className="space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">{message.query}</h2>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {message.isLoading && (
                      <div className="space-y-4 py-6">
                        <div className="flex items-center gap-3 text-gray-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                          <span className="text-lg">{getLoadingMessages(selectedAgents)[loadingStage].text}</span>
                        </div>
                        {loadingStage === 2 && (
                          <div className="flex gap-2 flex-wrap ml-9">
                            {selectedAgents.map(agent => (
                              <span key={agent} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300 animate-pulse">
                                {agent}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!message.isLoading && message.response && (
                      <div className="space-y-6">
                        <div 
                          className="prose prose-lg prose-invert max-w-none"
                          onContextMenu={(e) => handleContextMenu(e, message.id, 'answer')}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Answer</div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(message.response?.synthesized?.markdown || '')}
                                className="text-gray-400 hover:text-white h-7"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
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

                        {/* Suggested Follow-ups */}
                        {msgIndex === (currentThread.messages?.length || 0) - 1 && (
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">Suggested:</span>
                            {['Tell me more', 'Give examples', 'Explain in detail'].map(suggestion => (
                              <button
                                key={suggestion}
                                onClick={() => setQuery(suggestion)}
                                className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </main>

        {/* Fixed Input Area */}
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-6 py-6">
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

      {/* Context Menu for Edit Operations */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleEditOperation('iterate', prompt('Enter your instruction:'))}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3"
          >
            <Edit2 className="w-4 h-4" />
            <span>Iterate</span>
          </button>
          <button
            onClick={() => handleEditOperation('delete')}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3"
          >
            <X className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <button
            onClick={() => handleEditOperation('dissolve')}
            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-3"
          >
            <Sparkles className="w-4 h-4" />
            <span>Dissolve</span>
          </button>
        </div>
      )}
    </div>
  );
}