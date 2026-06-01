import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MonthlyView from './components/MonthlyView';
import WalletView from './components/WalletView';
import AddExpenseModal from './components/AddExpenseModal';
import AddIncomeModal from './components/AddIncomeModal';
import SettingsModal from './components/SettingsModal';
import { Plus } from 'lucide-react';

const DEFAULT_CURRENCY = { code: 'USD', symbol: '$', name: 'US Dollar' };

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    // 1. Fetch Currency/Settings
    fetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch settings");
        return res.json();
      })
      .then(data => setCurrency(data))
      .catch(err => console.error("Error fetching settings:", err));

    // 2. Fetch Expenses
    fetch('/api/expenses')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch expenses");
        return res.json();
      })
      .then(data => setExpenses(data))
      .catch(err => console.error("Error fetching expenses:", err));

    // 3. Fetch Incomes
    fetch('/api/incomes')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch incomes");
        return res.json();
      })
      .then(data => setIncomes(data))
      .catch(err => console.error("Error fetching incomes:", err));
  }, []);

  // Handlers
  const handleAddExpense = (newExpense) => {
    fetch('/api/expenses', {
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
    fetch('/api/incomes', {
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
    fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete expense");
        setExpenses(prev => prev.filter(e => e.id !== id));
      })
      .catch(err => console.error("Error deleting expense:", err));
  };

  const handleDeleteIncome = (id) => {
    fetch(`/api/incomes/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to delete income");
        setIncomes(prev => prev.filter(i => i.id !== id));
      })
      .catch(err => console.error("Error deleting income:", err));
  };

  const handleUpdateCurrency = (newCurrency) => {
    fetch('/api/settings', {
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
      total: total.toFixed(2),
      count: count,
      avg: avg.toFixed(2)
    };
  }, [expenses]);

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="container mx-auto p-0" style={{ maxWidth: '1600px' }}>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {activeTab === 'dashboard' ? (
          <Dashboard
            expenses={expenses}
            onDelete={handleDeleteExpense}
            totalSpent={metrics.total}
            transactionCount={metrics.count}
            avgTransaction={metrics.avg}
            currencySymbol={currency.symbol}
          />
        ) : activeTab === 'monthly' ? (
          <MonthlyView
            expenses={expenses}
            onDelete={handleDeleteExpense}
            currencySymbol={currency.symbol}
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
        currencySymbol={currency.symbol}
      />

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        onAdd={handleAddIncome}
        currencySymbol={currency.symbol}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        setCurrency={handleUpdateCurrency}
      />
    </div>
  );
}

export default App;
