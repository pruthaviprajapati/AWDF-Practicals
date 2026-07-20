import './Components.css';

function Header({ name, role }) {
  return (
    <div className="portfolio-header-container">
      {/* Page Title & Subtitle block */}
      <div className="portfolio-header">
        <h1>My Portfolio</h1>
        <p>Advanced Web Development Framework - Practical 1</p>
      </div>

      {/* Main branding hero card */}
      <div className="branding-card">
        <h2>{name || 'Pruthavi Prajapati'}</h2>
        <p>{role || 'Computer Science & Engineering Student | CHARUSAT'}</p>
      </div>
    </div>
  );
}

export default Header;
