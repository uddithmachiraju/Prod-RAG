import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, Plus, Copy, Share2, Edit3, Trash2, BookOpen, Filter } from 'lucide-react';
import { Badge, Modal, EmptyState } from '../components/ui';
import { promptLibrary } from '../store/mockData';
import { useNavigate } from 'react-router-dom';

const categories = ['All', 'Contract Review', 'Compliance', 'Research'];

export default function PromptLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [prompts, setPrompts] = useState(promptLibrary);
  const navigate = useNavigate();

  const toggleFavorite = (id) => {
    setPrompts(prev => prev.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p));
  };

  const filtered = prompts.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'All' && p.category !== category) return false;
    return true;
  });

  const grouped = categories.slice(1).reduce((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Prompt Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">{prompts.length} prompts · {prompts.filter(p => p.favorite).length} favorites</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> Create Prompt
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prompts..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Favorites section */}
      {category === 'All' && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Star size={14} className="text-amber-400 fill-amber-400" /> Favorites
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prompts.filter(p => p.favorite).map((p, i) => (
              <PromptCard key={p.id} prompt={p} index={i} onToggleFavorite={toggleFavorite} onUse={() => navigate('/workspace')} />
            ))}
          </div>
        </div>
      )}

      {/* Grouped sections */}
      {category === 'All' ? (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-8">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((p, i) => (
                <PromptCard key={p.id} prompt={p} index={i} onToggleFavorite={toggleFavorite} onUse={() => navigate('/workspace')} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p, i) => (
            <PromptCard key={p.id} prompt={p} index={i} onToggleFavorite={toggleFavorite} onUse={() => navigate('/workspace')} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <EmptyState icon="📚" title="No prompts found" description="Create custom prompts to streamline your document review workflow."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={14} /> Create Prompt</button>} />
      )}

      <CreatePromptModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function PromptCard({ prompt, index, onToggleFavorite, onUse }) {
  const [copied, setCopied] = useState(false);

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="card p-4 hover:shadow-md transition-all group cursor-pointer" onClick={onUse}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{prompt.icon}</span>
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{prompt.title}</h3>
        </div>
        <button onClick={e => { e.stopPropagation(); onToggleFavorite(prompt.id); }}
          className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${prompt.favorite ? 'text-amber-400' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>
          <Star size={14} className={prompt.favorite ? 'fill-amber-400' : ''} />
        </button>
      </div>
      <Badge variant="default">{prompt.category}</Badge>
      <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{prompt.prompt}</p>
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
          <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={onUse} className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
          <BookOpen size={12} /> Use
        </button>
        <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
          <Share2 size={12} /> Share
        </button>
      </div>
    </motion.div>
  );
}

function CreatePromptModal({ open, onClose }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Contract Review');
  const [promptText, setPromptText] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Create Custom Prompt" size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="e.g. Extract Payment Terms" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-field">
            {['Contract Review', 'Compliance', 'Research'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Prompt</label>
          <textarea value={promptText} onChange={e => setPromptText(e.target.value)} className="input-field resize-none" rows={6}
            placeholder="Write your prompt here. Be specific about what you want the AI to do..." />
          <p className="text-xs text-slate-400 mt-1">{promptText.length} characters</p>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center" disabled={!title.trim() || !promptText.trim()}>
            Save Prompt
          </button>
        </div>
      </div>
    </Modal>
  );
}
