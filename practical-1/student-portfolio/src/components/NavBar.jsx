import { NavLink, useNavigate } from 'react-router-dom';
import './Components.css';

function NavBar({ darkMode, setDarkMode, user, onLogout }) {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/task');
  };

  const displayName = user ? (user.name || user.username || user.email) : null;

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
          <NavLink to="/task" className={({ isActive }) => isActive ? 'active' : ''}>
            Task
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" className={({ isActive }) => isActive ? 'active' : ''}>
            Contact
          </NavLink>
        </li>
      </ul>

      <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
        {user ? (
          <>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
              👤 {displayName}
            </span>
            <button
              onClick={handleLogoutClick}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#e53e3e',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <NavLink
            to="/task"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.82rem'
            }}
          >
            Log In / Register
          </NavLink>
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
