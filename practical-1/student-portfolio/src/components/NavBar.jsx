import { NavLink, useNavigate } from 'react-router-dom';
import './Components.css';

function NavBar({ darkMode, setDarkMode, user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('portfolio_user');
    navigate('/login');
  };

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
          <NavLink to="/tasks" className={({ isActive }) => isActive ? 'active' : ''}>
            Task
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>
            Contact
          </NavLink>
        </li>
        <li>
          <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : ''}>
            {user ? `👤 ${user.username}` : 'Login'}
          </NavLink>
        </li>
      </ul>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {user && (
          <button
            onClick={handleLogout}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: 'none',
              background: '#e53e3e',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Logout
          </button>
        )}
        <button
          id="dark-mode-toggle"
          className="dark-toggle-btn"
          onClick={() => setDarkMode(prev => !prev)}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀ Light' : '🌙 Dark'}
        </button>
      </div>
    </nav>
  );
}

export default NavBar;
