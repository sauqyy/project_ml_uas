import React, { useState } from 'react';
import { ArrowRight, Star, Sparkles, BookOpen, BarChart2, Shield, Heart } from 'lucide-react';
import logoPng from '../assets/logo.png';

export default function HomePage({ onNavigate }) {
  const [toggleActive, setToggleActive] = useState('simpan');

  // Chart configuration based on active tab
  const isSavings = toggleActive === 'simpan';
  const strokeColor = isSavings ? '#2dd4bf' : '#8b5cf6';
  const fillGradient = isSavings ? 'url(#cyan-gradient)' : 'url(#purple-gradient)';
  
  // Savings Curve (Rising toward June)
  const savingsPath = "M 0 100 C 50 90, 100 115, 150 95 C 200 75, 250 85, 300 70 C 350 55, 400 65, 400 65";
  const savingsDots = [
    { cx: 300, cy: 70 },
    { cx: 400, cy: 65 }
  ];

  // Spending Curve (High, flat, dipping in June - as in the user's second screenshot)
  const spendingPath = "M 0 45 C 50 48, 100 46, 150 50 C 200 52, 250 44, 300 38 C 350 40, 400 55, 400 55";
  const spendingDots = [
    { cx: 300, cy: 38 },
    { cx: 400, cy: 55 }
  ];

  const activePath = isSavings ? savingsPath : spendingPath;
  const activeDots = isSavings ? savingsDots : spendingDots;

  return (
    <div className="homepage">
      {/* Navbar */}
      <nav className="home-nav">
        <div className="home-nav-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
          <img src={logoPng} alt="Money Mind Logo" style={{ width: '32px', height: '32px', borderRadius: '6px' }} />
          moneymind
        </div>
        
        <div className="home-nav-menu">
          <a href="#features" className="menu-item-link">Features</a>
          <a href="#how-it-works" className="menu-item-link">How It Works</a>
          <a href="#testimonials" className="menu-item-link">Testimonials</a>
          
        </div>

        <div className="home-nav-links">
          <button className="home-nav-link" onClick={() => onNavigate('login')}>
            Log in
          </button>
          <button className="home-nav-link primary" onClick={() => onNavigate('login')}>
            Try Free →
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-bg-gradient" />
        <div className="hero-floating-shapes">
          <div className="floating-shape" />
          <div className="floating-shape" />
          <div className="floating-shape" />
          <div className="floating-shape" />
        </div>

        <div className="hero-grid-layout">
          {/* Hero Left Content */}
          <div className="hero-left-content">
            <div className="hero-badge">
              <Sparkles size={14} style={{ marginRight: '6px', color: '#a855f7' }} />
              12,400+ active users in Malaysia
            </div>

            <h1 className="hero-title">
              Your money.<br />
              <span className="gradient-text">Your mindset.</span><br />
              Your life.
            </h1>

            <p className="hero-subtitle-custom">
              Money Mind isn't just a tracker. It's a space for you to be honest with yourself — understand why you spend, what you value, and how to align your money with the life you want.
            </p>

            <div className="hero-cta-group-custom">
              <button className="btn-glow-custom" onClick={() => onNavigate('login')}>
                Get Started — Free →
              </button>
              <button className="btn-ghost-custom" onClick={() => onNavigate('login')}>
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="hero-social-proof">
              <div className="proof-item">
                <span className="proof-bold">Rp 0</span>
                <span className="proof-label">to start</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <span className="proof-bold">100%</span>
                <span className="proof-label">private</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <span className="proof-bold">4.9 ★</span>
                <span className="proof-label">rating</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-avatars-container">
                <div className="proof-avatars">
                  <div className="avatar-img-mock" style={{ backgroundColor: '#6366f1' }}>A</div>
                  <div className="avatar-img-mock" style={{ backgroundColor: '#10b981', marginLeft: '-8px' }}>D</div>
                  <div className="avatar-img-mock" style={{ backgroundColor: '#ec4899', marginLeft: '-8px' }}>N</div>
                </div>
                <span className="proof-users-count">+12k users</span>
              </div>
            </div>
          </div>

          {/* Hero Right Dashboard Mockup */}
          <div className="hero-right-dashboard">
            <div className="dashboard-mockup-card">
              <div className="mockup-card-header">
                <div className="header-left">
                  <span className="mockup-date">Jun 2026</span>
                  <h3 className="mockup-title">Your dashboard</h3>
                </div>
                <div className="header-toggle-pills">
                  <button 
                    className={`toggle-pill ${toggleActive === 'belanja' ? 'active' : ''}`}
                    onClick={() => setToggleActive('belanja')}
                  >
                    Spending
                  </button>
                  <button 
                    className={`toggle-pill ${toggleActive === 'simpan' ? 'active' : ''}`}
                    onClick={() => setToggleActive('simpan')}
                  >
                    Savings
                  </button>
                </div>
              </div>

              {/* Smooth Interactive Chart SVG */}
              <div className="mockup-chart-container">
                <svg viewBox="0 0 400 150" className="mockup-svg-chart">
                  <defs>
                    <linearGradient id="cyan-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="purple-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                  
                  {/* Area Fill */}
                  <path 
                    d={`${activePath} L 400 150 L 0 150 Z`} 
                    fill={fillGradient} 
                    style={{ transition: 'd 0.35s ease' }}
                  />
                  
                  {/* Line stroke */}
                  <path 
                    d={activePath} 
                    fill="none" 
                    stroke={strokeColor} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    style={{ transition: 'd 0.35s ease, stroke 0.35s ease' }}
                  />

                  {/* Highlight dots */}
                  {activeDots.map((dot, index) => (
                    <circle 
                      key={index} 
                      cx={dot.cx} 
                      cy={dot.cy} 
                      r="4" 
                      fill={strokeColor}
                      style={{ transition: 'cx 0.35s ease, cy 0.35s ease, fill 0.35s ease' }}
                    />
                  ))}
                </svg>
                
                <div className="chart-x-labels">
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>

              {/* Lower Cards Grid */}
              <div className="mockup-stats-grid">
                <div className="mockup-stat-card">
                  <span className="stat-card-label">Spending</span>
                  <div className="stat-card-value">Rp 1,850,000</div>
                  <span className="stat-card-trend negative">-9%</span>
                </div>
                
                <div className="mockup-stat-card">
                  <span className="stat-card-label">Savings</span>
                  <div className="stat-card-value">Rp 1,050,000</div>
                  <span className="stat-card-trend positive">+28%</span>
                </div>

                <div className="mockup-stat-card">
                  <span className="stat-card-label">Target</span>
                  <div className="stat-card-value">87%</div>
                  <span className="stat-card-trend neutral">on track</span>
                </div>
              </div>

              {/* Toast card */}
              <div className="mockup-toast-card">
                <div className="toast-emoji-container">
                  <span role="img" aria-label="proud" className="toast-emoji">🥺</span>
                </div>
                <div className="toast-content-wrapper">
                  <div className="toast-header-info">
                    <span className="toast-title-text">Today's entry</span>
                    <span className="toast-badge-pill">Proud</span>
                  </div>
                  <p className="toast-text-paragraph">
                    "First time in history successfully saving Rp600,000 a month. Feels like unlocking an achievement..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="features-grid-section" id="features">
        <div className="section-header-centered">
          <div className="features-section-badge">
            <Sparkles size={12} style={{ marginRight: '4px' }} /> Features
          </div>
          <h2 className="section-title-large">
            Everything you need,<br />
            <span className="gradient-text">nothing you don't.</span>
          </h2>
          <p className="section-subtitle-centered">
            Designed for people who want to manage their money without feeling like they are auditing their taxes.
          </p>
        </div>

        <div className="features-2x2-grid">
          {/* Card 1 */}
          <div className="feature-grid-card border-indigo-glow">
            <div className="feature-grid-icon-circle indigo">
              <BookOpen size={24} />
            </div>
            <h3 className="feature-grid-title">Feel-good journaling</h3>
            <p className="feature-grid-desc">
              Log more than just numbers — write your feelings. Why did you buy? How did you feel? Self-insights are more powerful than any advisor.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-grid-card border-teal-glow">
            <div className="feature-grid-icon-circle teal">
              <BarChart2 size={24} />
            </div>
            <h3 className="feature-grid-title">Visualizations that pop</h3>
            <p className="feature-grid-desc">
              Your financial data turned into beautiful charts. Know where your money goes at a glance. No more spreadsheet anxiety.
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-grid-card border-violet-glow">
            <div className="feature-grid-icon-circle violet">
              <Sparkles size={24} />
            </div>
            <h3 className="feature-grid-title">AI-powered reflections</h3>
            <p className="feature-grid-desc">
              Get tailored reflection questions weekly based on your habits. Like a free, non-judgmental life coach.
            </p>
          </div>

          {/* Card 4 */}
          <div className="feature-grid-card border-green-glow">
            <div className="feature-grid-icon-circle green">
              <Shield size={24} />
            </div>
            <h3 className="feature-grid-title">Privacy-first, forever</h3>
            <p className="feature-grid-desc">
              Your data is encrypted and stored on-device. We don't sell your data, we don't track you, no ads. That's the deal.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section-custom" id="testimonials">
        <div className="section-header-centered">
          <div className="features-section-badge">
            <Star size={12} style={{ marginRight: '4px' }} /> Real Talk
          </div>
          <h2 className="section-title-large">
            They've felt it. <span className="gradient-text">When's your turn?</span>
          </h2>
        </div>

        <div className="testimonials-3-cards-row">
          {/* Card 1 */}
          <div className="testimonial-card-item">
            <div className="testimonial-stars">
              <Star size={14} fill="#a855f7" stroke="none" />
              <Star size={14} fill="#a855f7" stroke="none" />
              <Star size={14} fill="#a855f7" stroke="none" />
              <Star size={14} fill="#a855f7" stroke="none" />
              <Star size={14} fill="#a855f7" stroke="none" />
            </div>
            <p className="testimonial-card-text">
              "Seriously this app changed my relationship with money. I actually look forward to journaling now 😭"
            </p>
            <div className="testimonial-author-wrapper">
              <div className="author-avatar-initials" style={{ backgroundColor: '#a855f7' }}>A</div>
              <div className="author-details-info">
                <span className="author-name-text">Aisyah R.</span>
                <span className="author-handle-text">@aisyah_kl</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="testimonial-card-item">
            <div className="testimonial-stars">
              <Star size={14} fill="#06b6d4" stroke="none" />
              <Star size={14} fill="#06b6d4" stroke="none" />
              <Star size={14} fill="#06b6d4" stroke="none" />
              <Star size={14} fill="#06b6d4" stroke="none" />
              <Star size={14} fill="#06b6d4" stroke="none" />
            </div>
            <p className="testimonial-card-text">
              "The charts hit different when you see how much you spend on Grab. Makes me want to cook for myself lol"
            </p>
            <div className="testimonial-author-wrapper">
              <div className="author-avatar-initials" style={{ backgroundColor: '#06b6d4' }}>D</div>
              <div className="author-details-info">
                <span className="author-name-text">Daniel L.</span>
                <span className="author-handle-text">@danlimm</span>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="testimonial-card-item">
            <div className="testimonial-stars">
              <Star size={14} fill="#ec4899" stroke="none" />
              <Star size={14} fill="#ec4899" stroke="none" />
              <Star size={14} fill="#ec4899" stroke="none" />
              <Star size={14} fill="#ec4899" stroke="none" />
              <Star size={14} fill="#ec4899" stroke="none" />
            </div>
            <p className="testimonial-card-text">
              "Finally an app that feels like a safe space rather than a bank portal. 10/10 would recommend"
            </p>
            <div className="testimonial-author-wrapper">
              <div className="author-avatar-initials" style={{ backgroundColor: '#ec4899' }}>N</div>
              <div className="author-details-info">
                <span className="author-name-text">Nurul H.</span>
                <span className="author-handle-text">@nurulhana</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Hero Section / Tulis Jujur */}
      <section className="secondary-hero-section" id="how-it-works">
        <div className="secondary-hero-container">
          {/* Left info */}
          <div className="secondary-hero-left">
            <div className="features-section-badge" style={{ alignSelf: 'flex-start' }}>
              <BookOpen size={12} style={{ marginRight: '4px' }} /> Your Journal
            </div>
            <h2 className="section-title-large" style={{ textAlign: 'left' }}>
              Write honestly.<br />
              <span className="gradient-text">Grow faster.</span>
            </h2>
            <p className="secondary-hero-subtitle">
              Every entry is one step closer to understanding yourself. It's not about being perfect — it's about being more aware.
            </p>
            <button className="btn-glow-custom" style={{ marginTop: '1.5rem', width: 'fit-content' }} onClick={() => onNavigate('login')}>
              Try Journaling Now →
            </button>
          </div>

          {/* Right Cards list */}
          <div className="secondary-hero-right-entries">
            {/* Card 1 */}
            <div className="journal-entry-card-mockup">
              <div className="entry-card-mockup-header">
                <div className="mockup-header-left">
                  <span className="entry-mockup-time">Today, 11:30 PM</span>
                  <span className="entry-mockup-mood error">Shocked</span>
                </div>
                <div className="entry-mockup-money">
                  <span className="entry-mockup-amount negative">Rp 420,000</span>
                  <span className="entry-mockup-category-tag">Shopping</span>
                </div>
              </div>
              <p className="entry-card-mockup-body">
                "Just checked statement — spent Rp420,000 on online shopping this month. All the small things that looked cheap while scrolling... <span role="img" aria-label="shocked">😱</span>"
              </p>
            </div>

            {/* Card 2 */}
            <div className="journal-entry-card-mockup">
              <div className="entry-card-mockup-header">
                <div className="mockup-header-left">
                  <span className="entry-mockup-time">Yesterday, 9:15 PM</span>
                  <span className="entry-mockup-mood success">Proud</span>
                </div>
                <div className="entry-mockup-money">
                  <span className="entry-mockup-amount positive">Rp 600,000</span>
                  <span className="entry-mockup-category-tag">Savings</span>
                </div>
              </div>
              <p className="entry-card-mockup-body">
                "Successfully saved Rp600,000 this month for the first time. Feels like I finally unlocked an achievement that was pending forever. <span role="img" aria-label="proud">🥺</span>"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section className="three-steps-section">
        <div className="section-header-centered">
          <div className="features-section-badge">
            <ArrowRight size={12} style={{ marginRight: '4px' }} /> How It Works
          </div>
          <h2 className="section-title-large">
            3 steps. <span className="gradient-text">Serious talk.</span>
          </h2>
        </div>

        <div className="three-steps-grid-row">
          {/* Step 1 */}
          <div className="step-card-item">
            <span className="step-card-num-gradient">01</span>
            <h3 className="step-card-title">Write how you feel</h3>
            <p className="step-card-desc">
              After paying for something, jot down — amount, vibe, context. Takes only 30 seconds. You can do this.
            </p>
          </div>

          {/* Step 2 */}
          <div className="step-card-item">
            <span className="step-card-num-gradient">02</span>
            <h3 className="step-card-title">See your patterns</h3>
            <p className="step-card-desc">
              Money Mind compiles it into easy-to-digest visuals. You'll see for yourself where your leaks are.
            </p>
          </div>

          {/* Step 3 */}
          <div className="step-card-item">
            <span className="step-card-num-gradient">03</span>
            <h3 className="step-card-title">Level up gradually</h3>
            <p className="step-card-desc">
              Armed with self-awareness, you make financial decisions more aligned with the life you want.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bottom-cta-banner-section" id="signup">
        <div className="bottom-cta-inner-card">
          <h2 className="bottom-cta-title">
            Your money era <span className="gradient-text">starts tonight.</span>
          </h2>
          <p className="bottom-cta-subtitle">
            Most people wait for the perfect time. The perfect time never comes. Start with a single entry. You've got this.
          </p>
          <button className="btn-glow-custom glowing-pulsate" onClick={() => onNavigate('login')}>
            Open Your First Journal →
          </button>
          <span className="bottom-cta-subtext-note">Free · No credit card · Cancel anytime</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-redesigned">
        <div className="footer-grid-container">
          <div className="footer-brand-column">
            <div className="footer-brand-logo">
              <img src={logoPng} alt="Money Mind Logo" style={{ width: '28px', height: '28px', borderRadius: '5px' }} />
              money mind
            </div>
            <p className="footer-brand-desc">
              A financial journal for a generation that wants to live meaningfully, not just survive.
            </p>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-col-title">PRODUCT</h4>
            <ul className="footer-col-list">
              <li><a href="#features">Features</a></li>
              
              <li><span className="footer-fake-link-disabled">Changelog</span></li>
              <li><span className="footer-fake-link-disabled">Roadmap</span></li>
            </ul>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-col-title">RESOURCES</h4>
            <ul className="footer-col-list">
              <li><span className="footer-fake-link-disabled">Guides</span></li>
              <li><span className="footer-fake-link-disabled">Blog</span></li>
              <li><span className="footer-fake-link-disabled">Template</span></li>
              <li><span className="footer-fake-link-disabled">FAQ</span></li>
            </ul>
          </div>

          <div className="footer-links-column">
            <h4 className="footer-col-title">COMPANY</h4>
            <ul className="footer-col-list">
              <li><span className="footer-fake-link-disabled">About</span></li>
              <li><span className="footer-fake-link-disabled">Privacy</span></li>
              <li><span className="footer-fake-link-disabled">Terms</span></li>
              <li><span className="footer-fake-link-disabled">Contact</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar-redesigned">
          <div className="footer-bottom-copyright">
            © 2026 Money Mind · Made with <Heart size={12} fill="#8b5cf6" stroke="none" style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in Malaysia
          </div>
          <div className="footer-system-status">
            <span className="status-dot-active" /> All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}
