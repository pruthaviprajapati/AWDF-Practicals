import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../components/Components.css';

const Spinner = () => (
  <div className="spinner-container" style={{ textAlign: 'center', padding: '40px' }}>
    <div className="spinner" style={{ 
      border: '4px solid rgba(0,0,0,0.1)', 
      width: '40px', 
      height: '40px', 
      borderRadius: '50%', 
      borderLeftColor: 'var(--primary)', 
      animation: 'spin 1s linear infinite', 
      margin: '0 auto' 
    }}></div>
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
    <p>Loading tasks from Node + MongoDB backend...</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-container" style={{ textAlign: 'center', padding: '40px', color: '#dc2626' }}>
    <h3>Error fetching tasks from backend</h3>
    <p>{message}</p>
    <button onClick={onRetry} className="submit-btn" style={{ marginTop: '10px' }}>Retry</button>
  </div>
);

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTasks = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:5000/tasks')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setTasks(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => 
    (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      {/* Page heading */}
      <div className="portfolio-header">
        <h1>Backend Tasks &amp; Projects</h1>
        <p>
          Practical 6 Integration: Replaced GitHub repo data with live task data persisted in MongoDB Atlas &amp; Node.js backend.
        </p>
      </div>

      {/* Filter bar with search and link to full task manager */}
      <div className="section-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="project-filter-bar" style={{ display: 'block', flex: 1, minWidth: '240px' }}>
          <label className="filter-label" style={{ display: 'block', marginBottom: '8px' }}>Search Task / Project</label>
          <input 
            type="text" 
            className="form-input" 
            style={{ width: '100%', maxWidth: '100%' }}
            placeholder="Search by title or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <Link
            to="/task"
            className="submit-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            📋 Open Task Manager (CRUD &amp; PDF) →
          </Link>
        </div>
      </div>

      {/* States rendering */}
      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={fetchTasks} />}

      {!loading && !error && (
        <div className="projects-grid">
          {filteredTasks.length > 0 ? filteredTasks.map((task, idx) => (
            <div key={task.id || task._id || idx} className="project-card">
              <div className="project-card-header">
                <h3 className="project-card-title">{task.title}</h3>
                <span
                  className="project-badge"
                  style={{
                    backgroundColor: task.status === 'COMPLETE' ? '#dcfce7' : task.status === 'ONGOING' ? '#dbeafe' : '#ffedd5',
                    color: task.status === 'COMPLETE' ? '#15803d' : task.status === 'ONGOING' ? '#1d4ed8' : '#c2410c',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '12px'
                  }}
                >
                  {task.status || (task.completed ? 'COMPLETE' : 'INCOMPLETE')}
                </span>
              </div>
              <p className="project-card-desc">
                {task.description || 'No description provided.'}
              </p>
              
              <div className="project-tags" style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-light)', display: 'flex', gap: '15px' }}>
                <span title="Priority">⚡ Priority: {task.priority || 'medium'}</span>
                <span title="Created Date">🕒 {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              
              <div>
                <Link
                  to="/task"
                  className="submit-btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  Manage in Task UI →
                </Link>
              </div>
            </div>
          )) : (
            <p style={{ textAlign: 'center', width: '100%', padding: '2rem' }}>
              No tasks found. Open the Task Manager to add new tasks to MongoDB!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Projects;
