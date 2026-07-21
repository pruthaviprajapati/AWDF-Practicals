import { NavLink } from 'react-router-dom';
import './Components.css';

function NavBar({ darkMode, setDarkMode }) {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        Pruthavi Prajapati
      </div>

      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/projects" className={({ isActive }) => isActive ? 'active' : ''}>
            Projects
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>
            Contact
          </NavLink>
        </li>
      </ul>

      {/* Dark/Light mode toggle using useState passed from App */}
      <button
        id="dark-mode-toggle"
        className="dark-toggle-btn"
        onClick={() => setDarkMode(prev => !prev)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀ Light' : '🌙 Dark'}
      </button>
    </nav>
  );
}

export default NavBar;
