import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Task from './pages/Task';
import Login from './pages/Login';
import './App.css';

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
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
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
