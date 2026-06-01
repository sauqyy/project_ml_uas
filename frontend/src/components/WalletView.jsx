import React, { useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function WalletView({ incomes, expenses, onOpenAddIncome, onDeleteIncome, currencySymbol = '$' }) {

    // Calculate Totals
    const metrics = useMemo(() => {
        const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
        const balance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

        return {
            income: totalIncome.toFixed(2),
            expense: totalExpense.toFixed(2),
            balance: balance.toFixed(2),
            savingsRate: savingsRate.toFixed(1)
        };
    }, [incomes, expenses]);

    // Chart Data (Simple Cash Flow)
    const chartData = [
        { name: 'Income', amount: parseFloat(metrics.income), color: '#10b981' }, // Emerald
        { name: 'Expense', amount: parseFloat(metrics.expense), color: '#ef4444' }, // Red
    ];

    return (
        <div className="dashboard-grid h-full">
            {/* Left Column: Metrics & Actions */}
            <div className="flex flex-col gap-6">

                {/* Balance Card */}
                <div className="card text-white p-6 relative overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-slate-300 mb-2">
                            <Wallet size={20} />
                            <span className="font-medium">Total Balance</span>
                        </div>
                        <div className="text-4xl font-bold mb-4">
                            {currencySymbol}{metrics.balance}
                        </div>
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1 text-emerald-400">
                                <TrendingUp size={16} />
                                <span>+ {metrics.savingsRate}% Savings</span>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Circle */}
                    <div className="absolute top-0 right-0 text-slate-800 opacity-20 transform translate-x-10 -translate-y-10">
                        <div className="w-40 h-40 rounded-full border-[10px] border-white"></div>
                    </div>
                </div>

                {/* Quick Actions */}
                <button
                    onClick={onOpenAddIncome}
                    className="btn-success"
                >
                    <Plus size={20} />
                    Add Income
                </button>

                {/* Sub Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-2 text-muted mb-2 text-sm">
                            <ArrowUpRight size={16} className="text-emerald-500" />
                            Total Income
                        </div>
                        <div className="text-xl font-bold text-slate-800">
                            {currencySymbol}{metrics.income}
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-2 text-muted mb-2 text-sm">
                            <TrendingDown size={16} className="text-red-500" />
                            Total Expense
                        </div>
                        <div className="text-xl font-bold text-slate-800">
                            {currencySymbol}{metrics.expense}
                        </div>
                    </div>
                </div>

                {/* Recent Incomes List */}
                <div className="card flex-1 min-h-0 flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Income History</h3>
                    <div className="scroll-y flex-1 pr-2">
                        {incomes.length === 0 ? (
                            <div className="text-muted text-sm text-center py-4">No income recorded</div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {incomes.map(inc => (
                                    <div key={inc.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100 group">
                                        <div>
                                            <div className="font-bold text-slate-700">{inc.source}</div>
                                            <div className="text-xs text-muted">{inc.date}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="font-bold text-emerald-600">
                                                + {currencySymbol}{inc.amount.toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => onDeleteIncome(inc.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
                                                title="Remove Income"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Analytics */}
            <div className="card flex flex-col">
                <h3 className="font-bold text-lg mb-6">Cash Flow Analysis</h3>
                <div className="flex-1 min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barSize={60}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 14, fill: '#64748b', fontWeight: 500 }}
                            />
                            <YAxis hide />
                            <Tooltip
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <h4 className="font-bold text-sm text-slate-700 mb-2">Wallet Health</h4>
                    <p className="text-sm text-muted leading-relaxed">
                        {metrics.savingsRate > 20
                            ? "Great job! You're saving a healthy portion of your income. Keep it up!"
                            : metrics.savingsRate > 0
                                ? "You're spending less than you earn, but try to increase your savings rate."
                                : "Warning: Your expenses are exceeding your income. Review your spending budget."}
                    </p>
                </div>
            </div>
        </div>
    );
}
