import { useState, useEffect } from 'react';
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
    <p>Loading projects...</p>
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-container" style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
    <h3>Error fetching projects</h3>
    <p>{message}</p>
    <button onClick={onRetry} className="submit-btn" style={{ marginTop: '10px' }}>Retry</button>
  </div>
);

function Projects() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRepos = () => {
    setLoading(true);
    setError(null);
    fetch('https://api.github.com/users/pruthaviprajapati/repos')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setRepos(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container">
      {/* Page heading */}
      <div className="portfolio-header">
        <h1>My GitHub Projects</h1>
        <p>A collection of my recent work, showcasing practical development, UI design, and problem-solving across full-stack projects.</p>
      </div>

      {/* Filter bar with search */}
      <div className="section-card">
        <div className="project-filter-bar" style={{ display: 'block' }}>
          <label className="filter-label" style={{ display: 'block', marginBottom: '8px' }}>Search Repository</label>
          <input 
            type="text" 
            className="form-input" 
            style={{ width: '100%', maxWidth: '100%' }}
            placeholder="Search Repository" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* States rendering */}
      {loading && <Spinner />}
      {error && <ErrorMessage message={error} onRetry={fetchRepos} />}

      {!loading && !error && (
        <div className="projects-grid">
          {filteredRepos.length > 0 ? filteredRepos.map((repo) => (
            <div key={repo.id} className="project-card">
              <div className="project-card-header">
                <h3 className="project-card-title">{repo.name}</h3>
                {repo.language && (
                  <span className="project-badge badge-planned" style={{ backgroundColor: 'var(--bg)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                    {repo.language}
                  </span>
                )}
              </div>
              <p className="project-card-desc">
                {repo.description || 'No description available'}
              </p>
              
              <div className="project-tags" style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-light)', display: 'flex', gap: '15px' }}>
                <span title="Stars">⭐ {repo.stargazers_count}</span>
                <span title="Forks">🍴 {repo.forks_count}</span>
                <span title="Updated At">🕒 {new Date(repo.updated_at).toLocaleDateString()}</span>
              </div>
              
              <div>
                <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="submit-btn" style={{ padding: '6px 14px', fontSize: '12px', textDecoration: 'none', display: 'inline-block' }}>
                  View Repository →
                </a>
              </div>
            </div>
          )) : (
            <p style={{ textAlign: 'center', width: '100%' }}>No repositories found matching your search.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Projects;
