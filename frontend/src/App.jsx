import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('login'); // 'login', 'register', 'dashboard', 'loading'
  const [user, setUser] = useState(null);

  // Auto-login if we have user in local storage (for convenience)
  useEffect(() => {
    const savedUser = localStorage.getItem('gmail-clone-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setView('loading');
    }
  }, []);

  // Handle Loading Transition
  useEffect(() => {
    if (view === 'loading') {
      const timer = setTimeout(() => {
        setView('dashboard');
      }, 2000); // 2 second transition
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('gmail-clone-user', JSON.stringify(userData));
    setView('loading');
  };

  const handleRegister = (userData) => {
    setUser(userData);
    localStorage.setItem('gmail-clone-user', JSON.stringify(userData));
    setView('loading');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gmail-clone-user');
    setView('login');
  };

  return (
    <>
      {view === 'login' && <Login onLogin={handleLogin} onNavigateRegister={() => setView('register')} />}
      {view === 'register' && <Register onRegister={handleRegister} onNavigateLogin={() => setView('login')} />}
      {view === 'loading' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-color)'
        }}>
          <img 
            src="/logo.png" 
            alt="JMail Logo" 
            style={{ 
              width: '140px',
              height: '140px',
              objectFit: 'contain',
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '32px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              animation: 'pulse 1.5s infinite ease-in-out' 
            }} 
          />
          <style>{`
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.8; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.8; }
            }
          `}</style>
        </div>
      )}
      {view === 'dashboard' && user && <Dashboard user={user} onLogout={handleLogout} />}
    </>
  );
}
