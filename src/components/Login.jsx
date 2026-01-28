import React, { useState } from 'react';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      console.log('Sign Up:', formData);
      if (onLogin) onLogin();
    } else {
      console.log('Sign In:', { email: formData.email, password: formData.password });
      if (onLogin) onLogin();
    }
  };

  return (
    <div className="login-container">
      {/* Background */}
      <div className="login-background">
        <div className="login-grid"></div>
        <div className="login-orb login-orb-1"></div>
        <div className="login-orb login-orb-2"></div>
        <div className="login-orb login-orb-3"></div>
      </div>

      {/* Content */}
      <div className="login-content">
        {/* Login Card */}
        <div className="login-card">
          {/* Header */}
          <div className="login-header">
            <div className="login-brand">
              <div className="login-logo">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
                </svg>
              </div>
              <h1 className="login-title">CyberisAI</h1>
            </div>
            <p className="login-subtitle">
              {isSignUp ? 'Create your account to get started' : 'Welcome back! Please sign in to continue'}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="login-tabs">
            <button 
              type="button"
              className={`login-tab ${!isSignUp ? 'login-tab-active' : ''}`}
              onClick={() => setIsSignUp(false)}
            >
              Sign In
            </button>
            <button 
              type="button"
              className={`login-tab ${isSignUp ? 'login-tab-active' : ''}`}
              onClick={() => setIsSignUp(true)}
            >
              Sign Up
            </button>
            <div className={`login-tab-indicator ${isSignUp ? 'login-tab-indicator-right' : ''}`}></div>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-field">
                <label htmlFor="fullName" className="form-label">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  className="form-input"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required={isSignUp}
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            {isSignUp && (
              <div className="form-field">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={isSignUp}
                />
              </div>
            )}

            {!isSignUp && (
              <div className="form-forgot">
                <a href="#forgot" className="form-forgot-link">Forgot Password?</a>
              </div>
            )}

            <button type="submit" className="form-submit">
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <svg className="form-submit-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>
          </form>

          <div className="login-footer">
            <a href="#home" className="login-back-link">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/>
              </svg>
              Back to Home
            </a>
          </div>
        </div>

        {/* Side Panel */}
        <div className="login-side-panel">
          <div className="login-features">
            <h2 className="login-features-title">Intelligent Surveillance</h2>
            <p className="login-features-description">
              Advanced AI-powered security monitoring with real-time threat detection, 
              behavioral analysis, and instant alerts.
            </p>
            <div className="login-features-list">
              {['Real-time Object Detection', 'Pose Estimation Analysis', 'Behavioral Pattern Recognition', 'Instant Alert Notifications'].map((feature, index) => (
                <div key={index} className="login-feature-item" style={{animationDelay: `${0.2 + index * 0.1}s`}}>
                  <div className="login-feature-icon">✓</div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;