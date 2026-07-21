import { useState } from 'react';
import '../components/Components.css';

const projectList = [
  {
    title: '🧠 Smart Study Planner',
    description: 'A React scheduling app that helps students track assignments, exams, and class schedules in real-time.',
    tags: ['React', 'JavaScript', 'CSS'],
    status: 'Completed',
  },
  {
    title: '🍽️ Recipe Finder Web App',
    description: 'A food application that searches for meals and lists ingredients using an external REST API.',
    tags: ['React', 'API', 'Fetch'],
    status: 'Completed',
  },
  {
    title: '🗂️ Personal Portfolio',
    description: 'A clean multi-page site built with React + Vite and React Router to showcase skills and projects.',
    tags: ['React', 'Vite', 'Router'],
    status: 'In Progress',
  },
  {
    title: '🤖 AI Chat Assistant',
    description: 'A conversational AI interface prototype built with React and integrated with a language model API.',
    tags: ['React', 'AI/ML', 'Node.js'],
    status: 'Planned',
  },
];

function Projects() {
  // useState #1 variant — toggle visibility of project filter info tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [filter, setFilter] = useState('All');

  const statusOptions = ['All', 'Completed', 'In Progress', 'Planned'];

  const filtered = filter === 'All'
    ? projectList
    : projectList.filter(p => p.status === filter);

  return (
    <div className="container">
      {/* Page heading */}
      <div className="portfolio-header">
        <h1>My Projects</h1>
        <p>Advanced Web Development Framework — Practical 2</p>
      </div>

      {/* Filter bar with tooltip */}
      <div className="section-card">
        <div className="project-filter-bar">
          <span className="filter-label">Filter by status:</span>

          {statusOptions.map(opt => (
            <button
              key={opt}
              id={`filter-btn-${opt.replace(' ', '-').toLowerCase()}`}
              className={`filter-btn ${filter === opt ? 'filter-btn-active' : ''}`}
              onClick={() => setFilter(opt)}
            >
              {opt}
            </button>
          ))}

          {/* Help tooltip toggle — uses useState for UI visibility */}
          <button
            id="tooltip-toggle-btn"
            className="help-btn"
            onClick={() => setShowTooltip(prev => !prev)}
            aria-label="Toggle filter help"
          >
            ?
          </button>
        </div>

        {/* Tooltip — visible only when showTooltip is true */}
        {showTooltip && (
          <div id="filter-tooltip" className="filter-tooltip">
            💡 Use the buttons above to filter projects by their current status. Click <strong>?</strong> again to hide this tip.
          </div>
        )}
      </div>

      {/* Project cards */}
      <div className="projects-grid">
        {filtered.map((project, index) => (
          <div key={index} className="project-card">
            <div className="project-card-header">
              <h3 className="project-card-title">{project.title}</h3>
              <span className={`project-badge badge-${project.status.replace(' ', '-').toLowerCase()}`}>
                {project.status}
              </span>
            </div>
            <p className="project-card-desc">{project.description}</p>
            <div className="project-tags">
              {project.tags.map((tag, i) => (
                <span key={i} className="project-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
