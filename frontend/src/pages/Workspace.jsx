import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Mic, RefreshCw, Copy, Bookmark, ThumbsUp, ThumbsDown,
  Share2, FileText, ChevronDown, ChevronRight, Search, ZoomIn, ZoomOut,
  Download, Maximize2, BookmarkPlus, Highlighter, List, AlertTriangle,
  Calendar, Users, Building2, DollarSign, ChevronLeft, Sparkles, X,
  PanelRight, StickyNote, CheckSquare, Clock, Brain, Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Avatar, Badge, RiskBadge, Modal } from '../components/ui';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Decode the user_id from the JWT stored in localStorage (no extra round-trip needed)
function getUserIdFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}


const SUGGESTED_ACTIONS = [
  { label: 'Summarize Document', prompt: 'Provide a comprehensive executive summary of this document.', icon: '📋' },
  { label: 'Extract Key Information', prompt: 'Extract all key information including parties, dates, amounts, and obligations.', icon: '🔑' },
  { label: 'Find Risks', prompt: 'Analyze and list all legal and commercial risks. Rate each as Critical, High, Medium, or Low.', icon: '⚠️' },
  { label: 'Extract Obligations', prompt: 'List all obligations for each party with deadlines and conditions.', icon: '✅' },
  { label: 'Important Dates', prompt: 'Find all important dates including expiration, renewal windows, and notice periods.', icon: '📅' },
  { label: 'Missing Clauses', prompt: 'What standard clauses are missing that could create legal exposure?', icon: '🔍' },
];

export default function Workspace() {
  const { activeDoc, setActiveDoc, activeChat, setActiveChat, activeAgent, setActiveAgent, agents, fetchRecentChats } = useApp();
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: '👋 Hello! I\'m your **Contract Reviewer** AI. Upload or select a document to get started, or ask me anything about your legal documents.', time: 'now' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [rightPanel, setRightPanel] = useState('insights');
  const [agentOpen, setAgentOpen] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const doc = activeDoc;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load historical messages when a chat is selected from the sidebar
  useEffect(() => {
    if (!activeChat) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${BASE_URL}/chats/${activeChat.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || !data.messages || data.messages.length === 0) return;
        const loaded = data.messages.map(m => ({
          id: m.message_id,
          role: m.role,
          content: m.content,
          time: m.received_at,
        }));
        setMessages(loaded);
        if (data.document_id && !activeDoc) {
          setActiveDoc({ id: data.document_id, name: activeChat.title || 'Document', chatId: activeChat.id });
        }
      })
      .catch(() => {});
  }, [activeChat]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content) return;

    const chatId = doc?.chatId || activeChat?.id;
    const documentId = doc?.id || activeDoc?.id;
    const userId = getUserIdFromToken();

    if (!chatId || !documentId) {
      setSendError('No document or chat session found. Please upload or select a document first.');
      return;
    }

    setSendError(null);
    setInput('');
    setSending(true);
    const userMsg = { id: Date.now(), role: 'user', content, time: 'now' };
    setMessages(prev => [...prev, userMsg]);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/retrieve/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          chat_id: chatId,
          user_id: userId,
          document_id: documentId,
          top_k: 5,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to get a response from the AI.');
      }

      const data = await res.json();
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer?.content || '',
        gaps: data.answer?.gaps || null,
        model: data.model_id,
        time: 'now',
      };
      setMessages(prev => [...prev, aiMsg]);
      fetchRecentChats();
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Document Viewer */}
      <div className="w-[55%] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <DocumentViewer doc={doc} />
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Agent selector */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setAgentOpen(!agentOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="text-base">{activeAgent.icon}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{activeAgent.name}</span>
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            <AnimatePresence>
              {agentOpen && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 mt-1 w-64 card shadow-xl py-1 z-30">
                  {agents.map(a => (
                    <button key={a.id} onClick={() => { setActiveAgent(a); setAgentOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <span className="text-xl">{a.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.name}</div>
                        <div className="text-xs text-slate-400">{a.description}</div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 ml-auto text-xs text-slate-400">
            <Brain size={13} />
            <span>claude-sonnet-4-5</span>
          </div>
          {/* Panel switcher */}
          <div className="flex items-center gap-1 ml-2 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            {['insights', 'sources', 'notes'].map(p => (
              <button key={p} onClick={() => setRightPanel(p)}
                className={`px-2 py-1 rounded-md text-xs font-medium capitalize transition-colors ${rightPanel === p ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Suggested actions */}
            {messages.length === 1 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-3">Suggested Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_ACTIONS.slice(0, 4).map(a => (
                    <button key={a.label} onClick={() => sendMessage(a.prompt)}
                      className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-primary/40 hover:bg-primary/5 transition-all text-xs">
                      <span>{a.icon}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} onFollowUp={sendMessage} />
              ))}
              {sending && <TypingIndicator agent={activeAgent} />}
              <div ref={bottomRef} />
            </div>

            {/* Error banner */}
            {sendError && (
              <div className="mx-3 mb-1 p-2 bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertTriangle size={13} className="flex-shrink-0" />
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative flex items-end gap-2 p-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus-within:border-primary/60 transition-colors bg-white dark:bg-slate-800">
                <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex-shrink-0">
                  <Paperclip size={16} />
                </button>
                <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask anything about your documents..." rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none resize-none max-h-32" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <Mic size={16} />
                  </button>
                  <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
                    className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0">
                    <Send size={14} />
                  </button>
                </div>
              </div>
              <div className="text-center mt-1.5">
                <span className="text-[10px] text-slate-400">AI can make mistakes. Verify important information.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function DocumentViewer({ doc }) {
  const [zoom, setZoom] = useState(100);
  const [outlineOpen, setOutlineOpen] = useState(true);

  const outline = [
    { title: 'Preamble', page: 1 }, { title: '1. Definitions', page: 2 }, { title: '2. Services', page: 4 },
    { title: '3. Obligations', page: 8 }, { title: '4. Term & Renewal', page: 12 }, { title: '5. Fees & Payment', page: 15 },
    { title: '6. Confidentiality', page: 18 }, { title: '7. Intellectual Property', page: 21 }, { title: '8. Liability', page: 24 },
    { title: '9. Indemnification', page: 27 }, { title: '10. Termination', page: 30 },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <FileText size={16} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{doc?.name || 'No document selected'}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <Search size={14} />
          </button>
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ZoomOut size={14} />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(150, zoom + 10))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ZoomIn size={14} />
          </button>
          {doc?.viewUrl ? (
            <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <Download size={14} />
            </a>
          ) : (
            <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <Download size={14} />
            </button>
          )}
          <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Outline sidebar */}
        <div className="w-44 border-r border-slate-100 dark:border-slate-800 flex-shrink-0 overflow-y-auto p-3">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Document Outline</div>
          {outline.map(item => (
            <button key={item.title} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-between group">
              <span className="truncate">{item.title}</span>
              <span className="text-[10px] text-slate-400 group-hover:text-primary">{item.page}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
          {doc?.viewUrl ? (
            /* Real document via presigned URL */
            <iframe
              key={doc.viewUrl}
              src={doc.viewUrl}
              title={doc.name}
              className="w-full h-full border-0"
            />
          ) : (
            /* Original mock content */
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8"
                style={{ fontSize: `${zoom}%` }}>
                <div className="text-center mb-8">
                  <h1 className="text-xl font-bold mb-2">MASTER SERVICE AGREEMENT</h1>
                  <p className="text-sm text-slate-600">Between Acme Corporation and TechCorp Inc.</p>
                  <p className="text-xs text-slate-400 mt-1">Effective Date: January 1, 2025</p>
                </div>
                {[
                  { title: 'RECITALS', content: 'WHEREAS, Acme Corporation ("Client") desires to obtain certain technology services from TechCorp Inc. ("Service Provider"); and WHEREAS, Service Provider desires to provide such services to Client on the terms and conditions set forth herein.' },
                  { title: '1. DEFINITIONS', content: '"Agreement" means this Master Service Agreement and all exhibits, schedules, and addenda attached hereto. "Confidential Information" means any information disclosed by either party that is marked as confidential or that reasonably should be considered confidential given the nature of the information and circumstances of disclosure.' },
                  { title: '2. SERVICES', content: 'Service Provider shall provide the SaaS platform services ("Services") as described in the applicable Statement of Work ("SOW"). Service Provider reserves the right to modify the Services provided that such modifications do not materially affect the functionality available to Client.' },
                  { title: '3. OBLIGATIONS', content: 'Client shall: (a) provide Service Provider with access to Client systems as reasonably necessary; (b) designate a technical contact; (c) pay all fees as set forth in Section 5. Service Provider shall: (a) provide the Services with reasonable skill and care; (b) maintain appropriate security measures.' },
                  { title: '8. LIMITATION OF LIABILITY', content: "IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES. NOTWITHSTANDING THE FOREGOING, IN NO EVENT SHALL SERVICE PROVIDER'S AGGREGATE LIABILITY EXCEED THE AMOUNTS PAID IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.", highlight: true },
                ].map(section => (
                  <div key={section.title} className={`mb-6 ${section.highlight ? 'border-l-4 border-red-400 pl-4 bg-red-50 dark:bg-red-900/10 py-3 rounded-r-lg' : ''}`}>
                    <h2 className="font-bold text-sm mb-2">{section.title}</h2>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{section.content}</p>
                    {section.highlight && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-red-500" />
                        <span className="text-xs text-red-600 font-medium">AI flagged: Liability cap may be insufficient</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Doc info footer */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 text-xs text-slate-400">
        <span>{doc?.pages} pages</span>
        <span>·</span>
        <span>{doc?.size}</span>
        <span>·</span>
        <span>~18 min read</span>
        <div className="ml-auto flex items-center gap-2">
          {doc?.risk && <RiskBadge level={doc.risk} />}
          <Badge variant="success">Analyzed</Badge>
        </div>
      </div>
    </div>
  );
}


function MessageBubble({ message, onFollowUp }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'max-w-[75%]' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-primary text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-tl-sm'}`}>
          <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
        </div>

        {/* Sources */}
        {message.sources && (
          <div className="mt-2 space-y-1">
            {message.sources.map((s, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-primary/40 transition-colors">
                <FileText size={11} className="text-primary flex-shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">p.{s.page} · {s.section}</span>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-1 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${s.confidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400">{Math.round(s.confidence * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1.5">
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <Copy size={13} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <Bookmark size={13} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-green-500 transition-colors">
              <ThumbsUp size={13} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
              <ThumbsDown size={13} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw size={13} />
            </button>
            {copied && <span className="text-xs text-emerald-500">Copied!</span>}
          </div>
        )}

        {/* Follow-up suggestions */}
        {message.followUps && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.followUps.map((q, i) => (
              <button key={i} onClick={() => onFollowUp(q)}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/40 hover:text-primary bg-white dark:bg-slate-800 transition-colors">
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator({ agent }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full"
              animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Simple markdown renderer
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/## (.*?)(\n|$)/g, '<h2 class="text-base font-bold mt-4 mb-2">$1</h2>')
    .replace(/### (.*?)(\n|$)/g, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/\| (.*?) \|/g, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td class="px-2 py-1 border border-slate-200 dark:border-slate-600 text-xs">${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>)/gs, '<table class="w-full border-collapse my-3 text-xs">$1</table>')
    .replace(/\n/g, '<br/>');
}
