import React, { useState, useRef, useEffect } from 'react';
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
                <circle cx="12" cy="5" r="3" fill="currentColor"/>
                <circle cx="12" cy="19" r="3" fill="currentColor"/>
                <circle cx="5" cy="12" r="3" fill="currentColor"/>
                <circle cx="19" cy="12" r="3" fill="currentColor"/>
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
              className={`sidebar-btn ${activeTab === 'document' ? 'active' : ''}`} 
              onClick={() => setActiveTab('document')} 
              title="Document"
              style={activeTab === 'document' ? { color: '#111', background: '#eaeaea' } : {}}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </button>
            
            <button className="sidebar-btn sidebar-btn-add" onClick={() => fileInputRef.current?.click()} title="Upload Document" style={{marginTop: '1rem'}}>
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
            <aside className="plugin-sidebar" style={{ width: '450px', borderLeft: '1px solid #f0f0f0', background: '#f4f4f5', margin: '0', height: '100%', boxShadow: 'none', borderRight: 'none', borderRadius: '0' }}>
              <div className="plugin-header" style={{ padding: '1.5rem', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div className="plugin-chat-messages" style={{ padding: '1rem 1.5rem', background: 'transparent' }}>
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

                <div className="plugin-input-area" style={{ padding: '1.5rem', background: 'transparent' }}>
                  <form className="plugin-input-wrapper" onSubmit={handleSendMessage} style={{ background: '#ffffff', borderRadius: '16px', padding: '0.75rem', display: 'flex', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                    <input 
                      type="text" 
                      className="plugin-input" 
                      placeholder="Ask a question..." 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      style={{ background: 'transparent', border: 'none', flex: 1, outline: 'none', fontSize: '0.95rem' }}
                    />
                    <button type="submit" className="plugin-send-btn" style={{ background: '#111', color: 'white', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    </button>
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
