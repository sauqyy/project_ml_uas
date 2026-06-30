import React, { useState } from 'react';
import { Wallet, Mail, Lock, ArrowLeft, AlertCircle, Brain, TrendingUp, Shield } from 'lucide-react';

const DEMO_EMAIL = 'demo@moneymind.com';
const DEMO_PASSWORD = 'demo123';

export default function LoginPage({ onLogin, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate a short delay for UX
    setTimeout(() => {
      if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        localStorage.setItem('moneymind_session', JSON.stringify({
          email: DEMO_EMAIL,
          name: 'Demo User',
          loggedInAt: new Date().toISOString(),
        }));
        onLogin();
      } else {
        setError('Email atau password salah. Coba lagi! 🔒');
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="login-page">
      {/* Left Panel — Branding */}
      <div className="login-brand-panel">
        <div className="login-brand-shapes">
          <div className="floating-shape" />
          <div className="floating-shape" />
          <div className="floating-shape" />
        </div>

        <div className="login-brand-content">
          <div className="login-brand-logo">
            <Wallet size={36} color="#fff" />
          </div>
          <h1>Money Mind</h1>
          <p>AI-powered finance tracker yang bikin kamu makin smart soal uang 💜</p>

          <div className="login-brand-features">
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon">
                <Brain size={18} color="#a5b4fc" />
              </div>
              AI Anomaly Detection
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon">
                <TrendingUp size={18} color="#c4b5fd" />
              </div>
              Financial Forecasting
            </div>
            <div className="login-brand-feature">
              <div className="login-brand-feature-icon">
                <Shield size={18} color="#f9a8d4" />
              </div>
              Smart Categorization
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Welcome back! 👋</h2>
            <p>Masuk ke akun kamu untuk lanjut tracking</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error" key={error}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="login-input-group">
              <input
                type="email"
                className="login-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Mail size={18} className="login-input-icon" />
            </div>

            <div className="login-input-group">
              <input
                type="password"
                className="login-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <Lock size={18} className="login-input-icon" />
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In 🚀'}
            </button>
          </form>

          <div className="login-divider">Demo Account</div>

          <div className="login-demo-hint">
            <p>Email: <code>{DEMO_EMAIL}</code></p>
            <p>Password: <code>{DEMO_PASSWORD}</code></p>
          </div>

          <button className="login-back-link" onClick={() => onNavigate('home')}>
            <ArrowLeft size={16} />
            Kembali ke Homepage
          </button>
        </div>
      </div>
    </div>
  );
}
