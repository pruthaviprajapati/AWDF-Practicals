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
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  // Read saved user session from localStorage on initial load
  useEffect(() => {
    const savedUser = localStorage.getItem('portfolio_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Error parsing stored user session', err);
      }
    }
  }, []);

  return (
    <div className={darkMode ? 'app-root dark' : 'app-root'}>
      <NavBar darkMode={darkMode} setDarkMode={setDarkMode} user={user} setUser={setUser} />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Task user={user} />} />
          <Route path="/task" element={<Task user={user} />} />
          <Route path="/login" element={<Login user={user} setUser={setUser} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
