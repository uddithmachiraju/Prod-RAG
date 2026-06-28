import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderOpen, MessageSquare, FileText, StickyNote,
  BarChart2, Puzzle, Settings, ChevronDown, Plus, Search, Star,
  Archive, Trash2, Edit3, Pin, ChevronRight, Zap, Shield, Brain,
  Users, BookOpen, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Avatar, StatusDot } from '../ui';
import { groupChatsByDate } from '../../utils/date';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/workspace', icon: Brain, label: 'Workspace' },
  { path: '/projects', icon: FolderOpen, label: 'Projects' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/chats', icon: MessageSquare, label: 'Chats' },
  { path: '/notes', icon: StickyNote, label: 'Notes' },
  { path: '/reports', icon: BarChart2, label: 'Reports' },
  { path: '/analytics', icon: Zap, label: 'Analytics' },
  { path: '/prompts', icon: BookOpen, label: 'Prompt Library' },
  { path: '/integrations', icon: Puzzle, label: 'Integrations' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/admin', icon: Shield, label: 'Admin Console' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, activeProject, setActiveProject, activeChat, setActiveChat, projects, chats, user } = useApp();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [chatSearch, setChatSearch] = useState('');
  const navigate = useNavigate();

  const pinnedProjects = projects.filter(p => p.pinned);
  const recentChats = chats.filter(c => !chatSearch || c.title.toLowerCase().includes(chatSearch.toLowerCase())).slice(0, 8);

  const groupedChats = groupChatsByDate(recentChats);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ x: -260, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -260, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-[250px] flex-shrink-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-30"
        >
          {/* Logo */}
          <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white text-sm font-bold">A</div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Accorder AI</div>
                <div className="text-[10px] text-slate-400">Document Intelligence</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              <PanelLeftClose size={15} />
            </button>
          </div>

          {/* New Chat CTA */}
          <div className="px-3 py-3">
            <button onClick={() => navigate('/workspace')}
              className="w-full btn-primary justify-center py-2.5 text-sm rounded-xl">
              <Plus size={15} /> New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                placeholder="Search chats & docs..." className="input-field pl-8 py-1.5 text-xs" />
            </div>
          </div>

          {/* Nav + content */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {/* Main Nav */}
            <div className="mb-2">
              {navItems.slice(0, 2).map(item => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-slate-600 dark:text-slate-400'}`}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Pinned Projects */}
            <div className="mb-1">
              <button onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="sidebar-link w-full text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold justify-between">
                <span>Projects</span>
                <ChevronDown size={13} className={`transition-transform ${projectsExpanded ? '' : '-rotate-90'}`} />
              </button>
              <AnimatePresence>
                {projectsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {pinnedProjects.map(p => (
                      <button key={p.id} onClick={() => { setActiveProject(p); navigate('/projects'); }}
                        className={`sidebar-link w-full text-slate-600 dark:text-slate-400 ${activeProject?.id === p.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                        <span className="text-base">{p.icon}</span>
                        <span className="truncate text-xs">{p.name}</span>
                        <span className="ml-auto text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{p.docs}</span>
                      </button>
                    ))}
                    <NavLink to="/projects" className="sidebar-link text-primary text-xs">
                      <Plus size={13} /> All Projects
                    </NavLink>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chats history */}
            <div className="mb-1">
              <button onClick={() => setChatsExpanded(!chatsExpanded)}
                className="sidebar-link w-full text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold justify-between">
                <span>Chats</span>
                <ChevronDown size={13} className={`transition-transform ${chatsExpanded ? '' : '-rotate-90'}`} />
              </button>
              <AnimatePresence>
                {chatsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    {Object.entries(groupedChats).filter(([, items]) => items.length > 0).map(([group, items]) => (
                      <div key={group}>
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{group}</div>
                        {items.map(chat => (
                          <button key={chat.id} onClick={() => { setActiveChat(chat); navigate('/workspace'); }}
                            className={`sidebar-link w-full text-left !items-start ${activeChat?.id === chat.id ? 'active' : 'text-slate-600 dark:text-slate-400'}`}>
                            <MessageSquare size={13} className="flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-xs font-semibold">{chat.title}</div>
                              {chat.lastMessage && (
                                <div className="truncate text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-normal">{chat.lastMessage}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* More Nav */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">Tools</div>
              {navItems.slice(2).map(item => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : 'text-slate-600 dark:text-slate-400'}`}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* User */}
          <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
              <Avatar name={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.role}</div>
              </div>
              <StatusDot status="online" />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
