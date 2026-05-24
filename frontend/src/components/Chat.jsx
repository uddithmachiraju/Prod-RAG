import { useEffect, useRef, useState } from 'react';
import HomeUI from './HomeUI';
import PDFViewer from './PDFViewer';

const Chat = ({ onLogout, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(localStorage.getItem('chat_active_tab') || 'home');
  const [selectedDoc, setSelectedDoc] = useState(JSON.parse(localStorage.getItem('chat_selected_doc')));
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      await fetchDocuments();
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

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/documents/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = (e, overrideText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSend = overrideText !== null ? overrideText : input;
    if (!textToSend.trim()) return;

    const userMessage = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages([...messages, userMessage]);
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        text: "I've analyzed the context of your document. What else would you like to explore?",
        sender: 'ai'
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleFileUpload = async (eOrFile, initialMessage = '') => {
    const file = eOrFile.target ? eOrFile.target.files[0] : eOrFile;
    if (!file) return;

    setIsUploading(true);
    const documentId = crypto.randomUUID();

    try {
      // 1. Get presigned URL
      const urlResponse = await fetch('http://localhost:8000/documents/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          content_type: file.type
        }),
      });

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
      const confirmResponse = await fetch('http://localhost:8000/documents/conform-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_id: documentId,
          file_name: file.name,
          file_key: file_key,
          file_type: file.type,
          file_size: file.size
        }),
      });

      if (!confirmResponse.ok) {
        const errorDetail = await confirmResponse.json();
        console.error('Conform upload error:', errorDetail);
        throw new Error(`Upload confirmation failed: ${JSON.stringify(errorDetail)}`);
      }

      const newDoc = { name: file.name, id: documentId, file_key: file_key };
      setDocuments([...documents, newDoc]);
      setSelectedDoc(newDoc);
      setPdfUrl(URL.createObjectURL(file) + '#toolbar=0');
      setActiveTab('chat');

      const fileMsg = {
        id: Date.now(),
        sender: 'user',
        fileAttachment: { name: file.name }
      };

      const messagesToAdd = [fileMsg];

      if (initialMessage && initialMessage.trim()) {
        messagesToAdd.push({ id: Date.now() + 1, text: initialMessage.trim(), sender: 'user' });
      }

      const systemMessage = {
        id: Date.now() + 2,
        text: `Successfully uploaded ${file.name}. I'm ready to answer your questions.`,
        sender: 'ai'
      };

      messagesToAdd.push(systemMessage);

      setMessages(prev => [...prev, ...messagesToAdd]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectDoc = async (doc) => {
    setSelectedDoc(doc);
    setActiveTab('chat');
    setPdfUrl(null); // Clear previous

    try {
      const response = await fetch(`http://localhost:8000/documents/view-url/${encodeURIComponent(doc.file_key)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPdfUrl(data.url + '#toolbar=0');
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
            <div className="sidebar-avatar" onClick={onLogout} title="Log Out" style={{ cursor: 'pointer' }}>
              <img src="https://i.pravatar.cc/150?img=11" alt="User Avatar" />
            </div>
          </div>
        </aside>

        {/* Dynamic Main Content */}
        {activeTab === 'home' ? (
          <HomeUI onLogout={onLogout} user={user} onUpload={handleFileUpload} documents={documents} onSelectDoc={handleSelectDoc} />
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
                const filteredDocs = documents.filter(doc => (doc.name || doc.file_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
                
                if (documents.length === 0) {
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
                      <div key={doc.id || index} className="premium-chat-item" onClick={() => handleSelectDoc(doc)}>
                        <div className="list-icon-wrapper">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div className="list-content">
                          <h4 className="list-title">{doc.name || doc.file_name || 'Unnamed Document'}</h4>
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
            <aside className="plugin-sidebar" style={{ width: '450px', margin: '0', height: '100%', borderRight: 'none', borderRadius: '0' }}>
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
                <div className="plugin-chat-messages">
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#999', marginTop: '4rem', padding: '1rem' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(93, 63, 148, 0.2)' }}>
                         <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', color: '#111', marginBottom: '0.5rem', fontWeight: 600 }}>Ready to analyze</h3>
                      <p style={{ fontSize: '0.95rem', marginBottom: '2.5rem', color: '#666' }}>Ask any question about <strong>{selectedDoc?.name || selectedDoc?.file_name || 'this document'}</strong> to get started.</p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
                        <div onClick={() => handleSendMessage({ preventDefault: () => {} }, "Summarize this document in 3 bullet points")} style={{ padding: '1rem', background: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#555', border: '1px solid #eaeaea', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#a8c0ff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eaeaea'}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#222', marginBottom: '0.3rem' }}>Summarize</span>
                          What are the main points?
                        </div>
                        <div onClick={() => handleSendMessage({ preventDefault: () => {} }, "What are the key conclusions or takeaways?")} style={{ padding: '1rem', background: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#555', border: '1px solid #eaeaea', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#a8c0ff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eaeaea'}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#222', marginBottom: '0.3rem' }}>Extract insights</span>
                          Key conclusions?
                        </div>
                        <div onClick={() => handleSendMessage({ preventDefault: () => {} }, "Explain the methodology used here")} style={{ padding: '1rem', background: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#555', border: '1px solid #eaeaea', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#a8c0ff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eaeaea'}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#222', marginBottom: '0.3rem' }}>Analyze approach</span>
                          Explain methodology
                        </div>
                        <div onClick={() => handleSendMessage({ preventDefault: () => {} }, "Are there any action items mentioned?")} style={{ padding: '1rem', background: '#fff', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', color: '#555', border: '1px solid #eaeaea', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#a8c0ff'} onMouseLeave={e => e.currentTarget.style.borderColor = '#eaeaea'}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#222', marginBottom: '0.3rem' }}>Find action items</span>
                          What's next?
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`plugin-message ${msg.sender}`}>
                        <div className="plugin-bubble">
                          {msg.fileAttachment && (
                            <div className="attachment-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : '0' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, wordBreak: 'break-all' }}>{msg.fileAttachment.name}</span>
                            </div>
                          )}
                          {msg.text && <div>{msg.text}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="plugin-input-area">
                  <form className="plugin-input-wrapper" onSubmit={handleSendMessage} style={{ width: '100%' }}>
                    <div className="plugin-input-pill">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                      </svg>
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                      />
                      <button type="submit" className="plugin-send-btn" disabled={!input.trim()}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
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
