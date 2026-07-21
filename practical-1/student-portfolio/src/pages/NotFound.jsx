import { Link } from 'react-router-dom';
import '../components/Components.css';

function NotFound() {
  return (
    <div className="container notfound-container">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h2 className="notfound-title">Page Not Found</h2>
        <p className="notfound-desc">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" id="notfound-home-link" className="notfound-btn">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
