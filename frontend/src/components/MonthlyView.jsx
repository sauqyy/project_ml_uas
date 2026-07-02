import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wallet, Receipt, PieChart } from 'lucide-react';
import MetricCard from './MetricCard';
import RecentExpenses from './RecentExpenses';

export default function MonthlyView({ expenses, onDelete, onEditClick, currencySymbol = '$' }) {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 11 }, (_, i) => currentDate.getFullYear() - 5 + i);

    // Filter expenses
    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            let d = new Date(expense.date);
            if (isNaN(d.getTime())) {
                return false;
            }
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [expenses, selectedMonth, selectedYear]);

    // Metrics
    const metrics = useMemo(() => {
        const total = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
        const count = filteredExpenses.length;
        const categories = new Set(filteredExpenses.map(e => e.category)).size;

        return {
            total: total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            count,
            categories
        };
    }, [filteredExpenses]);

    // Navigation handlers
    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Top Controller & Metrics */}
            <div className="flex flex-col gap-6">
                {/* Navigation Bar */}
                <div className="flex items-center justify-between card p-4">
                    <div className="flex items-center gap-2">
                        <CalendarIcon size={20} className="text-primary" />
                        <h2 className="text-lg font-bold">Monthly Overview</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={handlePrevMonth} className="icon-btn w-8 h-8 rounded-full border border-slate-200 hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center">
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex gap-2">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer hover:border-slate-300 transition-colors"
                                style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer hover:border-slate-300 transition-colors"
                                style={{ padding: '0.5rem 2rem 0.5rem 0.75rem', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={handleNextMonth} className="icon-btn w-8 h-8 rounded-full border border-slate-200 hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="stats-grid">
                    <div className="card p-6 border-l-4 border-l-primary flex items-start justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Total Spent</p>
                            <h3 className="text-2xl font-bold text-slate-800">{currencySymbol}{metrics.total}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-primary rounded-xl">
                            <Wallet size={24} />
                        </div>
                    </div>

                    <div className="card p-6 border-l-4 border-l-emerald-500 flex items-start justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Transactions</p>
                            <h3 className="text-2xl font-bold text-slate-800">{metrics.count}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                            <Receipt size={24} />
                        </div>
                    </div>

                    <div className="card p-6 border-l-4 border-l-amber-500 flex items-start justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-sm font-medium text-muted mb-1">Active Categories</p>
                            <h3 className="text-2xl font-bold text-slate-800">{metrics.categories}</h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                            <PieChart size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="card flex-1 min-h-0 flex flex-col">
                <h3 className="font-bold text-muted text-sm mb-4">
                    {months[selectedMonth]} {selectedYear} Expenses
                </h3>

                <div className="flex-1 overflow-hidden relative">
                    {filteredExpenses.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted text-sm pb-10">
                            No expenses recorded for {months[selectedMonth]} {selectedYear}
                        </div>
                    ) : (
                        <div className="scroll-y h-full pr-2">
                            <RecentExpenses
                                expenses={filteredExpenses}
                                onDelete={onDelete}
                                onEditClick={onEditClick}
                                hideHeader={true}
                                currencySymbol={currencySymbol}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
