import './Components.css';

function Projects() {
  const projectList = [
    {
      title: 'Smart Study Planner',
      description: 'A React scheduling app that helps students track assignments, exams, and class schedules.'
    },
    {
      title: 'Recipe Finder Web App',
      description: 'A simple food application that searches for meals and lists ingredients using an external API.'
    },
    {
      title: 'Personal Portfolio',
      description: 'A clean single-page site built with React and Vite to showcase personal skills and projects.'
    }
  ];

  return (
    <div className="section-card">
      <div className="section-card-title">
        <span>My Projects</span>
      </div>
      <div className="projects-list">
        {projectList.map((project, index) => (
          <div key={index} className="project-item">
            <h4>{project.title}</h4>
            <p>{project.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
