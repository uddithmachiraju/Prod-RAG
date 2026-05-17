import React, { useState, useRef } from 'react';
import '../index.css';

const HomeUI = ({ onLogout, user, onUpload, documents = [], onSelectDoc }) => {
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef(null);
  
  // Extract user first name
  const firstName = user?.name ? user.name.split(' ')[0] : 'John';

  const prompts = [
    {
      title: "Write a to-do list for a personal project or task",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    },
    {
      title: "Generate an email to reply to a job offer",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
      )
    },
    {
      title: "Summarise this article or text for me in one paragraph",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )
    },
    {
      title: "How does AI work in a technical capacity",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
      )
    }
  ];

  const handleFileUpload = (e) => {
    if (onUpload) {
      onUpload(e);
    } else {
      const file = e.target.files[0];
      if (file) {
        alert(`File selected: ${file.name}`);
      }
    }
  };

  return (
    <main className="new-home-main">
          
          <div className="new-home-content-wrapper">
            <div className="greeting-section">
              <h1 className="greeting-heading">
                Hi there, <span className="greeting-name">{firstName}</span>
              </h1>
              <h2 className="greeting-question">What would you like to know?</h2>
              <p className="greeting-subtitle">Here are your recent documents, or use the input below to begin.</p>
            </div>

            {documents && documents.length > 0 ? (
              <div className="prompts-grid">
                {documents.slice(0, 4).map((doc, index) => (
                  <div key={doc.id || index} className="prompt-card" onClick={() => onSelectDoc && onSelectDoc(doc)}>
                    <p className="prompt-card-text" style={{ wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {doc.name}
                    </p>
                    <div className="prompt-card-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="prompts-grid">
                <div className="prompt-card" onClick={() => fileInputRef.current?.click()}>
                  <p className="prompt-card-text" style={{ color: '#888' }}>No recent documents found. Upload a document to get started.</p>
                  <div className="prompt-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                </div>
              </div>
            )}



            <div className="chat-input-container">
              <div className="chat-input-top">
                <textarea 
                  className="chat-input-textarea"
                  placeholder="Upload a document and start chatting..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows="2"
                />

              </div>

              <div className="chat-input-bottom-bar">
                <div className="chat-input-actions-left">
                  <button className="chat-action-btn" onClick={() => fileInputRef.current?.click()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Add Attachment
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{display: 'none'}} 
                    onChange={handleFileUpload} 
                  />
                  

                </div>
                
                <div className="chat-input-actions-right">

                  <button className="chat-submit-btn" disabled={!inputText.trim()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
  );
};

export default HomeUI;
