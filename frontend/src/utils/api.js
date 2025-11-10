import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});
// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Waitlist
export const submitWaitlist = (data) => api.post('/waitlist', data);

// Auth
export const processSession = (sessionId) => api.post('/auth/session-data', null, {
  headers: { 'X-Session-ID': sessionId }
});

export const getCurrentUser = () => api.get('/auth/me');

export const logout = () => api.post('/auth/logout');

// Agents
export const getAllAgents = () => api.get('/agents');

export const getSubscribedAgents = () => api.get('/agents/subscribed');

export const subscribeAgent = (agentId) => api.post(`/agents/${agentId}/subscribe`);

export const unsubscribeAgent = (agentId) => api.delete(`/agents/${agentId}/unsubscribe`);

// Chat
export const previewAgentChain = (query) => api.post('/chat/preview', query);

export const executeChatQuery = (request) => api.post('/chat/execute', request);

export const getChatHistory = (limit = 50) => api.get('/chat/history', { params: { limit } });

export const deepagentChat = (payload) => api.post('/chat/execute', payload);

export const deepagentState = (threadId) => api.get(`/chat/state/${threadId}`);

// Analytics
export const getAnalytics = () => api.get('/analytics');

export default api;