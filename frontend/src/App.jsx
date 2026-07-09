import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MonthlyView from './components/MonthlyView';
import WalletView from './components/WalletView';
import PredictionView from './components/PredictionView';
import AddExpenseModal from './components/AddExpenseModal';
import AddIncomeModal from './components/AddIncomeModal';
import SettingsModal from './components/SettingsModal';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import EditExpenseModal from './components/EditExpenseModal';
import LabelingView from './components/LabelingView';
import InvestmentView from './components/InvestmentView';
import { Plus } from 'lucide-react';

const DEFAULT_CURRENCY = { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' };

const DEFAULT_COLORS = {
  'Food & Dining': '#3b82f6',
  'Shopping': '#10b981',
  'Transportation': '#facc15',
  'Other': '#94a3b8'
};

const apiFetch = (url, options = {}) => {
  const session = localStorage.getItem('moneymind_session');
  const email = session ? JSON.parse(session).email : 'demo@moneymind.com';
  
  const headers = {
    ...options.headers,
    'X-User-Email': email
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};

function App() {
  // Auth & page state
  const [currentPage, setCurrentPage] = useState(() => {
    const session = localStorage.getItem('moneymind_session');
    return session ? 'app' : 'home';
  });

  const [userSession, setUserSession] = useState(() => {
    const session = localStorage.getItem('moneymind_session');
    return session ? JSON.parse(session) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [categories, setCategories] = useState([]);
  const [isSecretUnlocked, setIsSecretUnlocked] = useState(false);
  const [categoryColors, setCategoryColors] = useState(() => {
    const saved = localStorage.getItem('moneymind_category_colors');
    if (saved) {
      try {
        return { ...DEFAULT_COLORS, ...JSON.parse(saved) };
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_COLORS;
  });

  const handleUpdateCategoryColor = (category, color) => {
    const updated = { ...categoryColors, [category]: color };
    setCategoryColors(updated);
    localStorage.setItem('moneymind_category_colors', JSON.stringify(updated));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState(null);

  const handleLogin = () => {
    const session = localStorage.getItem('moneymind_session');
    setUserSession(session ? JSON.parse(session) : null);
    setCurrentPage('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('moneymind_session');
    setUserSession(null);
    setCurrentPage('home');
    setActiveTab('dashboard');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleUpdateProfile = async (updatedProfile) => {
    const currentSession = JSON.parse(localStorage.getItem('moneymind_session') || '{}');

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentSession.email,
          username: updatedProfile.username,
          avatar: updatedProfile.avatar,
          currentPassword: updatedProfile.currentPassword || null,
          newPassword: updatedProfile.newPassword || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to update profile.' };
      }

      const newSession = {
        ...currentSession,
        name: data.user.username,
        avatar: data.user.avatar,
      };
      localStorage.setItem('moneymind_session', JSON.stringify(newSession));
      setUserSession(newSession);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'Tidak dapat terhubung ke server. 🌐' };
    }
  };

  // One-time migration: move any legacy localStorage accounts into the DB
  useEffect(() => {
    if (localStorage.getItem('moneymind_migrated')) return;
    const legacy = localStorage.getItem('moneymind_users');
    if (!legacy) return;

    let users = [];
    try {
      users = JSON.parse(legacy);
    } catch {
      localStorage.setItem('moneymind_migrated', 'true');
      return;
    }

    if (!Array.isArray(users) || users.length === 0) {
      localStorage.setItem('moneymind_migrated', 'true');
      return;
    }

    fetch('/api/auth/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    })
      .then(() => localStorage.setItem('moneymind_migrated', 'true'))
      .catch(() => { /* leave flag unset so it retries next load */ });
  }, []);

  const loadCategories = () => {
    apiFetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      })
      .then(data => setCategories(data))
      .catch(err => console.error("Error fetching categories:", err));
  };

  const handleAddCategory = (name) => {
    return apiFetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.detail || "Failed to add category") });
        }
        return res.json();
      })
      .then(newCat => {
        setCategories(prev => {
          if (prev.includes(newCat.name)) return prev;
          return [...prev, newCat.name];
        });
        return newCat.name;
      });
  };

  const handleDeleteCategory = (name) => {
    return apiFetch(`/api/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete category");
        setCategories(prev => prev.filter(c => c !== name));
      });
  };

  const loadAllData = () => {
    // 1. Fetch Currency/Settings
    apiFetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      })
      .then(data => setCurrency(data))
      .catch(err => console.error("Error fetching settings:", err));

    // 2. Fetch Expenses
    apiFetch('/api/expenses')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch expenses");
        return res.json();
      })
      .then(data => setExpenses(data))
      .catch(err => console.error("Error fetching expenses:", err));

    // 3. Fetch Incomes
    apiFetch('/api/incomes')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch incomes");
        return res.json();
      })
      .then(data => setIncomes(data))
      .catch(err => console.error("Error fetching incomes:", err));
  };

  const fetchTelegramStatus = () => {
    apiFetch('/api/telegram/status')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch Telegram status");
        return res.json();
      })
      .then(data => setTelegramStatus(data))
      .catch(err => console.error("Error fetching Telegram status:", err));
  };

  const handleDisconnectTelegram = () => {
    apiFetch('/api/telegram/disconnect', {
      method: 'POST'
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to disconnect Telegram");
        return res.json();
      })
      .then(data => {
        setTelegramStatus(prev => ({
          ...prev,
          connected: false,
          chat_id: null,
          code: data.code
        }));
      })
      .catch(err => console.error("Error disconnecting Telegram:", err));
  };

  // Fetch data on mount only when logged in
  useEffect(() => {
    if (currentPage === 'app') {
      loadAllData();
      loadCategories();
      fetchTelegramStatus();
    }
  }, [currentPage]);

  // Handlers
  const handleAddExpense = (newExpense) => {
    apiFetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newExpense),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save expense");
        return res.json();
      })
      .then(addedExpense => {
        setExpenses(prev => [addedExpense, ...prev]);
      })
      .catch(err => console.error("Error saving expense:", err));
  };

  const handleAddIncome = (newIncome) => {
    apiFetch('/api/incomes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newIncome),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to save income");
        return res.json();
      })
      .then(addedIncome => {
        setIncomes(prev => [addedIncome, ...prev]);
      })
      .catch(err => console.error("Error saving income:", err));
  };

  const handleDeleteExpense = (id) => {
    apiFetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete expense");
        setExpenses(prev => prev.filter(e => e.id !== id));
      })
      .catch(err => console.error("Error deleting expense:", err));
  };

  const handleEditExpense = (id, updatedExpense) => {
    apiFetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedExpense),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update expense");
        return res.json();
      })
      .then(updated => {
        setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      })
      .catch(err => console.error("Error updating expense:", err));
  };

  const handleDeleteIncome = (id) => {
    apiFetch(`/api/incomes/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete income");
        setIncomes(prev => prev.filter(i => i.id !== id));
      })
      .catch(err => console.error("Error deleting income:", err));
  };

  const handleResetData = () => {
    return apiFetch('/api/reset', {
      method: 'POST',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to reset data");
        setExpenses([]);
        setIncomes([]);
      });
  };

  const handleUpdateCurrency = (newCurrency) => {
    apiFetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCurrency),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update currency settings");
        return res.json();
      })
      .then(updatedCurrency => {
        setCurrency(updatedCurrency);
      })
      .catch(err => console.error("Error updating settings:", err));
  };

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const count = expenses.length;
    const avg = count > 0 ? total / count : 0;
    return {
      total: total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      count: count,
      avg: avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }, [expenses]);

  // --- Page Routing ---
  if (currentPage === 'home') {
    return <HomePage onNavigate={handleNavigate} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
  }

  // currentPage === 'app' — main dashboard
  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="container mx-auto p-0" style={{ maxWidth: '1600px' }}>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          isSecretUnlocked={isSecretUnlocked}
          userSession={userSession}
          onUpdateProfile={handleUpdateProfile}
          telegramStatus={telegramStatus}
          onDisconnectTelegram={handleDisconnectTelegram}
          onRefreshTelegram={fetchTelegramStatus}
        />

        {activeTab === 'dashboard' ? (
          <Dashboard
            expenses={expenses}
            onDelete={handleDeleteExpense}
            onEditClick={(expense) => {
              setEditingExpense(expense);
              setIsEditModalOpen(true);
            }}
            totalSpent={metrics.total}
            transactionCount={metrics.count}
            avgTransaction={metrics.avg}
            currencySymbol={currency.symbol}
            categoryColors={categoryColors}
          />
        ) : activeTab === 'monthly' ? (
          <MonthlyView
            expenses={expenses}
            onDelete={handleDeleteExpense}
            onEditClick={(expense) => {
              setEditingExpense(expense);
              setIsEditModalOpen(true);
            }}
            currencySymbol={currency.symbol}
          />
        ) : activeTab === 'prediction' ? (
          <PredictionView
            expenses={expenses}
            incomes={incomes}
            currencySymbol={currency.symbol}
            categoryColors={categoryColors}
          />
        ) : activeTab === 'investment' ? (
          <InvestmentView
            expenses={expenses}
            incomes={incomes}
            currencySymbol={currency.symbol}
            categoryColors={categoryColors}
          />
        ) : activeTab === 'labeling' ? (
          <LabelingView
            onUploadSuccess={loadAllData}
            categories={categories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : (
          <WalletView
            incomes={incomes}
            expenses={expenses}
            onOpenAddIncome={() => setIsIncomeModalOpen(true)}
            onDeleteIncome={handleDeleteIncome}
            currencySymbol={currency.symbol}
          />
        )}
      </div>

      {activeTab !== 'wallet' && (
        <div className="fab-container">
          <button className="fab" onClick={() => setIsModalOpen(true)}>
            <Plus size={32} strokeWidth={2.5} className="text-slate-700" />
          </button>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddExpense}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        currencySymbol={currency.symbol}
      />

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onAdd={handleAddIncome}
        currencySymbol={currency.symbol}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExpense(null);
        }}
        onEdit={handleEditExpense}
        expense={editingExpense}
        categories={categories}
        onAddCategory={handleAddCategory}
        onDeleteCategory={handleDeleteCategory}
        currencySymbol={currency.symbol}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        setCurrency={handleUpdateCurrency}
        onUploadSuccess={loadAllData}
        onResetData={handleResetData}
        setIsSecretUnlocked={setIsSecretUnlocked}
        categories={categories}
        categoryColors={categoryColors}
        onUpdateCategoryColor={handleUpdateCategoryColor}
      />
    </div>
  );
}

export default App;
