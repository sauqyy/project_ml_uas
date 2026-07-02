import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import untitledDesign from '../assets/untitled-design.svg';

const DEMO_EMAIL = 'demo@moneymind.com';
const DEMO_PASSWORD = 'demo123';

export default function LoginPage({ onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    setTimeout(() => {
      // 1. Check against Demo Account
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        localStorage.setItem('moneymind_session', JSON.stringify({
          email: DEMO_EMAIL,
          name: 'Demo User',
          loggedInAt: new Date().toISOString(),
        }));
        onLogin();
        setIsLoading(false);
        return;
      }

      // 2. Check against Registered Users in localStorage
      const registeredUsers = JSON.parse(localStorage.getItem('moneymind_users') || '[]');
      const user = registeredUsers.find(
        (u) => (u.email === email || u.username === email) && u.password === password
      );

      if (user) {
        localStorage.setItem('moneymind_session', JSON.stringify({
          email: user.email,
          name: user.username,
          loggedInAt: new Date().toISOString(),
        }));
        onLogin();
      } else {
        setError('Email/Username atau password salah. Coba lagi! 🔒');
      }
      setIsLoading(false);
    }, 600);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok! ❌');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter! 🔑');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const registeredUsers = JSON.parse(localStorage.getItem('moneymind_users') || '[]');
      
      // Check if email already registered
      if (registeredUsers.some((u) => u.email === email)) {
        setError('Email sudah terdaftar! Gunakan email lain. 📧');
        setIsLoading(false);
        return;
      }

      // Check if username already registered
      if (registeredUsers.some((u) => u.username === username)) {
        setError('Username sudah digunakan! Pilih username lain. 👤');
        setIsLoading(false);
        return;
      }

      // Save new user
      const newUser = { username, email, password };
      registeredUsers.push(newUser);
      localStorage.setItem('moneymind_users', JSON.stringify(registeredUsers));

      setSuccess('Registrasi berhasil! Silakan masuk ke akun Anda. 🎉');
      
      // Reset form fields
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Switch to login tab after success
      setTimeout(() => {
        setIsLogin(true);
        setSuccess('');
      }, 1500);

      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="login-page">
      {/* Left Panel — Branding and Showcase SVG */}
      <div className="login-brand-panel">
        <img 
          src={untitledDesign} 
          alt="Money Mind Showcase" 
          className="login-showcase-svg" 
        />
      </div>

      {/* Right Panel — Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          
          {/* Auth Capsule Switch */}
          <div className="auth-switch-container">
            <div className="auth-switch">
              <button 
                type="button"
                className={`auth-switch-btn ${isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                  setSuccess('');
                }}
              >
                Log In
              </button>
              <button 
                type="button"
                className={`auth-switch-btn ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  setSuccess('');
                }}
              >
                Register
              </button>
            </div>
          </div>

          {/* Form Header */}
          <div className="login-form-header">
            {isLogin ? (
              <>
                <h2>Nice to see you again!</h2>
                <p>Sign in to your account</p>
              </>
            ) : (
              <>
                <h2>Create your account!</h2>
                <p>Start tracking your finance with AI</p>
              </>
            )}
          </div>

          {/* Error and Success Alerts */}
          {error && (
            <div className="auth-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="auth-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Forms */}
          {isLogin ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="auth-input-wrapper">
                <User size={20} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Username or Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-input-icon" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="button" className="auth-forgot-password" onClick={() => alert('Fitur reset password belum diaktifkan secara lokal.')}>
                Forgot password?
              </button>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="login-form">
              <div className="auth-input-wrapper">
                <User size={20} className="auth-input-icon" />
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="auth-input-wrapper">
                <Mail size={20} className="auth-input-icon" />
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-input-icon" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-input-icon" />
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Register'}
              </button>
            </form>
          )}

          {/* Back Link */}
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button className="login-back-link" onClick={() => onNavigate('home')}>
              <ArrowLeft size={16} />
              Kembali ke Homepage
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
