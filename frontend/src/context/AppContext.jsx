import { createContext, useCallback, useContext, useState } from 'react';
import { agents, currentUser, documents, notes, notifications, projects, workspaces, chats as mockChats } from '../store/mockData';

const AppContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [activeWorkspace, setActiveWorkspace] = useState(workspaces[0]);
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeAgent, setActiveAgent] = useState(agents[1]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState({});
  const [loading, setLoading] = useState({});
  const [recentChats, setRecentChats] = useState(mockChats);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }, [theme]);

  const addMessage = useCallback((chatId, message) => {
    setChatMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message],
    }));
  }, []);

  const setPageLoading = useCallback((key, val) => {
    setLoading(prev => ({ ...prev, [key]: val }));
  }, []);

  const fetchRecentChats = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch(`${BASE_URL}/chats/recent-chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      // Normalise API response to match the shape used in the UI
      const normalised = data.map(chat => ({
        id: chat._id || chat.id || chat.chat_id,
        title: chat.title || 'Untitled Chat',
        lastMessage: chat.last_message || chat.lastMessage || chat.last_message_preview || '',
        updatedAt: chat.updated_at || chat.updatedAt || '',
        agent: chat.agent || '',
        messages: chat.messages || [],
      }));
      setRecentChats(normalised);
    } catch {
      // Keep the mock data as fallback on network errors
    }
  }, []);

  const value = {
    theme, toggleTheme,
    activeWorkspace, setActiveWorkspace,
    activeProject, setActiveProject,
    activeChat, setActiveChat,
    activeDoc, setActiveDoc,
    activeAgent, setActiveAgent,
    sidebarOpen, setSidebarOpen,
    commandOpen, setCommandOpen,
    searchQuery, setSearchQuery,
    notifOpen, setNotifOpen,
    chatMessages, addMessage,
    loading, setPageLoading,
    user: currentUser,
    workspaces, projects, documents, notes, notifications, agents,
    chats: recentChats, recentChats, fetchRecentChats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
