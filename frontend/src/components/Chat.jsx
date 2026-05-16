import React, { useState, useRef, useEffect } from 'react';

const Chat = () => {
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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, sender: 'user' };
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
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
      setActiveTab('document');
      
      const systemMessage = { 
        id: Date.now(), 
        text: `Successfully uploaded ${file.name}. I'm ready to answer your questions.`, 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (err) {
      console.error(err);
      alert('Failed to upload document: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectDoc = async (doc) => {
    setSelectedDoc(doc);
    setActiveTab('document');
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
    <div className="word-layout-container">
      <div className="word-content-area">
        {/* Navigation Sidebar (Left) */}
        <aside 
          className="nav-sidebar" 
          style={{ 
            width: isNavCollapsed ? '64px' : '240px', 
            padding: isNavCollapsed ? '1.5rem 0' : '2rem 1.5rem',
            transition: 'all 0.3s ease',
            alignItems: isNavCollapsed ? 'center' : 'stretch'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            width: '100%',
            marginBottom: '1rem' 
          }}>
            <button 
              onClick={() => setIsNavCollapsed(!isNavCollapsed)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '0.5rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>

          <div style={{ marginTop: '2rem', width: '100%' }}>
            <div style={{ visibility: isNavCollapsed ? 'hidden' : 'visible', opacity: isNavCollapsed ? 0 : 1, transition: 'opacity 0.2s', height: isNavCollapsed ? 0 : 'auto' }}>
              <div className="nav-section-title">Workspace</div>
            </div>
            <div 
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} 
              onClick={handleGoHome} 
              title="Home"
              style={isNavCollapsed ? { justifyContent: 'center', padding: '0.75rem' } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              {!isNavCollapsed && <span>Home</span>}
            </div>
            <div 
              className={`nav-item ${activeTab === 'document' ? 'active' : ''}`} 
              onClick={() => setActiveTab('document')} 
              title="Document"
              style={isNavCollapsed ? { justifyContent: 'center', padding: '0.75rem' } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              {!isNavCollapsed && <span>Document</span>}
            </div>
          </div>
        </aside>

        {/* Dynamic Center Content */}
        <div className="document-viewer-section">
          {activeTab === 'home' ? (
            <div style={{ maxWidth: '800px', width: '100%', marginTop: '4rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#111', letter_spacing: '-0.03em' }}>Welcome back.</h1>
              <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '4rem' }}>Upload a document to start analyzing or continue where you left off.</p>
              
              <div 
                onClick={() => fileInputRef.current.click()}
                style={{ 
                  background: 'white', 
                  border: '2px dashed #eee', 
                  borderRadius: '24px', 
                  padding: '6rem 2rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#111'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#eee'}
              >
                <div style={{ background: '#f5f5f5', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justify_content: 'center', margin: '0 auto 1.5rem' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginBottom: '0.5rem' }}>Upload Document</h3>
                <p style={{ color: '#999', fontSize: '0.95rem' }}>PDF files up to 50MB are supported.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf" />
              </div>

              {documents.length > 0 && (
                <div style={{ marginTop: '5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999', marginBottom: '1.5rem' }}>Recent Documents</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                    {documents.slice(0, 3).map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => handleSelectDoc(doc)}
                        style={{ background: 'white', border: '1px solid #f0f0f0', padding: '1.5rem', borderRadius: '16px', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" style={{ marginBottom: '1rem' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        <div style={{ fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              className="doc-page" 
              style={pdfUrl ? { 
                width: '100%', 
                maxWidth: 'none', 
                height: '100%', 
                padding: 0, 
                border: 'none', 
                boxShadow: 'none',
                borderRadius: 0,
                margin: 0
              } : {}}
            >
              {pdfUrl ? (
                <iframe 
                  src={pdfUrl} 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'block'
                  }} 
                  frameBorder="0"
                  title="Document Viewer"
                />
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
          )}
        </div>

        {/* Plugin Sidebar (Chatbot) on the Right */}
        <aside className="plugin-sidebar">
          <div className="plugin-header">
            <div className="plugin-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              Assistant
            </div>
            <button className="plugin-close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="plugin-chat-container">
            <div className="plugin-chat-messages">
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
                  <p style={{ fontSize: '0.9rem' }}>How can I help you today?</p>
                  <button 
                    onClick={() => fileInputRef.current.click()} 
                    style={{ marginTop: '1.5rem', background: '#111', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                    accept=".pdf"
                  />
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`plugin-message ${msg.sender}`}>
                    <div className="plugin-bubble">
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="plugin-input-area">
              <form className="plugin-input-wrapper" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  className="plugin-input" 
                  placeholder="Ask a question..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="plugin-send-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </form>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Chat;
