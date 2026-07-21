import { useState } from 'react';
import '../components/Components.css';

function Contact() {
  // useState #1 — controlled form input (message)
  const [message, setMessage] = useState('');

  // useState #2 — toggle visibility of a help tooltip
  const [showHelp, setShowHelp] = useState(false);

  // useState #3 — submitted confirmation banner
  const [submitted, setSubmitted] = useState(false);

  // Other controlled inputs
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');

  const MAX_CHARS = 300;

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim() && email.trim() && message.trim()) {
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }
  }

  return (
    <div className="container">
      {/* Page heading */}
      <div className="portfolio-header">
        <h1>Contact Me</h1>
        <p>Advanced Web Development Framework — Practical 2</p>
      </div>

      {/* Success banner — shown after submit */}
      {submitted && (
        <div id="success-banner" className="success-banner">
          ✅ Message sent! I'll get back to you soon.
          <button
            className="banner-close-btn"
            onClick={() => setSubmitted(false)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="section-card contact-card">
        <div className="section-card-title">
          <span>📬 Send a Message</span>
          {/* Help tooltip toggle — useState for UI visibility */}
          <button
            id="contact-help-toggle"
            className="help-btn"
            onClick={() => setShowHelp(prev => !prev)}
            aria-label="Toggle help"
          >
            ?
          </button>
        </div>

        {/* Tooltip — shown only when showHelp is true */}
        {showHelp && (
          <div id="contact-help-tooltip" className="filter-tooltip">
            💡 Fill in all fields and click <strong>Send</strong>. Your message is captured live in React state — no page reload!
          </div>
        )}

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          {/* Name field */}
          <div className="form-group">
            <label htmlFor="contact-name" className="form-label">Full Name</label>
            <input
              id="contact-name"
              type="text"
              className="form-input"
              placeholder="Pruthavi Prajapati"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email field */}
          <div className="form-group">
            <label htmlFor="contact-email" className="form-label">Email Address</label>
            <input
              id="contact-email"
              type="email"
              className="form-input"
              placeholder="pruthavi@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Message — controlled input tied to useState, displays live character count */}
          <div className="form-group">
            <label htmlFor="contact-message" className="form-label">Message</label>
            <textarea
              id="contact-message"
              className="form-input form-textarea"
              placeholder="Write your message here…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_CHARS}
              rows={5}
              required
            />
            {/* Live character count — updates on every keystroke via state */}
            <div id="char-count" className={`char-count ${message.length >= MAX_CHARS ? 'char-limit-reached' : ''}`}>
              {message.length} / {MAX_CHARS} characters
            </div>
          </div>

          {/* Live preview of what the user typed */}
          {message.trim() && (
            <div id="message-preview" className="message-preview">
              <strong>Preview:</strong>
              <p>{message}</p>
            </div>
          )}

          <button
            id="contact-submit-btn"
            type="submit"
            className="submit-btn"
            disabled={!name.trim() || !email.trim() || !message.trim()}
          >
            Send Message →
          </button>
        </form>
      </div>

      {/* Contact info card */}
      <div className="section-card">
        <div className="section-card-title">
          <span>📍 Other Ways to Reach Me</span>
        </div>
        <div className="contact-info-grid">
          <div className="contact-info-item">
            <span className="contact-info-icon">📧</span>
            <span>pruthavi.prajapati@gmail.com</span>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">🌐</span>
            <span>github.com/pruthaviprajapati</span>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">🎓</span>
            <span>CHARUSAT University, Gujarat</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
