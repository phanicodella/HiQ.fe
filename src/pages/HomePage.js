import React from 'react';
import { Link } from 'react-router-dom';
import { AccessRequestForm } from '../components/AccessRequestForm';
import AIbg from '../assets/AIbg.png';
import './HomePage.css';

export function HomePage() {
  const bgStyle = {
    '--bg-image': `url(${AIbg})`
  };

  return (
    <div className="homepage" style={bgStyle}>
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="nav-brand">HiQ AI</Link>
          <div className="nav-links">
            <a href="#benefits" className="nav-link">Benefits</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#testimonials" className="nav-link">Success Stories</a>
            <Link to="/login" className="nav-link">Sign In</Link>
          </div>
        </div>
      </nav>

      <section className="hero-content">
        <h1 className="hero-title">
          Revolutionize Your Technical Hiring
          <span style={{ display: 'block', color: '#a5b4fc' }}>With AI-Powered Intelligence</span>
        </h1>
        <p className="hero-text">
          Stop losing top talent to inefficient interviews. HiQ AI brings objectivity, 
          speed, and deep insights to your technical hiring process.
        </p>
        <button
          onClick={() => document.getElementById('request-access').scrollIntoView({ behavior: 'smooth' })}
          className="cta-button"
        >
          Request Early Access
        </button>
        <p style={{ color: '#9ca3af', marginTop: '1rem' }}>
          Limited slots available. Join 100+ companies already transforming their hiring.
        </p>
      </section>

      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">87%</div>
            <div className="stat-label">Reduction in Time-to-Hire</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">92%</div>
            <div className="stat-label">Candidate Satisfaction Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">3.5x</div>
            <div className="stat-label">Better Hire Quality</div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <h2 className="section-title">Why Every Tech Company Needs HiQ AI</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>End Interview Inconsistency</h3>
            <p>No more random questions or biased evaluations. Our AI ensures every candidate 
              gets a fair, standardized assessment.</p>
          </div>
          <div className="feature-card">
            <h3>Save Countless Hours</h3>
            <p>Automated question generation, real-time analysis, and instant feedback 
              reports free up your team's valuable time.</p>
          </div>
          <div className="feature-card">
            <h3>Reduce Hiring Risks</h3>
            <p>Advanced fraud detection and comprehensive skill assessment minimize 
              the risk of bad hires.</p>
          </div>
        </div>
      </section>

      <section className="testimonials-section" id="testimonials">
        <h2 className="section-title">What Tech Leaders Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p>"HiQ AI transformed our technical hiring process. We've cut our time-to-hire 
              by 70% while making better quality hires. It's a game-changer."</p>
            <h4>Mahesh</h4>
            <div>CTO, ANTech Solutions</div>
          </div>
          <div className="testimonial-card">
            <p>"The AI-powered insights have been invaluable. We're now able to make data-driven 
              hiring decisions with confidence."</p>
            <h4>Ryan Meade</h4>
            <div>CEO, AencyPT</div>
          </div>
        </div>
      </section>

      <section className="request-section" id="request-access">
        <div className="request-container">
          <h2 className="section-title">Join the Future of Technical Hiring</h2>
          <p>Due to overwhelming demand, we're accepting a limited number of companies 
            into our platform. Request access now to secure your spot.</p>
          <AccessRequestForm />
        </div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-column">
            <h3>Product</h3>
            <ul className="footer-links">
              <li><a href="#features" className="footer-link">Features</a></li>
              <li><a href="#benefits" className="footer-link">Benefits</a></li>
              <li><a href="#testimonials" className="footer-link">Testimonials</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3>Company</h3>
            <ul className="footer-links">
              <li><a href="/about" className="footer-link">About Us</a></li>
              <li><a href="/blog" className="footer-link">Blog</a></li>
              <li><a href="/careers" className="footer-link">Careers</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li><a href="/docs" className="footer-link">Documentation</a></li>
              <li><a href="/support" className="footer-link">Support</a></li>
              <li><a href="/privacy" className="footer-link">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3>Connect</h3>
            <ul className="footer-links">
              <li><a href="https://twitter.com/hiqai" className="footer-link">Twitter</a></li>
              <li><a href="https://linkedin.com/company/hiqai" className="footer-link">LinkedIn</a></li>
              <li><a href="/contact" className="footer-link">Contact</a></li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '3rem', color: '#9ca3af' }}>
          © {new Date().getFullYear()} HiQ AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}