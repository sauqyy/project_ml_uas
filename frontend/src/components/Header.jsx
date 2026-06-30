import React from 'react';
import { Wallet, LayoutDashboard, Calendar, Settings, CreditCard, TrendingUp, LogOut } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenSettings, onLogout }) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      <div className="flex items-center gap-3">
        <div className="bg-black text-white p-2 rounded-lg">
          <Wallet size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Money Mind</h1>
          <p className="text-muted text-sm">Track your expenses and visualize your spending patterns</p>
        </div>

        <button onClick={onOpenSettings} className="icon-btn p-2 border border-transparent hover:border-slate-200">
          <Settings size={20} />
        </button>
        <button
          onClick={onLogout}
          className="icon-btn p-2 border border-transparent hover:border-slate-200"
          title="Logout"
          style={{ marginLeft: '0.25rem' }}
        >
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex bg-white p-1 rounded-xl w-full mx-auto shadow-sm border border-slate-200" style={{ maxWidth: '56rem' }}>
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
          Prediksi Keuangan
        </button>
      </div>
    </div>
  );
}
