import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login({ user, setUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    const endpoint = isRegister ? 'http://localhost:5000/api/register' : 'http://localhost:5000/api/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          setMessage('Registration successful! Please log in now.');
          setIsRegister(false);
          setPassword('');
        } else {
          setUser(data.user);
          localStorage.setItem('portfolio_user', JSON.stringify(data.user));
          navigate('/tasks');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('portfolio_user');
    setMessage('Logged out successfully.');
  };

  if (user) {
    return (
      <div className="container">
        <div className="login-card">
          <h2 className="section-title">User Account</h2>
          <p className="subtitle">Logged in as <strong>{user.username}</strong></p>
          <div className="user-info-box">
            <p><strong>User ID:</strong> {user.id}</p>
            <p className="db-note">✨ Data persisted in MongoDB (<code>task_portfolio_db</code>)</p>
          </div>
          <button onClick={handleLogout} className="logout-action-btn">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="login-card">
        <div className="tab-header">
          <button
            className={`tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); setMessage(''); }}
          >
            Login
          </button>
          <button
            className={`tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); setMessage(''); }}
          >
            Register
          </button>
        </div>

        <h2 className="section-title">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="subtitle">
          {isRegister
            ? 'Register to create user-wise tasks saved directly in MongoDB.'
            : 'Log in to view and manage your MongoDB task list.'}
        </p>

        {error && <div className="auth-alert error">{error}</div>}
        {message && <div className="auth-alert success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
