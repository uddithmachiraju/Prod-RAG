import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, Filter, FileText, MoreHorizontal, Eye, MessageSquare, Trash2, Download, X, CheckCircle, Clock, AlertTriangle, Plus, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, RiskBadge, EmptyState, Modal, Spinner } from '../components/ui';

export default function Documents() {
  const { documents, setActiveDoc } = useApp();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [initialFiles, setInitialFiles] = useState([]);
  const pageInputRef = useRef(null);
  const navigate = useNavigate();

  const handlePageClick = () => {
    pageInputRef.current?.click();
  };

  const handlePageDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const arr = Array.from(e.dataTransfer.files).map(f => ({ file: f, id: crypto.randomUUID() }));
      setInitialFiles(arr);
      setUploadOpen(true);
    }
  };

  const handlePageInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const arr = Array.from(e.target.files).map(f => ({ file: f, id: crypto.randomUUID() }));
      setInitialFiles(arr);
      setUploadOpen(true);
      e.target.value = '';
    }
  };

  const filtered = documents.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType !== 'all' && d.type !== selectedType) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">{documents.length} total · {documents.filter(d => d.status === 'analyzed').length} analyzed</p>
        </div>
        <button onClick={handlePageClick} className="btn-primary">
          <Upload size={16} /> Upload Documents
        </button>
      </div>

      {/* Upload drop zone */}
      <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={handlePageDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-6 transition-all cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
        onClick={handlePageClick}>
        <Upload size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Drop files here or <span className="text-primary">browse</span></p>
        <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT up to 50MB</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          {['all', 'PDF', 'DOCX', 'TXT'].map(t => (
            <button key={t} onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedType === t ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <EmptyState icon="📄" title="No documents found" description="Upload documents to start analyzing them with AI."
          action={<button onClick={handlePageClick} className="btn-primary"><Upload size={14} /> Upload Document</button>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden lg:table-cell">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 hidden xl:table-cell">Risk</th>
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map((doc, i) => (
                <motion.tr key={doc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <td className="px-4 py-3" onClick={() => { setActiveDoc(doc); navigate('/workspace'); }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{doc.type}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs group-hover:text-primary transition-colors">{doc.name}</div>
                        {doc.summary && <div className="text-xs text-slate-400 truncate max-w-xs">{doc.summary.slice(0, 70)}...</div>}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {doc.tags?.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-md">
                              <Tag size={9} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="default">{doc.type}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="text-xs text-slate-500">{doc.uploadedAt}</div>
                    <div className="text-xs text-slate-400">{doc.pages} pages · {doc.size}</div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.status === 'analyzed' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                        <CheckCircle size={11} /> Analyzed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                        <Clock size={11} /> Processing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {doc.risk ? <RiskBadge level={doc.risk} /> : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setActiveDoc(doc); navigate('/workspace'); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <MessageSquare size={14} />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadModal open={uploadOpen} onClose={() => { setUploadOpen(false); setInitialFiles([]); }}
        setActiveDoc={setActiveDoc} navigate={navigate} initialFiles={initialFiles} />
      <input ref={pageInputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.txt"
        onChange={handlePageInputChange} />
    </div>
  );
}

function UploadModal({ open, onClose, setActiveDoc, navigate, initialFiles = [] }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState({});
  const inputRef = useRef(null);

  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    if (open) {
      if (initialFiles.length > 0) {
        setFiles(initialFiles);
      }
    } else {
      setFiles([]);
      setProgress({});
      setErrors({});
      setDone({});
    }
  }, [open, initialFiles]);

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles).map(f => ({ file: f, id: crypto.randomUUID() }));
    setFiles(prev => [...prev, ...arr]);
  };

  const uploadFile = async (entry) => {
    const { file, id } = entry;
    const token = localStorage.getItem('token');
    const documentId = crypto.randomUUID();

    const setP = (val) => setProgress(prev => ({ ...prev, [id]: val }));
    const setErr = (msg) => setErrors(prev => ({ ...prev, [id]: msg }));
    const setOk = () => setDone(prev => ({ ...prev, [id]: true }));

    try {
      // Step 1: Get presigned upload URL
      setP(10);
      const urlRes = await fetch(`${BASE_URL}/documents/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          content_type: file.type || 'application/octet-stream',
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to get upload URL.');
      }

      const { url: presignedUrl, file_key: fileKey } = await urlRes.json();
      setP(30);

      // Step 2: Upload file directly to S3 via presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to storage.');
      setP(70);

      // Step 3: Confirm upload and create chat session
      const conformRes = await fetch(`${BASE_URL}/documents/conform-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          file_key: fileKey,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
        }),
      });

      if (!conformRes.ok) {
        const err = await conformRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to confirm upload.');
      }

      setP(100);
      setOk();

      // Extract the chat_id returned by conform-upload
      const conformData = await conformRes.json();
      const chatId = conformData.chat_id;

      // Fetch the presigned view URL and open the document in the workspace
      try {
        const viewRes = await fetch(`${BASE_URL}/documents/view-url/${encodeURIComponent(fileKey)}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (viewRes.ok) {
          const { url: viewUrl } = await viewRes.json();
          setActiveDoc({
            id: documentId,
            name: file.name,
            fileKey,
            viewUrl,
            chatId,
            type: file.name.split('.').pop().toUpperCase(),
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          });
        }
      } catch { /* silently skip if view URL fails */ }
    } catch (err) {
      setErr(err.message);
      setP(0);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    setErrors({});
    setDone({});
    await Promise.all(files.map(uploadFile));
    setUploading(false);
    // Navigate to workspace to show the uploaded document
    setTimeout(() => { onClose(); navigate('/workspace'); }, 800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Documents" size="md">
      <div className="p-6 space-y-4">
        {files.length === 0 ? (
          <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Upload size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Click or drag files here</p>
            <p className="text-xs text-slate-400 mt-1">PDF, DOCX, TXT · Up to 50MB each</p>
            <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.txt"
              onChange={e => handleFiles(e.target.files)} />
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{f.file.name}</div>
                    <div className="text-[10px] text-slate-400">{(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                    {errors[f.id] && (
                      <div className="text-[10px] text-red-500 mt-0.5">{errors[f.id]}</div>
                    )}
                    {progress[f.id] > 0 && !errors[f.id] && (
                      <div className="mt-1 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress[f.id]}%` }} />
                      </div>
                    )}
                  </div>
                  {!uploading && !done[f.id] && (
                    <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400">
                      <X size={13} />
                    </button>
                  )}
                  {done[f.id] && <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />}
                  {errors[f.id] && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                </div>
              ))}
            </div>

            {!uploading && (
              <div onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                className="border border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Plus size={16} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Drag or click to add more files</span>
                <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.txt"
                  onChange={e => handleFiles(e.target.files)} />
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={uploading}>Cancel</button>
          <button onClick={handleUpload} className="btn-primary flex-1 justify-center" disabled={files.length === 0 || uploading}>
            {uploading ? <><Spinner size="sm" /> Uploading...</> : `Upload ${files.length > 0 ? files.length + ' file' + (files.length > 1 ? 's' : '') : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
