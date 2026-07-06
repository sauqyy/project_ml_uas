import React, { useState, useRef, useEffect } from 'react';
import { Wallet, LayoutDashboard, Calendar, Settings, CreditCard, TrendingUp, LogOut, Sparkles, ChevronDown, User, Send, Check, Coins } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import TelegramModal from './TelegramModal';
import logoPng from '../assets/logo.png';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onLogout,
  isSecretUnlocked,
  userSession,
  onUpdateProfile,
  telegramStatus,
  onDisconnectTelegram,
  onRefreshTelegram
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="dashboard-header-top flex items-center gap-3">
        {/* Brand Logo */}
        <img src={logoPng} alt="Money Mind Logo" style={{ width: '64px', height: '64px', borderRadius: '8px' }} />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Money Mind</h1>
          <p className="text-muted text-sm">Track your expenses and visualize your spending patterns</p>
        </div>

        {/* Telegram Connect Button (shows on dashboard ONLY when NOT connected) */}
        {telegramStatus && !telegramStatus.connected && (
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className="btn-telegram-connect"
            style={{ marginRight: '0.5rem' }}
          >
            <Send size={16} style={{ transform: 'rotate(-25deg)', transformOrigin: 'center' }} />
            Connect Telegram
          </button>
        )}

        {/* Profile Menu Trigger (Top Right) */}
        <div className="profile-menu-container" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="profile-trigger"
          >
            {userSession?.avatar ? (
              <img src={userSession.avatar} alt="Avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar">
                {getInitials(userSession?.name)}
              </div>
            )}
            <div className="profile-trigger-info">
              <div className="profile-trigger-name">{userSession?.name || 'User'}</div>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>

          {/* Profile Dropdown Popover */}
          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-dropdown-name">{userSession?.name || 'User'}</div>
                <div className="profile-dropdown-email">{userSession?.email || 'user@moneymind.com'}</div>
              </div>

              <button
                onClick={() => {
                  setIsProfileModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="profile-dropdown-item"
              >
                <User size={16} />
                Edit Profile
              </button>

              <button
                onClick={() => {
                  onOpenSettings();
                  setIsDropdownOpen(false);
                }}
                className="profile-dropdown-item"
              >
                <Settings size={16} />
                Settings
              </button>

              {/* Dynamic Telegram status row inside dropdown */}
              <button
                onClick={() => {
                  setIsTelegramModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="profile-dropdown-item"
              >
                <Send size={16} className="text-blue-500" />
                {telegramStatus?.connected ? (
                  <span className="flex items-center gap-1.5 text-green-600 font-medium">
                    Telegram Connected <Check size={14} />
                  </span>
                ) : (
                  <span>Connect Telegram</span>
                )}
              </button>

              <div className="profile-dropdown-divider" />

              <button
                onClick={() => {
                  onLogout();
                  setIsDropdownOpen(false);
                }}
                className="profile-dropdown-item danger"
              >
                <LogOut size={16} />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="dashboard-tabs flex bg-white p-1 rounded-xl w-full mx-auto shadow-sm border border-slate-200" style={{ maxWidth: '56rem' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
        >
          <Calendar size={16} />
          Monthly View
        </button>
        <button
          onClick={() => setActiveTab('wallet')}
          className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
        >
          <CreditCard size={16} />
          Wallet
        </button>
        <button
          onClick={() => setActiveTab('prediction')}
          className={`tab-btn ${activeTab === 'prediction' ? 'active' : ''}`}
        >
          <TrendingUp size={16} />
          Financial Prediction
        </button>
        <button
          onClick={() => setActiveTab('investment')}
          className={`tab-btn ${activeTab === 'investment' ? 'active' : ''}`}
        >
          <Coins size={16} />
          Smart allocation
        </button>
        {isSecretUnlocked && (
          <button
            onClick={() => setActiveTab('labeling')}
            className={`tab-btn ${activeTab === 'labeling' ? 'active' : ''}`}
          >
            <Sparkles size={16} className="text-amber-500" />
            AI Labeling
          </button>
        )}
      </div>

      {/* Profile Editing Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userSession={userSession}
        onSave={onUpdateProfile}
      />

      {/* Telegram Connection Modal */}
      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        status={telegramStatus}
        onDisconnect={onDisconnectTelegram}
        onRefresh={onRefreshTelegram}
      />
    </div>
  );
}
