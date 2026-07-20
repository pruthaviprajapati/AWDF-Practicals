import './Components.css';

function Skills({ skillList }) {
  const list = skillList || ['HTML', 'CSS', 'JavaScript', 'React', 'Python'];

  return (
    <div className="section-card">
      <div className="section-card-title">
        <span>Technical Skills</span>
      </div>
      <div className="skills-tags-container">
        {list.map((skill, index) => (
          <span key={index} className="skill-tag-pill">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Skills;
