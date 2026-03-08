import React, { useState, useEffect } from 'react';
import '../styles/Login.css';

const API_URL = 'http://localhost:8000';

const Login = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [view, setView] = useState('auth');         // 'auth' | 'forgot' | 'reset' | 'reset-success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  // Check URL for reset_token on mount (from email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token');
    if (resetToken) {
      setFormData(prev => ({ ...prev, resetToken }));
      setView('reset');
      // Clean the URL so the token isn't visible
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
    if (successMsg) setSuccessMsg('');
  };

  // ── Sign In / Sign Up submit ──────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Sign up failed');

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onLogin) onLogin(data.user);
      } else {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (onLogin) onLogin(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password submit ────────────────────────────────────
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send reset email');

      setSuccessMsg(data.message || 'If an account with that email exists, a reset link has been sent.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset password submit ─────────────────────────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.resetToken,
          new_password: formData.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');

      setView('reset-success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render: Forgot Password View ──────────────────────────────
  const renderForgotView = () => (
    <>
      <div className="login-header">
        <div className="login-brand">
          <div className="login-logo">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="login-title">CyberisAI</h1>
        </div>
        <p className="login-subtitle">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="login-form" onSubmit={handleForgotSubmit}>
        {error && (
          <div className="form-error">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="form-success">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            type="email"
            id="forgot-email"
            name="email"
            className="form-input"
            placeholder="Enter your registered email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <button type="submit" className="form-submit" disabled={loading}>
          {loading ? (
            <span className="form-submit-loading">Sending...</span>
          ) : (
            <>
              <svg className="form-submit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Send Reset Link</span>
            </>
          )}
        </button>
      </form>

      <div className="login-footer">
        <button
          type="button"
          className="login-back-link"
          onClick={() => { setView('auth'); setError(''); setSuccessMsg(''); }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Sign In
        </button>
      </div>
    </>
  );

  // ── Render: Reset Password View ───────────────────────────────
  const renderResetView = () => (
    <>
      <div className="login-header">
        <div className="login-brand">
          <div className="login-logo">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="login-title">CyberisAI</h1>
        </div>
        <p className="login-subtitle">Choose a new password for your account.</p>
      </div>

      <form className="login-form" onSubmit={handleResetSubmit}>
        {error && (
          <div className="form-error">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="newPassword" className="form-label">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            className="form-input"
            placeholder="Enter new password (min 6 characters)"
            value={formData.newPassword}
            onChange={handleInputChange}
            required
            minLength={6}
          />
        </div>

        <div className="form-field">
          <label htmlFor="confirmNewPassword" className="form-label">Confirm New Password</label>
          <input
            type="password"
            id="confirmNewPassword"
            name="confirmNewPassword"
            className="form-input"
            placeholder="Confirm your new password"
            value={formData.confirmNewPassword}
            onChange={handleInputChange}
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="form-submit" disabled={loading}>
          {loading ? (
            <span className="form-submit-loading">Resetting...</span>
          ) : (
            <>
              <span>Reset Password</span>
              <svg className="form-submit-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="login-footer">
        <button
          type="button"
          className="login-back-link"
          onClick={() => { setView('auth'); setError(''); }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Sign In
        </button>
      </div>
    </>
  );

  // ── Render: Reset Success View ────────────────────────────────
  const renderResetSuccessView = () => (
    <>
      <div className="login-header" style={{ textAlign: 'center' }}>
        <div className="reset-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="login-title" style={{ marginTop: '16px' }}>Password Reset!</h1>
        <p className="login-subtitle" style={{ marginTop: '12px' }}>
          Your password has been successfully updated. You can now sign in with your new password.
        </p>
      </div>

      <button
        type="button"
        className="form-submit"
        onClick={() => { setView('auth'); setError(''); setSuccessMsg(''); setFormData(prev => ({ ...prev, password: '', newPassword: '', confirmNewPassword: '' })); }}
      >
        <span>Go to Sign In</span>
        <svg className="form-submit-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </>
  );

  // ── Render: Auth (Sign In / Sign Up) View ─────────────────────
  const renderAuthView = () => (
    <>
      <div className="login-header">
        <div className="login-brand">
          <div className="login-logo">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor" />
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
        {error && (
          <div className="form-error">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
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
            <button
              type="button"
              className="form-forgot-link"
              onClick={() => { setView('forgot'); setError(''); setSuccessMsg(''); }}
            >
              Forgot Password?
            </button>
          </div>
        )}

        <button type="submit" className="form-submit" disabled={loading}>
          {loading ? (
            <span className="form-submit-loading">Processing...</span>
          ) : (
            <>
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <svg className="form-submit-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>
      </form>

      <div className="login-footer">
        <a href="#home" className="login-back-link">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </a>
      </div>
    </>
  );

  // ── Decide which card content to render ────────────────────────
  const renderCardContent = () => {
    switch (view) {
      case 'forgot':
        return renderForgotView();
      case 'reset':
        return renderResetView();
      case 'reset-success':
        return renderResetSuccessView();
      default:
        return renderAuthView();
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
          {renderCardContent()}
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
                <div key={index} className="login-feature-item" style={{ animationDelay: `${0.2 + index * 0.1}s` }}>
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