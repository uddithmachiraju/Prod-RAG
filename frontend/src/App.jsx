import React, { useState, useEffect } from 'react';
import './index.css';
import Auth from './components/Auth';
import Chat from './components/Chat';

function App() {
  const [view, setView] = useState(localStorage.getItem('app_view') || 'landing');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('app_user')));

  useEffect(() => {
    localStorage.setItem('app_view', view);
  }, [view]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('app_user');
    }
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setView('chat'); 
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('app_view');
    localStorage.removeItem('app_user');
    setView('landing');
  };

  const renderContent = () => {
    if (view === 'login' || view === 'register') {
      return (
        <Auth 
          type={view} 
          onToggle={setView} 
          onSuccess={handleLoginSuccess} 
        />
      );
    }

    if (view === 'chat' || user) {
      return <Chat />;
    }

    return (
      <main className="hero">
        <h1 className="hero-title">
          Chat with your Documents
        </h1>
        <p className="hero-subtitle">
          Turn documents and reports into an intelligent, searchable knowledge assistant.
        </p>

        <div className="hero-buttons">
          <button className="get-started-btn" onClick={() => setView('register')}>Get Started</button>
          <button className="secondary-btn">Book a Demo</button>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
            </div>
            <h3>Secure & Private</h3>
            <p>Your documents stay yours. We employ enterprise-grade security protocols to ensure complete data isolation.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h3>End-to-End Encrypted</h3>
            <p>Military-grade AES-256 encryption protects your intellectual property during transit and at rest.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper aws-icon-wrapper">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#232F3E', lineHeight: '1' }}>aws</span>
                <svg width="28" height="8" viewBox="0 0 28 8" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '1px' }}>
                  <path d="M20.5 5.5C16.9 7.7 12.4 8.2 8.3 6.9 5.3 6 2.6 4 1.1 1.2.8.6.5-.1.2-.8c-.1-.3 0-.6.3-.7.9-.3 1.9-.6 2.8-.8.4-.1.7.1 1 .4.7 1.2 1.6 2.2 2.7 3 2.1 1.5 4.8 2.2 7.3 1.9 2.2-.3 4.3-1.1 6-2.5.3-.3.7-.2 1 .1l1.1 1.1c.2.2.2.6-.1.9-.8.8-1.6 1.4-2.3 2.8z" fill="#FF9900" />
                  <path d="M21.2 1.5c-.7-.4-1.6-.4-2.4-.3-.4.1-.6-.2-.4-.6.5-1.1 1.3-1.9 2.2-2.6.8-.5 1.6-.9 2.5-1.1.4-.1.7.2.6.6-.2 1-.4 2-.9 2.8-.4.6-1 1.1-1.6 1.2z" fill="#FF9900" />
                </svg>
              </div>
            </div>
            <h3>Built on AWS</h3>
            <p>Powered by Amazon Web Services infrastructure for unparalleled performance, scale, and reliability.</p>
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="main-wrapper">
      <div className="container">
        {view !== 'chat' && !user && (
          <header className="full-width-header">
            <div className="nav-logo-left" onClick={() => setView('landing')} style={{ cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
              <span className="logo-text">ChatDocs</span>
            </div>

            <div className="nav-links-center">
              <a href="#" className="nav-link">Resources</a>
              <a href="#" className="nav-link">Contact</a>
            </div>

            <div className="nav-actions-right">
              <a href="#" className="nav-link-login" onClick={(e) => { e.preventDefault(); setView('login'); }}>Login</a>
              <a href="#" className="nav-signup-btn" onClick={(e) => { e.preventDefault(); setView('register'); }}>Sign Up</a>
            </div>
          </header>
        )}

        {renderContent()}
      </div>
    </div>
  );
}

export default App;
