import { useEffect, useRef, useState } from 'react';
import { requestWithRefresh } from '../utils/auth';
import HomeUI from './HomeUI';
import PDFViewer from './PDFViewer';

// Custom lightweight markdown renderer for clean, conversational AI lists and blocks
const renderMessageContent = (text) => {
  if (!text) return null;

  // Split content by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeLines = part.slice(3, -3).trim().split('\n');
      let language = '';
      if (codeLines[0] && !codeLines[0].includes(' ') && codeLines[0].length < 15) {
        language = codeLines.shift();
      }
      const codeContent = codeLines.join('\n');
      return (
        <div key={index} className="markdown-code-block" style={{ margin: '0.8rem 0', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {language && (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {language}
            </div>
          )}
          <pre style={{ margin: 0, padding: '0.8rem 1rem', overflowX: 'auto', fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.82rem', color: '#f8fafc', lineHeight: 1.5 }}>
            <code>{codeContent}</code>
          </pre>
        </div>
      );
    }

    const lines = part.split('\n');
    let inList = false;
    let listItems = [];
    const elements = [];

    const flushList = (key) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} style={{ margin: '0.5rem 0 0.5rem 1.2rem', paddingLeft: 0, listStyleType: 'disc' }}>
            {listItems.map((item, i) => (
              <li key={i} style={{ marginBottom: '0.3rem', lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();

      const parseInline = (str) => {
        const boldParts = str.split(/(\*\*.*?\*\*)/g);
        return boldParts.map((bp, bIdx) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={bIdx} style={{ fontWeight: 600 }}>{bp.slice(2, -2)}</strong>;
          }
          return bp;
        });
      };

      if (trimmed.startsWith('### ')) {
        flushList(lineIdx);
        elements.push(<h4 key={lineIdx} style={{ fontSize: '14px', fontWeight: 600, margin: '0.8rem 0 0.3rem 0', color: '#1e293b' }}>{parseInline(trimmed.substring(4))}</h4>);
      } else if (trimmed.startsWith('## ')) {
        flushList(lineIdx);
        elements.push(<h3 key={lineIdx} style={{ fontSize: '15px', fontWeight: 600, margin: '1rem 0 0.4rem 0', color: '#1e293b' }}>{parseInline(trimmed.substring(3))}</h3>);
      } else if (trimmed.startsWith('# ')) {
        flushList(lineIdx);
        elements.push(<h2 key={lineIdx} style={{ fontSize: '16px', fontWeight: 600, margin: '1.2rem 0 0.4rem 0', color: '#1e293b' }}>{parseInline(trimmed.substring(2))}</h2>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        inList = true;
        listItems.push(parseInline(trimmed.substring(2)));
      } else if (trimmed === '') {
        flushList(lineIdx);
        elements.push(<div key={`spacer-${lineIdx}`} style={{ height: '0.3rem' }}></div>);
      } else {
        flushList(lineIdx);
        elements.push(
          <p key={lineIdx} style={{ margin: '0.3rem 0 0.5rem 0', lineHeight: 1.6 }}>
            {parseInline(line)}
          </p>
        );
      }
    });

    flushList(lines.length);
    return <div key={index}>{elements}</div>;
  });
};


const Chat = ({ onLogout, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [documents, setDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('chat_active_tab') || 'home');
  const [selectedDoc, setSelectedDoc] = useState(JSON.parse(localStorage.getItem('chat_selected_doc')));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const profileMenuRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchAllData();
      if (activeTab === 'document' && selectedDoc && !pdfUrl) {
        handleSelectDoc(selectedDoc);
      }
    };
    init();
  }, []); // Only on mount

  useEffect(() => {
    localStorage.setItem('chat_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('chat_selected_doc', JSON.stringify(selectedDoc));
  }, [selectedDoc]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      shouldAutoScrollRef.current = distanceFromBottom <= 120;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !shouldAutoScrollRef.current) return;

    const scrollToBottom = () => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    };

    const frame = window.requestAnimationFrame(scrollToBottom);
    return () => window.cancelAnimationFrame(frame);
  }, [messages, isLoading]);

  const fetchAllData = async () => {
    try {
      const [docsRes, chatsRes, recentRes] = await Promise.all([
        requestWithRefresh('http://localhost:80/documents/', { headers: { 'Content-Type': 'application/json' } }, { onAuthFailure: onLogout }),
        requestWithRefresh('http://localhost:80/chats/chats', { headers: { 'Content-Type': 'application/json' } }, { onAuthFailure: onLogout }),
        requestWithRefresh('http://localhost:80/chats/recent-chats', { headers: { 'Content-Type': 'application/json' } }, { onAuthFailure: onLogout })
      ]);
      
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (chatsRes.ok) setChatHistory(await chatsRes.json());
      if (recentRes.ok) setRecentChats(await recentRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = async (e, overrideText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSend = overrideText !== null ? overrideText : input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      let userId = '';
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.sub || '';
        } catch (err) {
          console.error('Failed to parse JWT token', err);
        }
      }

      const chatId = selectedDoc?.chat_id;
      if (!chatId) {
        throw new Error('No chat session is associated with the selected document. Please upload a document first.');
      }

      // Use the streaming retrieval endpoint so we can render partial results as they arrive
      const aiId = Date.now() + 1;
      setMessages(prev => [...prev, { id: aiId, text: '', sender: 'ai' }]);

      const streamResponse = await requestWithRefresh('http://localhost:80/retrieve/query/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: textToSend,
          chat_id: chatId,
          user_id: userId,
          document_id: selectedDoc?.document_id || selectedDoc?.id || '',
          top_k: 5
        })
      }, { onAuthFailure: onLogout });

      if (!streamResponse.ok) {
        let errText = 'Failed to fetch chatbot response';
        try {
          const errJson = await streamResponse.json();
          errText = errJson.message || errJson.error || errText;
        } catch (e) {}
        throw new Error(errText);
      }

      // Read streaming body and update the last AI message incrementally
      const reader = streamResponse.body?.getReader();
      if (!reader) throw new Error('Streaming not supported by this browser or response has no body');

      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      try {
        while (!done) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;

          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          buffer += chunk;

          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const lines = rawEvent.split(/\r?\n/);
            let eventType = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.slice(5).trim();
              }
            }

            if (eventType === 'done') {
              done = true;
              break;
            }

            if (dataStr) {
              try {
                const parsedData = JSON.parse(dataStr);
                if (eventType === 'token') {
                  const delta = parsedData.content;
                  if (delta) {
                    setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: (m.text || '') + delta } : m));
                  }
                } else if (eventType === 'error') {
                  const errMsg = parsedData.message || 'An error occurred during streaming.';
                  setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: errMsg, isError: true } : m));
                  done = true;
                  break;
                }
              } catch (e) {
                console.error('Failed to parse SSE data JSON:', e, 'dataStr:', dataStr);
              }
            }
          }
        }
      } catch (streamErr) {
        console.error('Error reading stream:', streamErr);
        throw streamErr;
      }
    } catch (err) {
      console.error('Error querying retrieval API:', err);
      setMessages(prev => prev.map(m => m.id === aiId ? {
        ...m,
        text: `Error: ${err.message || 'Unable to connect to retrieval API. Please ensure the backend is running.'}`,
        isError: true
      } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (eOrFile, initialMessage = '') => {
    const file = eOrFile.target ? eOrFile.target.files[0] : eOrFile;
    if (!file) return;

    setIsUploading(true);
    const documentId = crypto.randomUUID();

    try {
      // 1. Get presigned URL
      const urlResponse = await requestWithRefresh('http://localhost:80/documents/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          content_type: file.type
        }),
      }, { onAuthFailure: onLogout });

      if (!urlResponse.ok) throw new Error('Failed to get upload URL');
      const { url, file_key } = await urlResponse.json();

      // 2. Upload directly to S3 (or mock storage)
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('S3 Upload failed');

      // 3. Confirm upload with metadata
      const confirmResponse = await requestWithRefresh('http://localhost:80/documents/conform-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          file_key: file_key,
          file_type: file.type,
          file_size: file.size
        }),
      }, { onAuthFailure: onLogout });

      if (!confirmResponse.ok) {
        const errorDetail = await confirmResponse.json();
        console.error('Conform upload error:', errorDetail);
        throw new Error(`Upload confirmation failed: ${JSON.stringify(errorDetail)}`);
      }

      const { chat_id } = await confirmResponse.json();
      const newDoc = { name: file.name, id: documentId, file_key: file_key, chat_id };
      setDocuments([...documents, newDoc]);
      setChatHistory([{ title: file.name, document_id: documentId, chat_id, created_at: new Date().toISOString() }, ...chatHistory]);
      setRecentChats([{ title: file.name, document_id: documentId, chat_id, created_at: new Date().toISOString() }, ...recentChats]);
      setSelectedDoc({ title: file.name, document_id: documentId, chat_id });
      setPdfUrl(URL.createObjectURL(file) + '#toolbar=0');
      setActiveTab('chat');

      const messagesToAdd = [];

      if (initialMessage && initialMessage.trim()) {
        messagesToAdd.push({ id: Date.now() + 1, text: initialMessage.trim(), sender: 'user' });
        setMessages(prev => [...prev, ...messagesToAdd]);
        handleSendMessage(null, initialMessage.trim());
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectDoc = async (chat) => {
    setSelectedDoc(chat);
    setActiveTab('chat');
    setPdfUrl(null); // Clear previous
    setMessages([]); // Clear previous messages

    try {
      const chatId = chat.chat_id || chat.id;
      if (chatId) {
        const chatRes = await requestWithRefresh(`http://localhost:80/chats/${chatId}`, {
          headers: { 'Content-Type': 'application/json' }
        }, { onAuthFailure: onLogout });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          if (chatData && chatData.messages) {
            const formattedMessages = chatData.messages.map(m => ({
              id: m.message_id,
              text: m.content,
              sender: m.role === 'user' ? 'user' : 'ai',
            }));
            setMessages(formattedMessages);
          }
        }
      }

      const documentId = chat.document_id || chat.id;
      const doc = documents.find(d => d._id === documentId || d.id === documentId);
      
      if (doc && doc.file_key) {
        const response = await requestWithRefresh(`http://localhost:80/documents/view-url/${encodeURIComponent(doc.file_key)}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        }, { onAuthFailure: onLogout });
        if (response.ok) {
          const data = await response.json();
          setPdfUrl(data.url + '#toolbar=0');
        }
      } else {
        console.warn("Could not find document file_key for chat", chat);
      }
    } catch (err) {
      console.error('Error fetching view URL:', err);
    }
  };

  const handleGoHome = () => {
    setActiveTab('home');
    setSelectedDoc(null);
    setPdfUrl(null);
  };

  return (
    <div className="new-home-layout">
      <div className="new-home-container">

        {/* Modern Sidebar */}
        <aside className="new-home-sidebar">
          {/* Hidden global file input for sidebar upload button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".pdf"
          />
          <div className="sidebar-top">
            <div className="sidebar-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <circle cx="12" cy="5" r="3" fill="currentColor" />
                <circle cx="12" cy="19" r="3" fill="currentColor" />
                <circle cx="5" cy="12" r="3" fill="currentColor" />
                <circle cx="19" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>

            <button
              className={`sidebar-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={handleGoHome}
              title="Home"
              style={activeTab === 'home' ? { color: '#111', background: '#eaeaea' } : {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </button>

            <button
              className={`sidebar-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              title="Chat History"
              style={activeTab === 'history' ? { color: '#111', background: '#eaeaea' } : {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </button>

            <button className="sidebar-btn sidebar-btn-add" onClick={() => fileInputRef.current?.click()} title="Upload Document" style={{ marginTop: '1rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <div className="sidebar-bottom">
            <button className="sidebar-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <div 
                className="sidebar-avatar" 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                title="Profile" 
                style={{ cursor: 'pointer' }}
              >
                {user?.full_name ? user.full_name.substring(0, 2).toUpperCase() : (user?.username || 'U').substring(0, 2).toUpperCase()}
              </div>

              {isProfileMenuOpen && (
                <div className="profile-popup" style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '48px',
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  width: '220px',
                  border: '1px solid #eaeaea',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #eaeaea', background: '#fafafa' }}>
                    <div style={{ fontWeight: 600, color: '#111', fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.full_name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.username || 'user@example.com'}
                    </div>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <button 
                      onClick={onLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        border: 'none',
                        background: 'transparent',
                        color: '#dc2626',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Dynamic Main Content */}
        {activeTab === 'home' ? (
          <HomeUI onLogout={onLogout} user={user} onUpload={handleFileUpload} documents={recentChats} onSelectDoc={handleSelectDoc} />
        ) : activeTab === 'history' ? (
          <div style={{ flex: 1, padding: '3rem', background: '#f4f4f5', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111', margin: 0 }}>Chat History</h2>
                <div style={{ position: 'relative', width: '300px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search chats..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '20px', border: '1px solid #eaeaea', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              
              {(() => {
                const filteredDocs = chatHistory.filter(doc => (doc.title || doc.name || doc.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
                
                if (chatHistory.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '16px', border: '1px dashed #ddd' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <h3 style={{ fontSize: '1.2rem', color: '#333', marginBottom: '0.5rem' }}>No chats found</h3>
                      <p style={{ color: '#888', marginBottom: '1.5rem' }}>You haven't started any document analysis sessions yet.</p>
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        style={{ background: '#5d3f94', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Upload a Document
                      </button>
                    </div>
                  );
                }
                
                if (filteredDocs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                      <p>No chats match your search for "{searchQuery}".</p>
                    </div>
                  );
                }
                
                return (
                  <div className="premium-chats-list">
                    {filteredDocs.map((doc, index) => (
                      <div key={doc.chat_id || doc.id || index} className="premium-chat-item" onClick={() => handleSelectDoc(doc)}>
                        <div className="list-icon-wrapper">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div className="list-content">
                          <h4 className="list-title">{doc.title || doc.name || doc.file_name || 'Unnamed Document'}</h4>
                          <p className="list-meta">Previous session</p>
                        </div>
                        <div className="list-arrow">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#ffffff' }}>

            {/* Left side: PDF Viewer */}
            <div className="doc-page" style={{ flex: 1, height: '100%', margin: 0, padding: 0, border: 'none', borderRadius: 0, boxShadow: 'none', background: '#ffffff' }}>
              {pdfUrl ? (
                <PDFViewer url={pdfUrl} />
              ) : (
                <div style={{ padding: '2rem' }}>
                  <h1 className="doc-title-placeholder">{selectedDoc?.name || 'Untitled Document'}</h1>
                  <div className="doc-content-placeholder">
                    <div className="doc-skeleton-line"></div>
                    <div className="doc-skeleton-line medium"></div>
                    <div className="doc-skeleton-line"></div>
                    <div className="doc-skeleton-line short"></div>
                    <div style={{ textAlign: 'center', padding: '4rem 0', color: '#aaa' }}>
                      <p>Loading document preview...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Plugin Sidebar (Chatbot) */}
            <aside className="plugin-sidebar" style={{ margin: '0', height: '100%', borderRight: 'none', borderRadius: '0' }}>
              <div className="plugin-header" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="plugin-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111' }}>Project Analysis</span>
                    <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 400 }}>Active session</span>
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              </div>

              <div className="plugin-chat-container" style={{ background: 'transparent' }}>
                <div className="plugin-chat-messages" ref={messagesContainerRef}>
                  {messages.length === 0 ? (
                    <div className="premium-empty-container">
                      <div className="glowing-orb"></div>
                      <div className="premium-empty-logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M9 10a3 3 0 0 1 6 0c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <h3 className="premium-empty-title">Project Assistant</h3>
                      <p className="premium-empty-subtitle">
                        Ask questions, extract facts, or uncover hidden insights in <strong>{selectedDoc?.name || selectedDoc?.file_name || 'this document'}</strong>.
                      </p>
                      
                      <div className="premium-templates-grid">
                        <div 
                          className="premium-template-card"
                          onClick={() => handleSendMessage({ preventDefault: () => {} }, "Summarize this document in 3 bullet points")}
                        >
                          <div className="premium-template-header">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="premium-template-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            <h4 className="premium-template-title">Summarize Chunks</h4>
                          </div>
                          <p className="premium-template-desc">Extract the most important takeaways from this document.</p>
                        </div>

                        <div 
                          className="premium-template-card"
                          onClick={() => handleSendMessage({ preventDefault: () => {} }, "What are the key conclusions or takeaways?")}
                        >
                          <div className="premium-template-header">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="premium-template-icon"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <h4 className="premium-template-title">Extract Key Insights</h4>
                          </div>
                          <p className="premium-template-desc">Synthesize conclusions and potential recommendations.</p>
                        </div>

                        <div 
                          className="premium-template-card"
                          onClick={() => handleSendMessage({ preventDefault: () => {} }, "Explain the methodology used here")}
                        >
                          <div className="premium-template-header">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="premium-template-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <h4 className="premium-template-title">Analyze Methodology</h4>
                          </div>
                          <p className="premium-template-desc">Evaluate research structure, processes, and frameworks.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map(msg => (
                        <div key={msg.id} className={`plugin-message-row ${msg.sender}`}>
                          
                          <div className={`plugin-message ${msg.sender}`} style={msg.isError ? { maxWidth: '85%' } : {}}>
                            <div className="plugin-bubble" style={msg.isError ? { background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: '16px 16px 16px 4px' } : {}}>
                              {msg.fileAttachment && (
                                <div className="attachment-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : '0' }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 500, wordBreak: 'break-all' }}>{msg.fileAttachment.name}</span>
                                </div>
                              )}
                              {msg.isError ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                  </svg>
                                  <span>{msg.text}</span>
                                </div>
                              ) : (
                                msg.text && <div className="markdown-body">{renderMessageContent(msg.text)}</div>
                              )}
                              
                              {/* Render identified gaps for AI responses */}
                              {msg.sender === 'ai' && msg.gaps && (
                                <div className="retrieval-gaps-callout">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                  </svg>
                                  <div>
                                    <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.15rem' }}>Identified Knowledge Gaps</span>
                                    {msg.gaps}
                                  </div>
                                </div>
                              )}

                              {/* Render generation metadata for AI responses */}
                              {msg.sender === 'ai' && msg.modelId && (
                                <div className="msg-meta">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="3" x2="9" y2="21"></line>
                                  </svg>
                                  <span>{msg.modelId}</span>
                                  {msg.inputTokens !== undefined && msg.outputTokens !== undefined && (
                                    <>
                                      <span>•</span>
                                      <span>⚡ {(msg.inputTokens || 0) + (msg.outputTokens || 0)} tokens</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Premium Typing Indicator Row */}
                      {isLoading && (
                        <div className="plugin-message-row ai">
                          <div className="plugin-message ai">
                            <div className="typing-bubble">
                              <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                              <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                              <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="plugin-input-area">
                  <form className="plugin-input-wrapper" onSubmit={handleSendMessage} style={{ width: '100%', margin: '0' }}>
                    <div className="plugin-input-pill">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer', marginBottom: '6px' }} onClick={() => fileInputRef.current?.click()}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                      <textarea
                        ref={textareaRef}
                        placeholder="Ask workspace assistant..."
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          // Auto-expanding textarea height
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        rows={1}
                      />
                      <button type="submit" className="plugin-send-btn" disabled={!input.trim() || isLoading} style={{ marginBottom: '2px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
