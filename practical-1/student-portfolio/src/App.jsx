import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Task from './pages/Task';
import Login from './pages/Login';
import './App.css';

// Practical 08: Implement lazy loading for the Projects and Contact routes
const Projects = lazy(() => import('./pages/Projects'));
const Contact = lazy(() => import('./pages/Contact'));

// Suspense Loading Fallback component matching Practical 08 specification
const LoadingFallback = () => (
  <div className="lazy-loading-fallback" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
    <div style={{
      width: '42px',
      height: '42px',
      border: '4px solid #e2e8f0',
      borderTopColor: '#2563eb',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      margin: '0 auto 1.25rem auto'
    }}></div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
      ⚡ Loading route component dynamically (Lazy Loading)...
    </p>
  </div>
);

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('portfolio_theme') === 'dark';
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('portfolio_auth_token') || '';
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('portfolio_auth_user') || localStorage.getItem('portfolio_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep theme in localStorage
  useEffect(() => {
    localStorage.setItem('portfolio_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleSetAuth = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem('portfolio_auth_token', newToken);
    } else {
      localStorage.removeItem('portfolio_auth_token');
    }
    if (newUser) {
      localStorage.setItem('portfolio_auth_user', JSON.stringify(newUser));
      localStorage.setItem('portfolio_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('portfolio_auth_user');
      localStorage.removeItem('portfolio_user');
    }
  };

  return (
    <div className={darkMode ? 'app-root dark' : 'app-root'}>
      <NavBar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        token={token}
        onLogout={() => handleSetAuth('', null)}
      />
      <main className="page-content">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Lazy-loaded route #1 */}
            <Route path="/projects" element={<Projects />} />
            {/* Lazy-loaded route #2 */}
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/tasks"
              element={<Task user={user} token={token} onAuthSuccess={handleSetAuth} onLogout={() => handleSetAuth('', null)} />}
            />
            <Route
              path="/task"
              element={<Task user={user} token={token} onAuthSuccess={handleSetAuth} onLogout={() => handleSetAuth('', null)} />}
            />
            <Route
              path="/login"
              element={<Login user={user} setUser={(u) => handleSetAuth(token, u)} />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default App;
