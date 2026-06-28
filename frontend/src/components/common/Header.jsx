import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Sun, Moon, PanelLeft, Command, ChevronDown, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar, Badge } from '../ui';

export default function Header() {
  const { user, theme, toggleTheme, sidebarOpen, setSidebarOpen, workspaces, activeWorkspace, setActiveWorkspace,
    notifications, notifOpen, setNotifOpen, commandOpen, setCommandOpen } = useApp();
  const [wsOpen, setWsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setCommandOpen]);

  return (
    <>
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 gap-3 flex-shrink-0 z-20">
        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <PanelLeft size={18} />
        </button>

        {/* Workspace selector */}
        <div className="relative">
          <button onClick={() => setWsOpen(!wsOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm">
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white"
              style={{ background: activeWorkspace.color }}>
              {activeWorkspace.name[0]}
            </div>
            <span className="font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">{activeWorkspace.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          <AnimatePresence>
            {wsOpen && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-1 w-56 card py-1 shadow-lg z-50">
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => { setActiveWorkspace(ws); setWsOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm transition-colors">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: ws.color }}>{ws.name[0]}</div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{ws.name}</div>
                      <div className="text-xs text-slate-400">{ws.type}</div>
                    </div>
                    {activeWorkspace.id === ws.id && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-lg">
          <button onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Search size={14} />
            <span className="flex-1 text-left">Search documents, chats, notes...</span>
            <kbd className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors relative">
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 w-80 card shadow-xl z-50">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unread > 0 && <Badge variant="primary">{unread} new</Badge>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors ${!n.read ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                          <div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{n.title}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                    <button className="w-full text-xs text-primary text-center py-1 hover:underline">View all notifications</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 cursor-pointer" onClick={() => navigate('/settings')}>
            <Avatar name={user.name} size="sm" />
          </div>
        </div>
      </header>

      {/* Command Palette */}
      <CommandPalette />
    </>
  );
}

function CommandPalette() {
  const { commandOpen, setCommandOpen, documents, chats, notes } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { if (commandOpen) setTimeout(() => inputRef.current?.focus(), 50); }, [commandOpen]);
  useEffect(() => { if (!commandOpen) setQuery(''); }, [commandOpen]);

  const actions = [
    { label: 'New Chat', icon: '💬', action: () => { navigate('/workspace'); setCommandOpen(false); } },
    { label: 'Upload Document', icon: '📤', action: () => { navigate('/documents'); setCommandOpen(false); } },
    { label: 'View Analytics', icon: '📊', action: () => { navigate('/analytics'); setCommandOpen(false); } },
    { label: 'Generate Report', icon: '📋', action: () => { navigate('/reports'); setCommandOpen(false); } },
    { label: 'Open Notes', icon: '📝', action: () => { navigate('/notes'); setCommandOpen(false); } },
    { label: 'Prompt Library', icon: '📚', action: () => { navigate('/prompts'); setCommandOpen(false); } },
  ];

  const filtered = query
    ? [...documents.filter(d => d.name.toLowerCase().includes(query.toLowerCase())).map(d => ({ label: d.name, icon: '📄', type: 'doc' })),
       ...chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => ({ label: c.title, icon: '💬', type: 'chat' })),
       ...actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))]
    : actions;

  return (
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }} transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
              <Command size={18} className="text-slate-400 flex-shrink-0" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search or run a command..." className="flex-1 outline-none bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400" />
              <kbd onClick={() => setCommandOpen(false)} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono cursor-pointer text-slate-500">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {!query && <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</div>}
              {filtered.map((item, i) => (
                <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                  {item.type && <Badge variant="default">{item.type}</Badge>}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-400">No results for "{query}"</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
