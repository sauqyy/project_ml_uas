import React from 'react';
import { Trash2, Edit2, Smartphone, ShoppingBag, Zap, Film, Utensils, Stethoscope, Briefcase } from 'lucide-react';

// Icon mapping helper
const getIcon = (category) => {
    switch (category) {
        case 'Food & Dining': return Utensils;
        case 'Shopping': return ShoppingBag;
        case 'Transportation': return Smartphone; // Still using Smartphone for demo
        case 'Bills & Utilities': return Zap;
        case 'Entertainment': return Film;
        case 'Healthcare': return Stethoscope;
        default: return Briefcase; // Fallback
    }
};

export default function RecentExpenses({ expenses, onDelete, onEditClick, hideHeader = false, currencySymbol = '$' }) {
    return (
        <div className={`card h-full overflow-hidden flex flex-col ${hideHeader ? 'border-none shadow-none p-0' : ''}`}>
            {!hideHeader && (
                <div className="flex items-center gap-2 mb-4">
                    {/* Just a header icon, static */}
                    <Smartphone size={18} className="text-muted" />
                    <h3 className="font-bold text-lg">Recent Expenses</h3>
                </div>
            )}

            <div className="scroll-y flex-1 pr-2">
                {expenses.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted text-sm">
                        No expenses yet. Add one!
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {expenses.map((expense) => {
                            // Get dynamic icon or fallback
                            const IconComponent = expense.icon || getIcon(expense.category);

                            return (
                                <div key={expense.id} className="expense-item">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-primary">{currencySymbol}{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                {expense.category}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-700">{expense.desc}</div>
                                        <div className="text-xs text-muted">
                                            {/* Handle both raw string dates (legacy) and new displayDate */}
                                            {expense.displayDate || expense.date}
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            className="icon-btn edit-icon-btn"
                                            onClick={() => onEditClick(expense)}
                                            title="Edit expense"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="icon-btn"
                                            onClick={() => onDelete(expense.id)}
                                            title="Delete expense"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
