import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MessageSquare, Pin, Star, Archive, Trash2, MoreHorizontal, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, EmptyState } from '../components/ui';
import { formatTimeAgo, groupChatsByDate } from '../utils/date';

export default function Chats() {
  const { chats, setActiveChat, agents } = useApp();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = chats.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase()));

  const grouped = groupChatsByDate(filtered);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Conversations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{chats.length} conversations across all projects</p>
        </div>
        <button onClick={() => navigate('/workspace')} className="btn-primary">
          <Plus size={16} /> New Chat
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="input-field pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💬" title="No conversations" description="Start a new conversation to analyze your documents."
          action={<button onClick={() => navigate('/workspace')} className="btn-primary"><Plus size={14} /> New Chat</button>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).filter(([, items]) => items.length > 0).map(([group, items]) => (
            <div key={group}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group}</h2>
              <div className="card divide-y divide-slate-50 dark:divide-slate-800">
                {items.map((chat, i) => {
                  const agent = agents.find(a => a.name === chat.agent);
                  return (
                    <motion.div key={chat.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                      onClick={() => { setActiveChat(chat); navigate('/workspace'); }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: `${agent?.color || '#4F46E5'}15` }}>
                        {agent?.icon || '💬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {chat.pinned && <Pin size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{chat.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2">{chat.lastMessage}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="purple">{chat.agent}</Badge>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock size={11} />
                            <span className="text-[10px]">{formatTimeAgo(chat.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Pin">
                          <Pin size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400" title="Archive">
                          <Archive size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
