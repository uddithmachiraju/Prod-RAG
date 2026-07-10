import { useRef, useState } from 'react';
import '../index.css';

const HomeUI = ({ onLogout, user, onUpload, documents = [], onSelectDoc }) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Extract user first name
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : (user?.username || 'User');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachedFile(file);
    }
    e.target.value = null;
  };

  const handleSend = () => {
    if (attachedFile && onUpload) {
      onUpload(attachedFile, inputText);
      setAttachedFile(null);
      setInputText('');
    } else if (!onUpload && attachedFile) {
      alert(`File selected: ${attachedFile.name}`);
    }
  };

  return (
    <main className="new-home-main premium-dashboard">
      <div className="dynamic-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="premium-content-wrapper">
        <div className="premium-greeting-section">
          <div>
            <h1 className="premium-greeting-heading">
              Good morning, <span className="premium-greeting-name">{firstName}</span>
            </h1>
            <p className="premium-greeting-subtitle">What will we analyze today?</p>
          </div>
        </div>

        <div className="premium-chat-container">
          <div className="premium-chat-input-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>

            {attachedFile && (
              <div style={{ display: 'flex', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                <div className="attach-pill" style={{ display: 'inline-flex', padding: '0.5rem 0.75rem', borderRadius: '12px', background: 'rgba(107, 76, 154, 0.08)', border: '1px solid rgba(107, 76, 154, 0.2)', color: '#5d3f94' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <span style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 600 }}>{attachedFile.name}</span>
                  <button className="close-x" onClick={() => setAttachedFile(null)} style={{ background: 'transparent', color: '#5d3f94', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 2px 4px' }}>&times;</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <svg className="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                className="premium-chat-input"
                placeholder={attachedFile ? "Ask a question about this document..." : "Ask a question and drop a document here..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && attachedFile) {
                    handleSend();
                  }
                }}
                style={{ minWidth: '200px' }}
              />
              <div className="premium-chat-actions">
                <button className="premium-action-btn attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach Document">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <button className="premium-action-btn send-btn" disabled={!attachedFile} onClick={handleSend} title={!attachedFile ? "Attach a document first" : "Upload and Send"}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </div>

        <div className="premium-documents-section">
          <h3 className="section-title">Recent Chats</h3>
          {documents && documents.length > 0 ? (
            <div className="premium-chats-list">
              {documents.slice(0, 4).map((doc, index) => (
                <div key={doc.chat_id || doc.id || index} className="premium-chat-item" onClick={() => onSelectDoc && onSelectDoc(doc)}>
                  <div className="list-icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div className="list-content">
                    <h4 className="list-title">{doc.title || doc.name || 'Unnamed Chat'}</h4>
                    <p className="list-meta">{doc.last_message_preview || 'Started recently'}</p>
                  </div>
                  <div className="list-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#888', background: 'rgba(255,255,255,0.5)', borderRadius: '12px', border: '1px dashed #ddd' }}>
              No recent chats. Start a new analysis above!
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default HomeUI;

