import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Star, Archive, Trash2, Edit3, MoreHorizontal, FileText, MessageSquare, BarChart2, Filter, Grid, List } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Modal, EmptyState } from '../components/ui';

export default function Projects() {
  const { projects, setActiveProject } = useApp();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'active') return p.status === 'active';
    if (filter === 'archived') return p.status === 'archived';
    if (filter === 'pinned') return p.pinned;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{projects.filter(p => p.status === 'active').length} active projects</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {['all', 'active', 'pinned', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-primary text-white' : 'text-slate-500'}`}><Grid size={14} /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-primary text-white' : 'text-slate-500'}`}><List size={14} /></button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📁" title="No projects found" description="Create a new project to organize your documents and conversations."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={14} /> New Project</button>} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} onOpen={() => { setActiveProject(project); navigate('/workspace'); }} />
          ))}
        </div>
      ) : (
        <div className="card divide-y divide-slate-50 dark:divide-slate-800">
          {filtered.map((project, i) => (
            <ProjectRow key={project.id} project={project} onOpen={() => { setActiveProject(project); navigate('/workspace'); }} />
          ))}
        </div>
      )}

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function ProjectCard({ project, index, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }} className="card p-5 cursor-pointer group hover:shadow-md transition-all" onClick={onOpen}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${project.color}15` }}>
          {project.icon}
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {project.pinned && <Star size={14} className="text-amber-400 fill-amber-400" />}
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{project.description}</p>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <FileText size={12} />
          <span>{project.docs} docs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare size={12} />
          <span>{project.chats} chats</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
        <Badge variant={project.status === 'active' ? 'success' : 'default'}>{project.status}</Badge>
        <span className="text-xs text-slate-400">Updated {project.updatedAt}</span>
      </div>
    </motion.div>
  );
}

function ProjectRow({ project, onOpen }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group" onClick={onOpen}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${project.color}15` }}>
        {project.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">{project.name}</div>
        <div className="text-xs text-slate-500 truncate">{project.description}</div>
      </div>
      <div className="flex items-center gap-6 text-xs text-slate-500 flex-shrink-0">
        <span>{project.docs} docs</span>
        <span>{project.chats} chats</span>
        <Badge variant={project.status === 'active' ? 'success' : 'default'}>{project.status}</Badge>
        <span>{project.updatedAt}</span>
      </div>
    </div>
  );
}

function CreateProjectModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const icons = ['📋', '📁', '📜', '🔬', '⚖️', '💼', '🏢', '🔒'];
  const colors = ['#4F46E5', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#64748B'];
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#4F46E5');

  return (
    <Modal open={open} onClose={onClose} title="Create New Project" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Project Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Vendor Agreement Review" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="input-field resize-none" rows={3} placeholder="Brief description of this project..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Icon</label>
          <div className="flex gap-2 flex-wrap">
            {icons.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${icon === ic ? 'ring-2 ring-primary bg-primary/10' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Color</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center" disabled={!name.trim()}>Create Project</button>
        </div>
      </div>
    </Modal>
  );
}
