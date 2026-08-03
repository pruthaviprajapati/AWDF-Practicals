import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Projects from './pages/Projects';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import Task from './pages/Task';
import './App.css';

function App() {
  // useState #1 — dark/light mode toggle (supplementary requirement)
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? 'app-root dark' : 'app-root'}>
      <NavBar darkMode={darkMode} setDarkMode={setDarkMode} />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Task />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
