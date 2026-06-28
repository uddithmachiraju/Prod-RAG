import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Tag, Pin, Trash2, Edit3, BookmarkCheck, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Modal, EmptyState } from '../components/ui';

const categories = ['All', 'Risks', 'Findings', 'Actions', 'Dates', 'Clauses'];

export default function Notes() {
  const { notes } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const filtered = notes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notes Center</h1>
          <p className="text-sm text-slate-500 mt-0.5">{notes.length} saved notes and findings</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus size={16} /> New Note
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === c ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title="No notes yet" description="Save AI responses, findings, and insights as notes for easy reference."
          action={<button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={14} /> Create Note</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((note, i) => (
            <motion.div key={note.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card p-5 hover:shadow-md transition-all group cursor-pointer" onClick={() => setEditingNote(note)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {note.pinned && <Pin size={13} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-primary transition-colors">{note.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit3 size={13} /></button>
                  <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-4 leading-relaxed mb-4">{note.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {note.tags?.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      <Tag size={9} />{tag}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{note.createdAt}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <NoteModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <NoteModal open={!!editingNote} onClose={() => setEditingNote(null)} note={editingNote} />
    </div>
  );
}

function NoteModal({ open, onClose, note }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(note?.tags || []);

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={note ? 'Edit Note' : 'New Note'} size="md">
      <div className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="Note title..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Content</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input-field resize-none" rows={8}
            placeholder="Write your finding, insight, or action item..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 dark:border-slate-600 rounded-xl min-h-[40px]">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {tag}
                <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500">×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              className="flex-1 outline-none bg-transparent text-xs min-w-[80px]" placeholder="Add tag, press Enter" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onClose} className="btn-primary flex-1 justify-center" disabled={!title.trim()}>
            <BookmarkCheck size={15} /> {note ? 'Save Changes' : 'Save Note'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
