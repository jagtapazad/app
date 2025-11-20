import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, MessageSquare, Clock, Copy, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toast } from 'sonner';
import { previewAgentChain, getChatHistory, deepagentChat, deepagentState } from '@/utils/api.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight, Bot, Tag } from 'lucide-react';

//frontend imports
import DotGrid from "@/components/ChatInterface/DotGrid.jsx";



const markdownComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline break-words">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="mt-6 mb-3 text-2xl font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-5 mb-2 text-xl font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-2 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => <p className="leading-relaxed mb-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 space-y-1 mb-3">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1 mb-3">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-white/20 pl-3 italic text-gray-300 mb-3">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/40 border border-white/10 rounded-md p-3 overflow-x-auto mb-3">{children}</pre>
  ),
  code: ({ inline, className, children }) => (
    inline ? (
      <code className="bg-white/10 rounded px-1 py-0.5">{children}</code>
    ) : (
      <code className={className}>{children}</code>
    )
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => <th className="text-left text-sm font-semibold px-3 py-2 border-b border-white/10">{children}</th>,
  td: ({ children }) => <td className="text-sm px-3 py-2 border-b border-white/10 align-top">{children}</td>,
};

// Attempt to parse a string as JSON. Returns { ok, value }.
const tryParseJson = (maybeJson) => {
  if (typeof maybeJson !== 'string') return { ok: false, value: null };
  const trimmed = maybeJson.trim();
  if (!trimmed) return { ok: false, value: null };
  // Only attempt if it looks like JSON
  const startsLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!startsLikeJson) return { ok: false, value: null };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false, value: null };
  }
};

// Extract the first valid JSON array (e.g., a list of sources) from within arbitrary plaintext.
// This scans for a '[' whose next non-space char is '{', then balances brackets to find the matching ']'.
// Returns the parsed array or null if none found.
const extractFirstJsonArrayFromText = (text) => {
  if (typeof text !== 'string' || !text) return null;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const start = text.indexOf('[', i);
    if (start === -1) break;
    // Find next non-space after '['
    let j = start + 1;
    while (j < n && /\s/.test(text[j])) j += 1;
    const nextChar = text[j];
    // We only consider arrays of objects to avoid conflicts with footnote-style [1], [6], etc.
    if (nextChar === '{') {
      // Balance square brackets
      let depth = 0;
      for (let k = start; k < n; k += 1) {
        const ch = text[k];
        if (ch === '[') depth += 1;
        else if (ch === ']') depth -= 1;
        if (depth === 0) {
          const candidate = text.slice(start, k + 1);
          try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // fall through and continue searching
          }
          // continue after this closing bracket
          i = k + 1;
          continue;
        }
      }
      // Unbalanced; stop.
      break;
    }
    // Continue search past this '['
    i = start + 1;
  }
  return null;
};

// Return the start/end span of the first JSON array-of-objects found in text.
const getFirstJsonArraySpan = (text) => {
  if (typeof text !== 'string' || !text) return null;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const start = text.indexOf('[', i);
    if (start === -1) break;
    let j = start + 1;
    while (j < n && /\s/.test(text[j])) j += 1;
    if (text[j] === '{') {
      let depth = 0;
      for (let k = start; k < n; k += 1) {
        const ch = text[k];
        if (ch === '[') depth += 1;
        else if (ch === ']') depth -= 1;
        if (depth === 0) {
          return { start, end: k };
        }
      }
      return null;
    }
    i = start + 1;
  }
  return null;
};

// Resolve the markdown body to render from a DeepAgents response.
const coerceToString = (val) => {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.filter(Boolean).map(String).join('\n\n');
  if (typeof val === 'object') {
    if ('report' in val) return coerceToString(val.report);
    if ('markdown' in val) return coerceToString(val.markdown);
    if ('result' in val) return coerceToString(val.result);
    try { return JSON.stringify(val, null, 2); } catch (_) { return String(val); }
  }
  return String(val);
};

const extractMarkdown = (response) => {
  if (!response) return '';
  const primary = response.result ?? response.raw_response?.result;
  // If primary is a jsonified string, prefer "report" → "markdown" → "result"
  if (typeof primary === 'string') {
    const parsed = tryParseJson(primary);
    if (parsed.ok && parsed.value && typeof parsed.value === 'object') {
      const obj = parsed.value;
      if (obj.report != null) return coerceToString(obj.report);
      if (obj.markdown != null) return coerceToString(obj.markdown);
      if (obj.result != null) return coerceToString(obj.result);
    }
    // If plaintext with embedded JSON array (sources), strip it from the rendered body
    const span = getFirstJsonArraySpan(primary);
    if (span) {
      const cleaned = (primary.slice(0, span.start) + primary.slice(span.end + 1)).trim();
      return cleaned;
    }
  }
  // Otherwise fall back to existing logic
  return coerceToString(primary);
};

// Normalize the cited sources array for display.
const extractSources = (response) => {
  if (!response) return [];
  // 1) Direct structured sources on the response object
  if (Array.isArray(response.sources)) return response.sources;
  if (Array.isArray(response.raw_response?.source)) return response.raw_response.source;
  if (Array.isArray(response.result?.sources)) return response.result.sources;
  if (Array.isArray(response.result?.source)) return response.result.source;

  // 2) If result is a jsonified string, parse and extract sources/source
  const primary = response.result ?? response.raw_response?.result;
  if (typeof primary === 'string') {
    const parsed = tryParseJson(primary);
    if (parsed.ok && parsed.value && typeof parsed.value === 'object') {
      const obj = parsed.value;
      if (Array.isArray(obj.sources)) return obj.sources;
      if (Array.isArray(obj.source)) return obj.source;
    }
  }

  // 3) If we have plaintext (markdown-like) content, search for an embedded JSON array
  const textBody = coerceToString(primary);
  const span = getFirstJsonArraySpan(textBody);
  if (span) {
    const candidate = textBody.slice(span.start, span.end + 1);
    try {
      const embedded = JSON.parse(candidate);
      if (Array.isArray(embedded)) return embedded;
    } catch {}
  }

  return [];
};

// Heuristic date parser for source objects
const parseSourceDate = (src) => {
  const raw = src?.date;
  if (!raw) return 0;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    // Range like "2019-2024" or with en/em dash "2019–2024"
    const range = s.match(/(\d{4})\s*[–—-]\s*(\d{4})/);
    if (range) {
      const endYear = Number(range[2]);
      if (!Number.isNaN(endYear)) return new Date(`${endYear}-12-31`).getTime();
    }
    // YYYY[-MM[-DD]]
    const ymd = s.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
    if (ymd) {
      const y = ymd[1];
      const m = ymd[2] || '12';
      const d = ymd[3] || '31';
      const ts = Date.parse(`${y}-${m}-${d}`);
      if (!Number.isNaN(ts)) return ts;
    }
    const ts = Date.parse(s);
    if (!Number.isNaN(ts)) return ts;
  }
  return 0;
};

// Group sources by provider, return Map(provider -> sources[])
const groupSourcesByProvider = (sources) => {
  const map = new Map();
  sources.forEach((src) => {
    const provider = src?.provider || 'unknown';
    if (!map.has(provider)) map.set(provider, []);
    map.get(provider).push(src);
  });
  return map;
};

// Compute provider stats for stacked bar
const providerStats = (sources) => {
  const counts = {};
  let total = 0;
  sources.forEach((s) => {
    const p = s?.provider || 'unknown';
    counts[p] = (counts[p] || 0) + 1;
    total += 1;
  });
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  return { counts, total, ordered };
};

// Static palette for stacked segments
const providerSegmentClasses = [
  'bg-blue-500/70',
  'bg-emerald-500/70',
  'bg-purple-500/70',
  'bg-amber-500/70',
  'bg-pink-500/70',
  'bg-cyan-500/70',
  'bg-rose-500/70',
  'bg-lime-500/70',
  'bg-sky-500/70',
  'bg-fuchsia-500/70',
];

// Surface the agent that handled the request for UI labels.
const extractAgentName = (response) => {
  if (!response) return '';
  return response.agent_name || response.raw_response?.agent_name || '';
};

const displayAgentName = (name) => {
  if (!name) return '';
  return String(name).toLowerCase() === 'loop' ? 'clarification' : name;
};

const extractPlainText = (response) => {
  if (!response) return '';
  const primary = response.result ?? response.raw_response?.result;
  if (typeof primary === 'string') {
    const span = getFirstJsonArraySpan(primary);
    if (span) {
      const cleaned = (primary.slice(0, span.start) + primary.slice(span.end + 1)).trim();
      return cleaned;
    }
  }
  return coerceToString(primary);
};

// Extract unique providers/tools used from the response
const extractProviders = (response) => {
  if (!response) return [];

  const providers = new Set();

  // Extract providers from sources array
  const sources = extractSources(response);
  sources.forEach(source => {
    // Check if source has provider field
    if (source.provider) {
      providers.add(source.provider);
    }

    // Also check if source is a string with "provider: xxx" pattern
    if (typeof source === 'string') {
      const providerMatch = source.match(/,\s*provider:\s*(\w+)/i);
      if (providerMatch && providerMatch[1]) {
        providers.add(providerMatch[1]);
      }
    }

    // Check if source has a text/content field with provider pattern
    const sourceText = source.text || source.content || source.citation || '';
    if (sourceText) {
      const providerMatch = sourceText.match(/,\s*provider:\s*(\w+)/i);
      if (providerMatch && providerMatch[1]) {
        providers.add(providerMatch[1]);
      }
    }
  });

  // Check top-level provider field
  if (response.provider) {
    providers.add(response.provider);
  }

  // Check raw_response.provider
  if (response.raw_response?.provider) {
    providers.add(response.raw_response.provider);
  }

  // Check tools array
  if (Array.isArray(response.tools)) {
    response.tools.forEach(tool => {
      if (typeof tool === 'string') providers.add(tool);
      else if (tool?.name) providers.add(tool.name);
      else if (tool?.provider) providers.add(tool.provider);
    });
  }

  // Check raw_response.tools
  if (Array.isArray(response.raw_response?.tools)) {
    response.raw_response.tools.forEach(tool => {
      if (typeof tool === 'string') providers.add(tool);
      else if (tool?.name) providers.add(tool.name);
      else if (tool?.provider) providers.add(tool.provider);
    });
  }

  // Check tools_used array
  if (Array.isArray(response.tools_used)) {
    response.tools_used.forEach(tool => providers.add(tool));
  }

  if (Array.isArray(response.raw_response?.tools_used)) {
    response.raw_response.tools_used.forEach(tool => providers.add(tool));
  }

  return Array.from(providers).filter(Boolean);
};

const extractFollowUpMessages = (statePayload) => {
  if (!statePayload) return [];

  const collected = [];

  // 1) Top-level messages array (some backends return it here)
  if (Array.isArray(statePayload.messages)) {
    statePayload.messages.forEach((entry) => {
      if (typeof entry?.content === 'string' && entry.content.trim()) {
        collected.push(entry.content);
      }
      if (Array.isArray(entry?.content)) {
        entry.content.forEach(item => {
          if (typeof item === 'string' && item.trim()) {
            collected.push(item);
          } else if (item?.text) {
            collected.push(item.text);
          }
        });
      }
      if (entry?.content?.text) {
        collected.push(entry.content.text);
      }
      if (entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)) {
        try { collected.push(JSON.stringify(entry.content, null, 2)); } catch (_) {}
      }
    });
  }

  // 2) LangGraph state channels: messages
  const channelMessages = statePayload.state?.channels?.messages;
  if (Array.isArray(channelMessages)) {
    channelMessages.forEach((entry) => {
      if (typeof entry?.content === 'string' && entry.content.trim()) {
        collected.push(entry.content);
      }
      if (Array.isArray(entry?.content)) {
        entry.content.forEach(item => {
          if (typeof item === 'string' && item.trim()) {
            collected.push(item);
          } else if (item?.text) {
            collected.push(item.text);
          }
        });
      }
      if (entry?.content?.text) {
        collected.push(entry.content.text);
      }
      if (entry?.content && typeof entry.content === 'object' && !Array.isArray(entry.content)) {
        try { collected.push(JSON.stringify(entry.content, null, 2)); } catch (_) {}
      }
    });
  }

  // 3) Output channel (often contains synthesized JSON string)
  const output = statePayload.state?.channels?.output;
  if (output) {
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output);
        if (typeof parsed?.report === 'string') {
          collected.push(parsed.report);
        } else if (typeof parsed?.result === 'string') {
          collected.push(parsed.result);
        } else {
          collected.push(JSON.stringify(parsed, null, 2));
        }
      } catch (error) {
        collected.push(output);
      }
    } else if (typeof output === 'object') {
      try { collected.push(JSON.stringify(output, null, 2)); } catch (_) {}
    }
  }

  return collected;
};

export default function ChatInterface({ user }) {
  const [query, setQuery] = useState('');
  const [agentChain, setAgentChain] = useState([]);
  const [personalized, setPersonalized] = useState(false);
  const [searchMode, setSearchMode] = useState('detailed'); // 'quick' or 'detailed'
  const [isExecuting, setIsExecuting] = useState(false);
  const [threads, setThreads] = useState([]);
  const [currentThread, setCurrentThread] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(() => uuidv4());
  const [searchHistory, setSearchHistory] = useState('');
  const chatEndRef = useRef(null);
  const seenStateMsgIdsRef = useRef(new Set());

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
    setActiveThreadId(uuidv4());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isExecuting) return;

    const userQuery = query.trim();
    const tempMessageId = `temp-${Date.now()}`;
    setIsExecuting(true);
    setLoadingStage(0);

    const shuffled = [...allAgents].sort(() => 0.5 - Math.random());
    const randomAgents = shuffled.slice(0, 3);
    setSelectedAgents(randomAgents);

    const chosenAgent = searchMode === 'quick' ? 'normal_search' : 'smart_router';
    const resolvedThreadId = currentThread?.id || activeThreadId || uuidv4();

    const loadingInterval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % 4);
    }, 1500);

    const messageStub = {
      id: tempMessageId,
      query: userQuery,
      response: null,
      timestamp: new Date().toISOString(),
      isLoading: true
    };

    setActiveThreadId(resolvedThreadId);
    // Reset seen state message IDs for this request
    seenStateMsgIdsRef.current = new Set();

    if (!currentThread || isNewChatActive) {
      const newThread = {
        id: resolvedThreadId,
        messages: [messageStub],
        title: userQuery,
        timestamp: new Date().toISOString()
      };

      setCurrentThread(newThread);
      setThreads(prev => [newThread, ...prev]);
      setIsNewChatActive(false);
    } else {
      const updatedThread = {
        ...currentThread,
        id: currentThread.id || resolvedThreadId,
        messages: [...(currentThread.messages || []), messageStub]
      };
      setCurrentThread(updatedThread);
      setThreads(prev => prev.map(thread => thread.id === currentThread.id ? updatedThread : thread));
    }

    setQuery('');
    setAgentChain([]);

    // helper to upsert the message with the latest state payload
    const upsertFollowUpState = (statePayload) => {
      const updateThreadWithState = (thread) => {
        if (!thread) return thread;
        const messages = [...(thread.messages || [])];
        const idx = messages.findIndex(m => m.id === tempMessageId);
        const base = idx >= 0 ? messages[idx] : { id: tempMessageId, query: userQuery };
        const stateMessage = {
          ...base,
          response: base.response || null,
          followUpState: statePayload,
          isLoading: true,
          timestamp: new Date().toISOString()
        };
        if (idx >= 0) messages[idx] = stateMessage; else messages.push(stateMessage);
        return { ...thread, id: resolvedThreadId, messages, timestamp: new Date().toISOString() };
      };
      setCurrentThread(prev => updateThreadWithState(prev));
      setThreads(prev => prev.map(t => (t.id === (currentThread?.id || resolvedThreadId) ? updateThreadWithState(t) : t)));
    };

    // helper to toggle loader on the pending message
    const setPendingMessageLoading = (loading) => {
      const update = (thread) => {
        if (!thread) return thread;
        const messages = [...(thread.messages || [])];
        const idx = messages.findIndex(m => m.id === tempMessageId);
        if (idx >= 0) {
          messages[idx] = { ...messages[idx], isLoading: loading };
        }
        return { ...thread, messages };
      };
      setCurrentThread(prev => update(prev));
      setThreads(prev => prev.map(t => (t.id === (currentThread?.id || resolvedThreadId) ? update(t) : t)));
    };

    // start polling DeepAgents state immediately; keep going even if execute errors
    let stateAttempts = 0;
    const maxStateAttempts = 60; // ~600s at 10s interval
    const stateInterval = setInterval(async () => {
      stateAttempts += 1;
      try {
        const { data: statePayload } = await deepagentState(resolvedThreadId);
        // detect if meaningful signal exists
        const hasOutput = Boolean(statePayload?.state?.channels?.output);
        const hasMessages = Array.isArray(statePayload?.messages) && statePayload.messages.length > 0;
        const hasPending = Array.isArray(statePayload?.state?.pending_writes) && statePayload.state.pending_writes.length > 0;
        if (hasOutput || hasMessages || hasPending) {
          upsertFollowUpState(statePayload);
        }

        // Append new AI messages (type === 'ai') only if channels.mode key is present
        const channels = statePayload?.state?.channels;
        const hasModeKey = channels && Object.prototype.hasOwnProperty.call(channels, 'mode');
        const channelMsgs = channels?.messages;
        if (Array.isArray(channelMsgs) && hasModeKey) {
          for (let i = 0; i < channelMsgs.length; i += 1) {
            const m = channelMsgs[i];
            if (m?.type !== 'ai') continue;
            const mid = m?.id || `idx-${i}`;
            if (seenStateMsgIdsRef.current.has(mid)) continue;

            let contentStr = '';
            if (typeof m?.content === 'string') contentStr = m.content;
            else if (Array.isArray(m?.content)) contentStr = m.content.filter(Boolean).map(String).join('\n\n');
            else if (m?.content?.text) contentStr = String(m.content.text || '');

            contentStr = contentStr.trim();
            if (!contentStr) { seenStateMsgIdsRef.current.add(mid); continue; }

            // Deduplicate against the last AI message content
            const lastMsg = (currentThread?.messages || []).slice(-1)[0];
            if (lastMsg && !lastMsg.query) {
              const lastContent = coerceToString(lastMsg?.response?.result ?? lastMsg?.response);
              if (lastContent && lastContent.trim() === contentStr) {
                seenStateMsgIdsRef.current.add(mid);
                continue;
              }
            }

            seenStateMsgIdsRef.current.add(mid);

            const interimResponse = {
              agent_name: statePayload.agent_name || chosenAgent,
              thread_id: resolvedThreadId,
              result: contentStr,
              raw_response: { state: statePayload.state }
            };

            const appendAi = (thread) => {
              if (!thread) return thread;
              const messages = [...(thread.messages || [])];
              messages.push({
                id: `ai-${mid}`,
                query: '',
                response: interimResponse,
                timestamp: new Date().toISOString(),
                isLoading: false
              });
              return { ...thread, messages };
            };

            setCurrentThread(prev => appendAi(prev));
            setThreads(prev => prev.map(t => (t.id === (currentThread?.id || resolvedThreadId) ? appendAi(t) : t)));
          }
        }

        // If final output present, parse it and append as a new AI message
        if (hasOutput) {
          const rawOut = statePayload.state.channels.output;
          let parsedOut = null;
          if (typeof rawOut === 'string') {
            try { parsedOut = JSON.parse(rawOut); } catch (_) { parsedOut = { markdown: String(rawOut) }; }
          } else if (typeof rawOut === 'object') {
            parsedOut = rawOut;
          } else {
            parsedOut = { markdown: String(rawOut) };
          }

          const uiResponse = {
            agent_name: statePayload.agent_name || chosenAgent,
            thread_id: resolvedThreadId,
            result: parsedOut,
            sources: Array.isArray(parsedOut?.sources) ? parsedOut.sources : [],
            raw_response: { state: statePayload.state }
          };

          const finalContent = coerceToString(uiResponse.result);

          const appendFinal = (thread) => {
            if (!thread) return thread;
            const messages = [...(thread.messages || [])];
            // mark pending loader off
            const idxPending = messages.findIndex(m => m.id === tempMessageId);
            if (idxPending >= 0) messages[idxPending] = { ...messages[idxPending], isLoading: false };
            // de-dup against last AI content and skip empty
            const lastMsg = messages.slice(-1)[0];
            const lastContent = lastMsg && !lastMsg.query ? coerceToString(lastMsg?.response?.result ?? lastMsg?.response) : '';
            const trimmedFinal = (finalContent || '').trim();
            if (trimmedFinal && !(lastContent && lastContent.trim() === trimmedFinal)) {
              messages.push({
                id: `final-${Date.now()}`,
                query: '',
                response: uiResponse,
                timestamp: new Date().toISOString(),
                isLoading: false
              });
            }
            return { ...thread, id: resolvedThreadId, messages };
          };

          setCurrentThread(prev => appendFinal(prev));
          setThreads(prev => prev.map(t => (t.id === (currentThread?.id || resolvedThreadId) ? appendFinal(t) : t)));

          // stop loaders and polling once final output is appended
          setPendingMessageLoading(false);
          clearInterval(stateInterval);
        }
      } catch (err) {
        // swallow individual poll errors
      } finally {
        if (stateAttempts >= maxStateAttempts) {
          clearInterval(stateInterval);
          setPendingMessageLoading(false);
        }
      }
    }, 10000);

    try {
      const { data } = await deepagentChat({
        user_query: userQuery,
        agent_name: chosenAgent,
        thread_id: resolvedThreadId
      });

      clearInterval(loadingInterval);

      const returnedThreadId = data.thread_id || resolvedThreadId;
      const updatedMessage = {
        id: tempMessageId,
        query: userQuery,
        response: data,
        timestamp: new Date().toISOString(),
        isLoading: false
      };

      const updateThreadMessages = (thread) => {
        if (!thread) return thread;
        const messages = [...(thread.messages || [])];
        const lastIndex = messages.findIndex(msg => msg.id === tempMessageId) ?? (messages.length - 1);
        const indexToUpdate = lastIndex >= 0 ? lastIndex : messages.length - 1;
        if (indexToUpdate >= 0) {
          messages[indexToUpdate] = { ...messages[indexToUpdate], ...updatedMessage };
        } else {
          messages.push(updatedMessage);
        }
        return {
          ...thread,
          id: returnedThreadId,
          messages,
          title: thread.title || userQuery,
          timestamp: new Date().toISOString()
        };
      };

      setActiveThreadId(returnedThreadId);
      setCurrentThread(prev => updateThreadMessages(prev));
      setThreads(prev => prev.map(thread => {
        if (thread.id === (currentThread?.id || resolvedThreadId)) {
          return updateThreadMessages(thread);
        }
        return thread;
      }));

      // stop state polling once we have a concrete response
      clearInterval(stateInterval);
    } catch (error) {
      clearInterval(loadingInterval);
      console.error('Execution error:', error);
      // keep loader on while polling
      setPendingMessageLoading(true);
      // do not clear stateInterval here; let it continue polling
    } finally {
      clearInterval(loadingInterval);
      setIsExecuting(false);
      setLoadingStage(0);
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
      await fetch(`/api/chat/thread/${threadId}`, {
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
        setActiveThreadId(uuidv4());
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
  useEffect(() => {
  if (window.innerWidth < 768) {
    setSidebarOpen(false);
  }
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height: '100dvh' }}>

      {/* DotGrid Background */}
      <div className="absolute inset-0 -z-10">
        <DotGrid
          dotSize={3}
          gap={20}
          baseColor="#223a38"
          activeColor="#34d0ff"
          proximity={100}
          shockRadius={300}
          shockStrength={4}
          resistance={900}
          returnDuration={5}
        />
      </div>

      {/* Main Layout Wrapper — only ONE */}
      <div className="backdrop-blur-[1px] flex relative" style={{ height: '100dvh' }}>
        {/* Left Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-72' : 'w-22'} 
          fixed left-0 top-0 h-screen bg-black/65 backdrop-blur-sm transition-[width] ease-in-out duration-300 
          overflow-hidden flex flex-col z-50
          ${sidebarOpen ? 'flex' : 'hidden md:flex'}`}
        >

          {/* ---------- TOP SECTION ---------- */}
          <div className="border-b border-white/10 relative">

            {/* Top Row — LOGO + Collapse Button */}
            {sidebarOpen ? (
              <div className="flex items-center justify-between px-4 py-4">
                {/* Logo and Text */}
                <div className="flex items-center gap-2">
                  <img
                    src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png"
                    alt="Sagent AI Logo"
                    className="w-8 h-8 object-contain"
                  />
                  <span className="font-stacksans text-lg font-medium text-white">
                    agent AI
                  </span>
                </div>

                {/* Collapse Toggle */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 space-y-3">
                {/* Logo on top */}
                <img
                  src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/ghe15bl1_Screenshot%202025-11-05%20at%2011.17.40%20PM.png"
                  alt="Sagent AI Logo"
                  className="w-8 h-8 object-contain"
                />
                
                {/* Collapse Toggle below */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* New Chat Button */}
            <div className="px-4">
              {sidebarOpen ? (
                <Button
                  onClick={createNewThread}
                  className="w-full font-stacksans transition-all duration-300
                    bg-white/5 text-white/60 hover:text-white
                    hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-700/20
                    hover:border-transparent h-12 mb-3"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </Button>
              ) : (
                <button
                  onClick={createNewThread}
                  className="w-full flex items-center justify-center py-3 mb-3 
                            hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-700/20
                            hover:border-transparent h-12 mb-3 rounded-lg transition"
                >
                  <Plus className="w-5 h-5 text-white/70" />
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="px-4 pb-4">
              {sidebarOpen ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search Chats..."
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="font-stacksans pl-9 bg-white/5 border-white/0 text-white 
                      placeholder:text-gray-500 h-9 text-sm
                      focus:bg-white/10 focus:outline-none focus:ring-0 focus:border-white/0"
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSidebarOpen(true);
                    setTimeout(() => {
                      const el = document.querySelector('input[placeholder="Search Chats..."]');
                      el?.focus();
                    }, 200);
                  }}
                  className="w-full flex items-center justify-center py-3 hover:bg-white/10 rounded-lg transition"
                >
                  <Search className="w-5 h-5 text-white/60" />
                </button>
              )}
            </div>
          </div>

          {/* ---------- THREAD LIST ---------- */}
          <div className="flex-1 overflow-y-auto p-2">

            {sidebarOpen ? (
              <div className="space-y-1">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className={`group relative rounded-lg hover:bg-white/5 transition-colors ${
                      currentThread?.id === thread.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-700/20'
                        : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        setCurrentThread(thread);
                        setActiveThreadId(thread.id);
                      }}
                      className="w-full text-left p-3"
                      data-testid={`thread-${thread.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-sm text-white truncate font-medium">
                            {thread.title || thread.messages?.[0]?.query || thread.query || 'Untitled'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(thread.timestamp).toLocaleDateString()} ·{" "}
                            {thread.messages?.length || 1}{" "}
                            {thread.messages?.length === 1 ? "Message" : "Messages"}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-start items-center gap-6 p-4">
                {/* No thread icons */}
              </div>
            )}
          </div>

          {/* ---------- FOOTER LINKS ---------- */}
          <div className="p-6 border-t border-white/0">
            {sidebarOpen ? (
              <div className="flex items-center justify-center gap-12 text-sm">
                <a href="/agents" className="font-stacksans text-gray-400 hover:text-white transition-colors">Agents</a>
                <a href="/pricing" className="font-stacksans text-gray-400 hover:text-white transition-colors">Pricing</a>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <a href="/agents" className="p-2 rounded-lg transition flex items-center justify-center">
                  <img src="/icons/agents.png" className="w-8 h-8 invert 
                                                          filter
                                                          opacity-70 
                                                          hover:opacity-100 
                                                          hover:brightness-150 
                                                          transition" />
                </a>
                <a href="/pricing" className="p-2 rounded-lg transition flex items-center justify-center">
                  <img src="/icons/pricing.png" className="w-5 h-5 invert 
                                                          filter
                                                          opacity-70 
                                                          hover:opacity-100 
                                                          hover:brightness-150 
                                                          transition" />
                </a>
              </div>
            )}
          </div>

        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col" style={{ height: '100dvh' }}>
          <header className={`flex-shrink-0 
            ${sidebarOpen ? 'md:ml-72' : 'md:ml-16'}
            border-b border-white/0 bg-grey-500/5 backdrop-blur-sm transition-all duration-300 ease-in-out`}>
            <div className="px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <a href="/agents" className="text-gray-400 font-stacksans hover:text-white transition-colors text-sm md:text-base hidden md:block">Agents</a>
                <a href="/pricing" className="text-gray-400 font-stacksans hover:text-white transition-colors text-sm md:text-base hidden md:block">Pricing</a>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                  <span className="text-white font-stacksans text-sm md:text-base hidden sm:inline">{user?.name}</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 md:px-6 py-3 md:py-4">
            <div className="max-w-4xl mx-auto px-2 md:px-6 py-2 md:py-4 min-h-full flex flex-col justify-center">
              {!currentThread ? (
                <div className="text-center">
                  <img
                    src="https://customer-assets.emergentagent.com/job_smart-dispatch-7/artifacts/37zbur7o_Screenshot%202025-11-05%20at%2011.17.40%20PM.png"
                    alt="Sagent AI Logo"
                    className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 object-contain"
                  />
                  <h2 className="font-stacksans text-xl md:text-3xl font-bold text-white mb-2 md:mb-3">What can I help with?</h2>
                  <p className="font-stacksans text-sm md:text-base text-gray-400 mb-4 md:mb-6">Ask a question and let our specialized AI agents research it for you</p>

                  {/* Example Prompts - Compact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-w-2xl mx-auto">
                    {examplePrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(prompt)}
                        className="font-stacksans text-left p-2.5 md:p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all group"
                      >
                        <p className="text-xs md:text-[14px] text-gray-100 group-hover:text-white transition-colors">{prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {((currentThread.messages || []).filter((message) => {
                    if (message?.query) return true;
                    if (message?.response) {
                      const content = coerceToString(message.response?.result ?? message.response?.raw_response?.result);
                      return Boolean(content && content.trim());
                    }
                    return false;
                  })).map((message, msgIndex) => {
                    const markdownContent = extractMarkdown(message.response);
                    const plainTextContent = extractPlainText(message.response);
                    const providers = extractProviders(message.response);

                    return (
                      <div key={message.id || msgIndex} className="space-y-3 md:space-y-4">
                        <div>
                          {message.query ? (
                            <>
                              <h2 className="text-xl md:text-3xl font-bold text-white mb-2">{message.query}</h2>
                              <div className="flex items-center justify-between gap-3 md:gap-4 flex-wrap">
                                {providers.length > 0 && (
                                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                    {providers.map((provider, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 font-medium"
                                      >
                                        {provider}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between gap-3 md:gap-4 flex-wrap">
                              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
                                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                                <span>{new Date(message.timestamp).toLocaleString()}</span>
                              </div>
                              {providers.length > 0 && (
                                <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                                  {providers.map((provider, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 font-medium"
                                    >
                                      {provider}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {message.isLoading && (
                          <div className="space-y-3 md:space-y-4 py-4 md:py-6">
                            <div className="flex items-center gap-2 md:gap-3 text-gray-400">
                              <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-t-2 border-b-2 border-blue-500"></div>
                              <span className="text-sm md:text-lg">{getLoadingMessages(selectedAgents)[loadingStage].text}</span>
                            </div>
                            {loadingStage === 2 && (
                              <div className="flex gap-1.5 md:gap-2 flex-wrap ml-7 md:ml-9">
                                {selectedAgents.map(agent => (
                                  <span key={agent} className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs md:text-sm text-blue-300 animate-pulse">
                                    {agent}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {message.response && (
                          <div className="space-y-4 md:space-y-6">
                            <div className="prose prose-sm md:prose-lg prose-invert max-w-none">
                              <div className="flex items-center justify-between mb-3 md:mb-4">
                                <div className="flex flex-col gap-0.5 md:gap-1">
                                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">Answer</div>
                                  {extractAgentName(message.response) && (
                                    <div className="text-[10px] md:text-xs text-gray-600">Agent: {displayAgentName(extractAgentName(message.response))}</div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(markdownContent || plainTextContent)}
                                    className="text-gray-400 hover:text-white h-6 md:h-7"
                                    disabled={!markdownContent && !plainTextContent}
                                  >
                                    <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                  </Button>
                                </div>
                              </div>
                              {markdownContent ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {markdownContent}
                                </ReactMarkdown>
                              ) : (
                                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {plainTextContent || 'No content returned from agent.'}
                                </div>
                              )}
                            </div>

                            {(() => {
                              const srcs = extractSources(message.response);
                              if (!srcs || srcs.length === 0) return null;
                              const groups = groupSourcesByProvider(srcs);
                              const stats = providerStats(srcs);
                              return (
                                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Sources</div>
                                    {stats.total > 0 && (
                                      <div className="flex flex-col items-end gap-2">
                                        <div className="h-3 w-56 sm:w-72 md:w-80 bg-white/10 rounded overflow-hidden flex" aria-label="Provider usage">
                                          {stats.ordered.map((p, idx) => {
                                            const count = stats.counts[p] || 0;
                                            const pct = Math.round((count / stats.total) * 100);
                                            const cls = providerSegmentClasses[idx % providerSegmentClasses.length];
                                            return (
                                              <div
                                                key={p}
                                                title={`${p}: ${pct}% (${count}/${stats.total})`}
                                                aria-label={`${p}: ${pct}%`}
                                                className={`${cls}`}
                                                style={{ width: `${Math.max(pct, 1)}%` }}
                                              />
                                            );
                                          })}
                                        </div>
                                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
                                          {stats.ordered.map((p, idx) => {
                                            const count = stats.counts[p] || 0;
                                            const pct = Math.round((count / stats.total) * 100);
                                            const cls = providerSegmentClasses[idx % providerSegmentClasses.length];
                                            return (
                                              <div key={`legend-${p}`} className="flex items-center gap-1 text-[11px]">
                                                <span className={`inline-block h-2 w-2 rounded ${cls}`} />
                                                <span className="text-gray-300">{p}</span>
                                                <span className="text-gray-500">{` ${pct}% (${count})`}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-xs text-gray-400 uppercase tracking-wider hover:text-gray-300">
                                      links
                                    </summary>
                                    <div className="space-y-3 mt-2">
                                      {stats.ordered.map((providerName, idx) => {
                                        const list = (groups.get && groups.get(providerName)) || [];
                                        const sorted = list.slice().sort((a, b) => parseSourceDate(b) - parseSourceDate(a));
                                        return (
                                          <div key={providerName}>
                                            <div className="flex items-center gap-2">
                                              <span className="px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 font-medium">
                                                {providerName} · {sorted.length}
                                              </span>
                                            </div>
                                            <ul className="space-y-2 mt-1">
                                              {sorted.map((source, sidx) => (
                                                <li key={source.id || source.url || sidx} className="text-sm text-gray-300">
                                                  {source.title ? <span className="font-medium text-white">{source.title}</span> : null}
                                                  {source.publisher ? <span className="text-gray-500 ml-2">({source.publisher})</span> : null}
                                                  {source.date ? <span className="text-gray-500 ml-2">{source.date}</span> : null}
                                                  {source.url && (
                                                    <div>
                                                      <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 break-all">
                                                        {source.url}
                                                      </a>
                                                    </div>
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </details>
                                </div>
                              );
                            })()}

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
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </main>

          {/* Fixed Input Area */}
          <div className="flex-shrink-0 border-t border-white/0 bg-black/65 backdrop-blur-sm" 
              style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <div className="max-w-4xl mx-auto px-3 md:px-6 pt-3 md:pt-6 pb-3 md:pb-4">

              {/* Single Row: Mode + Input + Send */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2 md:gap-4">

                {/* Mode Selector - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm md:text-base text-gray-400">Mode:</span>

                  <Select value={searchMode} onValueChange={setSearchMode}>
                    <SelectTrigger className="h-12 md:h-14 w-24 md:w-28 bg-white/5 border-white/20 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent className="bg-black/5 border-white/10">
                      <SelectItem value="quick" className="text-sm text-white hover:bg-white/10">Quick</SelectItem>
                      <SelectItem value="detailed" className="text-sm text-white hover:bg-white/10">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Input */}
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything..."
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 placeholder:text-sm md:placeholder:text-base h-12 md:h-14 text-sm md:text-base focus:border-cyan-500/50"
                  disabled={isExecuting}
                  data-testid="chat-input"
                />

                {/* Send */}
                <Button
                  type="submit"
                  disabled={!query.trim() || isExecuting}
                  className="h-12 md:h-14 px-4 md:px-6 bg-gradient-to-r from-cyan-500/40 to-blue-700/40 hover:bg-gradient-to-r hover:from-cyan-500/50 hover:to-blue-700/50 text-white"
                  data-testid="send-button"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </Button>

              </form>
            </div>
          </div>

        </div>
        {!sidebarOpen && (
          <button
            className="fixed top-4 left-4 z-50 md:hidden p-3 rounded-full 
                      bg-white/10 backdrop-blur-md text-white 
                      hover:bg-white/20 transition"
            onClick={() => setSidebarOpen(true)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

      </div>
    </div>
  );
  }  