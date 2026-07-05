import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, AlertCircle, CheckCircle2, ChevronRight, Zap, Shield, Sparkles } from 'lucide-react';
import logoPng from '../assets/logo.png';

export default function LoginPage({ onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid Email/Username or password. Try again! 🔒');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('moneymind_session', JSON.stringify({
        email: data.user.email,
        name: data.user.username,
        avatar: data.user.avatar || null,
        loggedInAt: new Date().toISOString(),
      }));
      onLogin();
    } catch {
      setError('Unable to connect to server. Try again. 🌐');
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match! ❌');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters! 🔑');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Try again.');
        setIsLoading(false);
        return;
      }

      setSuccess('Registration successful! Please log in to your account. 🎉');

      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setIsLogin(true);
        setSuccess('');
      }, 1500);

      setIsLoading(false);
    } catch {
      setError('Unable to connect to server. Try again. 🌐');
      setIsLoading(false);
    }
  };

  // Inline styles to avoid conflicts with custom CSS utilities in index.css
  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#06030F',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    },
    bgGlow1: {
      position: 'absolute',
      top: 0,
      left: '25%',
      width: '800px',
      height: '800px',
      backgroundColor: 'rgba(88, 28, 135, 0.2)',
      borderRadius: '50%',
      filter: 'blur(120px)',
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    },
    bgGlow2: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: '600px',
      height: '600px',
      backgroundColor: 'rgba(234, 88, 12, 0.1)',
      borderRadius: '50%',
      filter: 'blur(150px)',
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    },
    bgGlow3: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(45deg)',
      width: '1000px',
      height: '400px',
      backgroundColor: 'rgba(219, 39, 119, 0.1)',
      borderRadius: '100%',
      filter: 'blur(120px)',
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    },
    nav: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.25rem 2.5rem',
      width: '100%',
      position: 'relative',
      zIndex: 20,
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      backgroundColor: 'rgba(10, 10, 26, 0.7)',
      backdropFilter: 'blur(20px)',
    },
    logoWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      cursor: 'pointer',
    },
    logoIcon: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #fb923c, #ec4899, #9333ea)',
      borderRadius: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '1.125rem',
      boxShadow: '0 0 20px rgba(236, 72, 153, 0.3)',
    },
    logoText: {
      fontWeight: 800,
      fontSize: '1.35rem',
      letterSpacing: '-0.03em',
      color: 'white',
    },
    backBtn: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: '#9ca3af',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'color 0.2s',
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '1400px',
      width: '100%',
      margin: '0 auto',
      padding: '3rem 2rem',
      gap: '5rem',
      position: 'relative',
      zIndex: 10,
    },
    leftCol: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      width: '100%',
      position: 'relative',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      borderRadius: '9999px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      marginBottom: '2rem',
      boxShadow: '0 0 30px rgba(168, 85, 247, 0.15)',
    },
    badgeText: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: '#d1d5db',
      textTransform: 'uppercase',
    },
    h1: {
      fontSize: 'clamp(3rem, 5vw, 5rem)',
      fontWeight: 900,
      lineHeight: 1.05,
      letterSpacing: '-0.05em',
      marginBottom: '2rem',
      color: 'white',
    },
    h1Gradient: {
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      backgroundImage: 'linear-gradient(to right, #fb923c, #ec4899, #a855f7)',
    },
    desc: {
      color: '#9ca3af',
      fontSize: '1.25rem',
      maxWidth: '32rem',
      lineHeight: 1.7,
      marginBottom: '2.5rem',
      fontWeight: 300,
    },
    featureRow: {
      display: 'flex',
      flexDirection: 'row',
      gap: '1rem',
      marginBottom: '3rem',
      width: '100%',
    },
    featureCard: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      color: '#d1d5db',
      backgroundColor: 'rgba(255,255,255,0.05)',
      padding: '1rem',
      borderRadius: '1rem',
      border: '1px solid rgba(255,255,255,0.05)',
      backdropFilter: 'blur(4px)',
      cursor: 'default',
      transition: 'background-color 0.2s',
    },
    featureIconPurple: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: 'rgba(168, 85, 247, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c084fc',
      flexShrink: 0,
    },
    featureIconOrange: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: 'rgba(249, 115, 22, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fb923c',
      flexShrink: 0,
    },
    featureTitle: {
      fontWeight: 600,
      color: 'white',
      fontSize: '0.875rem',
    },
    featureDesc: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      marginTop: '0.25rem',
    },
    rightCol: {
      flex: 1,
      width: '100%',
      maxWidth: '460px',
      perspective: '1000px',
    },
    card: {
      backgroundColor: 'rgba(18, 11, 41, 0.6)',
      backdropFilter: 'blur(40px)',
      border: '1px solid rgba(168, 85, 247, 0.2)',
      padding: '2.5rem',
      borderRadius: '2rem',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.5s, box-shadow 0.5s',
    },
    cardGlow1: {
      position: 'absolute',
      top: '-5rem',
      right: '-5rem',
      width: '16rem',
      height: '16rem',
      backgroundColor: 'rgba(236, 72, 153, 0.2)',
      filter: 'blur(80px)',
      borderRadius: '50%',
      pointerEvents: 'none',
    },
    cardGlow2: {
      position: 'absolute',
      bottom: '-5rem',
      left: '-5rem',
      width: '16rem',
      height: '16rem',
      backgroundColor: 'rgba(147, 51, 234, 0.2)',
      filter: 'blur(80px)',
      borderRadius: '50%',
      pointerEvents: 'none',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2.5rem',
      position: 'relative',
      zIndex: 10,
    },
    cardTitle: {
      fontSize: '1.875rem',
      fontWeight: 700,
      color: 'white',
      letterSpacing: '-0.025em',
    },
    toggleWrap: {
      display: 'flex',
      backgroundColor: 'rgba(6, 3, 15, 0.8)',
      borderRadius: '9999px',
      padding: '4px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
    },
    toggleActive: {
      padding: '0.5rem 1.25rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      transition: 'all 0.2s',
      border: 'none',
      cursor: 'pointer',
      background: 'linear-gradient(to right, #9333ea, #ec4899)',
      color: 'white',
      boxShadow: '0 10px 15px rgba(236, 72, 153, 0.25)',
    },
    toggleInactive: {
      padding: '0.5rem 1.25rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      transition: 'all 0.2s',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: '#9ca3af',
    },
    alertError: {
      marginBottom: '1.5rem',
      padding: '1rem',
      borderRadius: '1rem',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#f87171',
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    alertSuccess: {
      marginBottom: '1.5rem',
      padding: '1rem',
      borderRadius: '1rem',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#34d399',
      fontSize: '0.875rem',
      fontWeight: 500,
    },
    formGroup: {
      position: 'relative',
      zIndex: 10,
    },
    label: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: 'rgba(196, 181, 253, 0.7)',
      marginLeft: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '6px',
    },
    inputWrap: {
      position: 'relative',
      marginBottom: '1.25rem',
    },
    inputIcon: {
      position: 'absolute',
      left: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#6b7280',
      transition: 'color 0.2s',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      backgroundColor: 'rgba(6, 3, 15, 0.5)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '1rem',
      padding: '1rem 1rem 1rem 3rem',
      fontSize: '0.875rem',
      color: 'white',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      boxSizing: 'border-box',
    },
    forgotBtn: {
      fontSize: '0.75rem',
      fontWeight: 500,
      color: '#f472b6',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s',
    },
    labelRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginLeft: '4px',
      marginBottom: '6px',
    },
    submitBtn: {
      width: '100%',
      marginTop: '2rem',
      backgroundColor: 'white',
      color: '#0A061E',
      fontWeight: 700,
      fontSize: '0.875rem',
      padding: '1rem',
      borderRadius: '1rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 0 20px rgba(255,255,255,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
    submitBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.page}>
      
      {/* Abstract Animated Background */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />
      <div style={styles.bgGlow3} />

      {/* Modern Navbar */}
      <nav style={styles.nav}>
        <div style={styles.logoWrap} onClick={() => onNavigate('home')}>
          <img
            src={logoPng}
            alt="Money Mind Logo"
            style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={styles.logoText}>moneymind</span>
        </div>

        <div>
          <button
            type="button"
            style={styles.backBtn}
            onClick={() => onNavigate('home')}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={styles.main}>
        
        {/* Left Copy - Creative Layout */}
        <div style={styles.leftCol}>
          
          {/* Glowing Badge */}
          <div style={styles.badge}>
            <Zap size={14} color="#fb923c" />
            <span style={styles.badgeText}>Next-Gen Financial Intelligence</span>
          </div>

          <h1 style={styles.h1}>
            <span style={{ color: 'white' }}>Spot Patterns.</span><br />
            <span style={styles.h1Gradient}>
              Master Your Future.
            </span>
          </h1>

          <p style={styles.desc}>
            A <strong>Machine Learning</strong> powered financial platform. We analyze your spending habits to provide personalized insights and predictions.
          </p>

          {/* Feature List */}
          <div style={styles.featureRow}>
            <div
              style={styles.featureCard}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            >
              <div style={styles.featureIconPurple}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={styles.featureTitle}>Auto-Analysis</h3>
                <p style={styles.featureDesc}>Instant transaction categorization with AI</p>
              </div>
            </div>
            
            <div
              style={styles.featureCard}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            >
              <div style={styles.featureIconOrange}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={styles.featureTitle}>Privacy Guaranteed</h3>
                <p style={styles.featureDesc}>Your data is encrypted and 100% confidential</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card - Floating Glassmorphism */}
        <div style={styles.rightCol}>
          <div
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 30px 60px rgba(168, 85, 247, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.5)';
            }}
          >
            
            {/* Inner Glows */}
            <div style={styles.cardGlow1} />
            <div style={styles.cardGlow2} />
            
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>
                {isLogin ? 'Log In' : 'Sign Up'}
              </h2>
              <div style={styles.toggleWrap}>
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                  style={isLogin ? styles.toggleActive : styles.toggleInactive}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                  style={!isLogin ? styles.toggleActive : styles.toggleInactive}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {error && (
              <div style={styles.alertError}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            {success && (
              <div style={styles.alertSuccess}>
                <CheckCircle2 size={18} /> {success}
              </div>
            )}

            <div style={styles.formGroup}>
              {isLogin ? (
                <form onSubmit={handleLoginSubmit}>
                  <div>
                    <label style={styles.label}>Email / Username</label>
                    <div style={styles.inputWrap}>
                      <User size={18} style={styles.inputIcon} />
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="demo@moneymind.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                          e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={styles.labelRow}>
                      <label style={{ ...styles.label, marginBottom: 0 }}>Password</label>
                      <button type="button" style={styles.forgotBtn}>
                        Forgot?
                      </button>
                    </div>
                    <div style={styles.inputWrap}>
                      <Lock size={18} style={styles.inputIcon} />
                      <input
                        type="password"
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        onFocus={(e) => {
                          e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                          e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                          e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      ...styles.submitBtn,
                      ...(isLoading ? styles.submitBtnDisabled : {}),
                    }}
                    onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.backgroundColor = '#e5e7eb'; e.currentTarget.style.transform = 'scale(1.02)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isLoading ? 'Processing...' : 'Go to Dashboard'}
                    {!isLoading && <ChevronRight size={18} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit}>
                  <div style={styles.inputWrap}>
                    <User size={18} style={styles.inputIcon} />
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                        e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    />
                  </div>

                  <div style={styles.inputWrap}>
                    <Mail size={18} style={styles.inputIcon} />
                    <input
                      type="email"
                      style={styles.input}
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                        e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    />
                  </div>

                  <div style={styles.inputWrap}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input
                      type="password"
                      style={styles.input}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                        e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    />
                  </div>

                  <div style={styles.inputWrap}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input
                      type="password"
                      style={styles.input}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                        e.target.style.boxShadow = '0 0 0 1px rgba(236, 72, 153, 0.5), inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      ...styles.submitBtn,
                      marginTop: '1.5rem',
                      ...(isLoading ? styles.submitBtnDisabled : {}),
                    }}
                    onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.backgroundColor = '#e5e7eb'; e.currentTarget.style.transform = 'scale(1.02)'; }}}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isLoading ? 'Creating account...' : 'Get Started'}
                    {!isLoading && <ChevronRight size={18} />}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
