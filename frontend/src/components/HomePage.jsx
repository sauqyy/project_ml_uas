import React from 'react';
import { Wallet, Brain, TrendingUp, Shield, Sparkles, ArrowRight, Zap } from 'lucide-react';

export default function HomePage({ onNavigate }) {
  return (
    <div className="homepage">
      {/* Navbar */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <div className="home-nav-logo-icon">
            <Wallet size={22} color="#fff" />
          </div>
          Money Mind
        </div>
        <div className="home-nav-links">
          <button className="home-nav-link" onClick={() => onNavigate('login')}>
            Log In
          </button>
          <button className="home-nav-link primary" onClick={() => onNavigate('login')}>
            Get Started
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

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            AI-Powered Finance Tracker
          </div>

          <h1 className="hero-title">
            Take Control of{' '}
            <span className="gradient-text">Your Money</span> 💸
          </h1>

          <p className="hero-subtitle">
            Track pengeluaranmu, deteksi anomali dengan AI, dan dapatkan prediksi keuangan masa depan. 
            Semua dalam satu dashboard yang clean dan powerful.
          </p>

          <div className="hero-cta-group">
            <button className="btn-glow" onClick={() => onNavigate('login')}>
              Mulai Sekarang <ArrowRight size={18} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
            </button>
            <button className="btn-ghost" onClick={() => {
              document.querySelector('.features-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Lihat Fitur ✨
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-number">10K+</div>
          <div className="stat-label">Transaksi Diproses</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">99.2%</div>
          <div className="stat-label">Akurasi AI</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">4 Bulan</div>
          <div className="stat-label">Proyeksi Keuangan</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">24/7</div>
          <div className="stat-label">Monitoring Real-time</div>
        </div>
      </div>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-header">
          <h2>Fitur Unggulan 🚀</h2>
          <p>Didesain untuk Gen Z yang mau smart soal uang</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon indigo">
              <Brain size={26} />
            </div>
            <h3>AI Anomaly Detection</h3>
            <p>
              Model Isolation Forest mendeteksi pengeluaran tidak wajar secara otomatis. 
              Gak perlu ribet cek satu-satu — AI yang kerja! 🤖
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon violet">
              <TrendingUp size={26} />
            </div>
            <h3>Financial Forecasting</h3>
            <p>
              Prediksi pengeluaran 4 bulan ke depan dengan model Random Forest. 
              Plan ahead, bukan panic later! 📈
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon pink">
              <Shield size={26} />
            </div>
            <h3>Smart Categorization</h3>
            <p>
              Upload mutasi bank, dan NLP classifier otomatis kategorikan setiap transaksi. 
              Import data? Beres dalam hitungan detik ⚡
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2024 Money Mind — Built with 💜 for UAS Machine Learning</p>
      </footer>
    </div>
  );
}
