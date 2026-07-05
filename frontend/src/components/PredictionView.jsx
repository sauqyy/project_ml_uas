import React, { useState, useMemo, useEffect } from 'react';
import {
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
    Sparkles, Wallet, AlertTriangle, CheckCircle2,
    TrendingUp, TrendingDown, CalendarDays, Database, Download, Activity, ArrowRightLeft
} from 'lucide-react';
import { ExpensesByCategory } from './Charts';

export default function PredictionView({ expenses = [], incomes = [], currencySymbol = 'Rp', categoryColors = {} }) {

    // 2. Prophet Forecast + Budget Monitor State
    const [prophetForecast, setProphetForecast] = useState([]);
    const [prophetActuals, setProphetActuals] = useState([]);
    const [forecastMeta, setForecastMeta] = useState(null);
    const [forecastStatus, setForecastStatus] = useState(null);
    const [loadingForecast, setLoadingForecast] = useState(false);
    const [budget, setBudget] = useState(null);
    const [importing, setImporting] = useState(false);

    const userEmail = (() => {
        const s = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
        return s.email || 'demo@moneymind.com';
    })();

    useEffect(() => {
        setLoadingForecast(true);
        const headers = { 'X-User-Email': userEmail };

        fetch('/api/forecast?days=14', { headers })
            .then(res => res.json())
            .then(data => {
                setForecastStatus(data.status);
                setProphetForecast(Array.isArray(data.forecast) ? data.forecast : []);
                setProphetActuals(Array.isArray(data.actuals) ? data.actuals : []);
                setForecastMeta(data.meta || (data.status === 'belum_siap' ? data : null));
            })
            .catch(err => console.error("Error fetching forecast:", err))
            .finally(() => setLoadingForecast(false));

        fetch('/api/budget-status?savings_percent=20&days=30', { headers })
            .then(res => res.json())
            .then(data => setBudget(data))
            .catch(err => console.error("Error fetching budget:", err));
    }, [expenses]);

    const fmtNum = (n) => `${currencySymbol}${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
    const fmtShort = (v) => {
        if (v >= 1000000) return `${currencySymbol}${(v / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
        if (v >= 1000) return `${currencySymbol}${Math.round(v / 1000)}k`;
        return `${currencySymbol}${Math.round(v)}`;
    };

    const handleImport = () => {
        setImporting(true);
        fetch('/api/import-dataset?replace=true', {
            method: 'POST',
            headers: { 'X-User-Email': userEmail },
        })
            .then(res => res.json())
            .then(() => window.location.reload())
            .catch(err => { console.error("Import failed:", err); setImporting(false); });
    };

    // Prophet-derived summary
    const total14 = useMemo(
        () => prophetForecast.reduce((s, f) => s + (f.predicted_expense || 0), 0),
        [prophetForecast]
    );
    const avgDaily = prophetForecast.length ? total14 / prophetForecast.length : 0;

    const forecastChartData = useMemo(() => {
        const list = [];

        // Add actual historical daily spend (Emerald)
        prophetActuals.forEach(item => {
            list.push({
                dateStr: item.date,
                name: new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                actual: Math.round(item.actual_expense || 0),
                predicted: null
            });
        });

        // Bridge/connect the last actual point to the first forecast point
        if (prophetActuals.length > 0 && prophetForecast.length > 0) {
            const lastActual = prophetActuals[prophetActuals.length - 1];
            list[list.length - 1].predicted = Math.round(lastActual.actual_expense || 0);
        }

        // Add forecast future daily spend (Indigo)
        prophetForecast.forEach(item => {
            list.push({
                dateStr: item.date,
                name: new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                actual: null,
                predicted: Math.round(item.predicted_expense || 0)
            });
        });

        return list;
    }, [prophetActuals, prophetForecast]);

    const budgetPct = useMemo(() => {
        if (!budget || !budget.max_pengeluaran_aman) return 0;
        return Math.min(100, (budget.actual_so_far_bulan_ini / budget.max_pengeluaran_aman) * 100);
    }, [budget]);
    const budgetAman = budget && !budget.error &&
        budget.actual_so_far_bulan_ini <= budget.max_pengeluaran_aman;

    // Perbandingan pengeluaran bulan ini vs bulan lalu (dari transaksi user)
    const monthlyComparison = useMemo(() => {
        const byMonth = {};
        expenses.forEach(e => {
            const ym = (e.date || '').slice(0, 7); // YYYY-MM
            if (!ym || ym.length < 7) return;
            byMonth[ym] = (byMonth[ym] || 0) + e.amount;
        });
        const months = Object.keys(byMonth).sort();
        if (months.length === 0) return null;
        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const label = (ym) => `${MONTHS[parseInt(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
        const thisYM = months[months.length - 1];
        const lastYM = months.length > 1 ? months[months.length - 2] : null;
        const thisVal = byMonth[thisYM];
        const lastVal = lastYM ? byMonth[lastYM] : 0;
        const diff = thisVal - lastVal;
        const pct = lastVal > 0 ? (diff / lastVal) * 100 : null;
        return {
            thisLabel: label(thisYM),
            lastLabel: lastYM ? label(lastYM) : null,
            thisVal, lastVal, diff, pct,
            max: Math.max(thisVal, lastVal, 1),
        };
    }, [expenses]);

    // Calculate remaining monthly cash (surplus history) over the last 5 months
    const surplusHistory = useMemo(() => {
        const incomeByMonth = {};
        incomes.forEach(i => {
            const ym = (i.date || '').slice(0, 7); // YYYY-MM
            if (!ym || ym.length < 7) return;
            incomeByMonth[ym] = (incomeByMonth[ym] || 0) + i.amount;
        });

        const expenseByMonth = {};
        expenses.forEach(e => {
            const ym = (e.date || '').slice(0, 7); // YYYY-MM
            if (!ym || ym.length < 7) return;
            expenseByMonth[ym] = (expenseByMonth[ym] || 0) + e.amount;
        });

        // Collect all months that have either incomes or expenses
        const allMonthsSet = new Set([
            ...Object.keys(incomeByMonth),
            ...Object.keys(expenseByMonth)
        ]);

        // Always ensure the current month is included
        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        allMonthsSet.add(currentYM);

        const sortedMonths = Array.from(allMonthsSet).sort();
        // Take the last 5 months
        const last5Months = sortedMonths.slice(-5);

        const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const label = (ym) => `${MONTHS[parseInt(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

        const data = last5Months.map(ym => {
            const inc = incomeByMonth[ym] || 0;
            const exp = expenseByMonth[ym] || 0;
            const surplus = inc - exp;
            return {
                ym,
                label: label(ym),
                income: inc,
                expense: exp,
                surplus,
                isCurrent: ym === currentYM
            };
        });

        const maxAbs = Math.max(...data.map(d => Math.abs(d.surplus)), 1);

        return {
            data,
            maxAbs
        };
    }, [expenses, incomes]);

    const isColdStart = forecastStatus === 'belum_siap';

    // --- Data untuk state "sedang mengumpulkan data" (cold-start) ---
    const daysCollected = forecastMeta?.hari_terkumpul ?? 0;
    const daysNeeded = forecastMeta?.hari_dibutuhkan ?? 21;
    const daysLeft = Math.max(0, daysNeeded - daysCollected);
    const ringRadius = 26;
    const ringCirc = 2 * Math.PI * ringRadius;
    const ringPct = daysNeeded ? Math.min(1, daysCollected / daysNeeded) : 0;
    const ringOffset = ringCirc * (1 - ringPct);

    // Helper to translate budget status messages
    const translateBudgetMsg = (msg) => {
        if (!msg) return '';
        let m = msg.toLowerCase();
        if (m.includes('aman') || m.includes('di bawah')) {
            return `Budget safe! Monthly spend is within maximum limits.`;
        }
        if (m.includes('melebihi') || m.includes('overspend')) {
            return `Budget warning! Monthly spend exceeds limit.`;
        }
        return msg;
    };

    return (
        <div className="flex flex-col gap-6">

            {/* Cold-start: Data collection progress banner */}
            {isColdStart && (
                <div className="coldstart-progress-banner">
                    <div className="coldstart-progress-left">
                        {/* Circular Progress Ring */}
                        <div className="coldstart-ring-wrapper">
                            <svg width="64" height="64" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r={ringRadius} fill="none" stroke="#e8e0f3" strokeWidth="5" />
                                <circle
                                    cx="32" cy="32" r={ringRadius} fill="none"
                                    stroke="url(#coldstartGrad)" strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={ringCirc}
                                    strokeDashoffset={ringOffset}
                                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.6s ease' }}
                                />
                                <defs>
                                    <linearGradient id="coldstartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#8b5cf6" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="coldstart-ring-text">
                                <strong>{daysCollected}</strong>/{daysNeeded}
                            </span>
                        </div>
                        <div className="coldstart-info">
                            <h3 className="coldstart-title">Collecting your transaction history</h3>
                            <p className="coldstart-desc">
                                Spending forecasts & active budget alerts will unlock in **{daysLeft} days**.
                                We need enough data to build accurate projections instead of guesses.
                            </p>
                        </div>
                    </div>
                    <div className="coldstart-actions">
                        <button
                            onClick={() => {
                                document.getElementById('ml-features-container')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="coldstart-import-btn"
                        >
                            View preview
                        </button>
                    </div>
                </div>
            )}

            {/* Feature Cards — greyed out when cold-start */}
            <div className={isColdStart ? 'coldstart-locked-wrapper' : ''} id="ml-features-container">
                {isColdStart && (
                    <div className="coldstart-locked-overlay">
                        <div className="coldstart-locked-badge">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>Collect <strong>{daysLeft}</strong> more days of data to unlock AI features</span>
                        </div>
                    </div>
                )}

                {!isColdStart ? (
                    <>
                        {/* Stat cards */}
                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="card flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-500"><TrendingUp size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-muted uppercase font-bold tracking-wide">14-Day Estimate</p>
                                    <p className="text-lg font-bold text-slate-800">{fmtNum(total14)}</p>
                                </div>
                            </div>
                            <div className="card flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CalendarDays size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-muted uppercase font-bold tracking-wide">Daily Average</p>
                                    <p className="text-lg font-bold text-slate-800">{fmtNum(avgDaily)}</p>
                                </div>
                            </div>
                            {(() => {
                                const catTotals = expenses.reduce((acc, e) => {
                                    const cat = e.category || 'Other';
                                    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
                                    return acc;
                                }, {});
                                const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
                                return (
                                    <div className="card flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Activity size={20} /></div>
                                        <div>
                                            <p className="text-[11px] text-muted uppercase font-bold tracking-wide">Most Spent Category</p>
                                            <p className="text-sm font-bold text-slate-800">{topCat ? topCat[0] : '—'}</p>
                                            <p className="text-[10px] text-slate-400">{topCat ? fmtNum(topCat[1]) : 'No data'}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Forecast chart + Budget monitor */}
                        <div className="prediction-grid" style={{ marginTop: '1.5rem' }}>
                            {/* Prophet Forecast Area Chart */}
                            <div className="card flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-md text-primary">Daily Expense Projections (14 Days)</h3>
                                </div>
                                {loadingForecast ? (
                                    <p className="text-xs text-muted">Calculating Prophet forecast...</p>
                                ) : forecastChartData.length === 0 ? (
                                    <p className="text-xs text-muted">No forecast data available yet.</p>
                                ) : (
                                    <div style={{ width: '100%', height: '330px' }}>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                                                    </linearGradient>
                                                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" tickLine={false} />
                                                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} tickFormatter={fmtShort} width={55} />
                                                <Tooltip
                                                    formatter={(value, name) => [fmtNum(value), name]}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                                />
                                                <Area type="monotone" dataKey="actual" name="Actual (History)" stroke="#10b981" strokeWidth={2.5} fill="url(#actualFill)" dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls={false} />
                                                <Area type="monotone" dataKey="predicted" name="Projection (Prophet)" stroke="#6366f1" strokeWidth={2.5} fill="url(#forecastFill)" dot={{ r: 2 }} activeDot={{ r: 5 }} connectNulls={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        <div className="flex justify-center gap-6 text-xs mt-3 bg-slate-50 py-2 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }} className="shrink-0" />
                                                <span className="text-slate-600 font-semibold">Actual (Spending History)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: '12px', height: '12px', backgroundColor: '#6366f1', borderRadius: '3px' }} className="shrink-0" />
                                                <span className="text-slate-600 font-semibold">Projection (Prophet Forecast)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    The Prophet model analyzes weekly seasonality & historical spending trends to project the next 14 days.
                                </p>
                            </div>

                            {/* Monthly Remaining Cash (Last 5 Months) */}
                            <div className="card flex flex-col gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Wallet size={18} className="text-emerald-600" />
                                        <h3 className="font-bold text-md text-primary">Monthly Remaining Cash (Last 5 Months)</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 ml-7">
                                        Track your remaining cash (Income - Expenses) to see if you are improving your savings over time.
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-4 mt-1">
                                    {surplusHistory.data.map((item) => {
                                        const percentage = surplusHistory.maxAbs > 0 ? (Math.abs(item.surplus) / surplusHistory.maxAbs) * 100 : 0;
                                        const isPositive = item.surplus >= 0;
                                        return (
                                            <div key={item.ym} className="flex flex-col gap-1.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className={`${item.isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                                        {item.label} {item.isCurrent && '(This Month)'}
                                                    </span>
                                                    <span className={`font-semibold ${isPositive ? 'text-slate-800' : 'text-rose-600'}`}>
                                                        {isPositive ? '+' : '-'}{fmtNum(Math.abs(item.surplus))}
                                                    </span>
                                                </div>
                                                <div style={{ height: '10px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${percentage}%`,
                                                        borderRadius: '9999px',
                                                        background: isPositive 
                                                            ? 'linear-gradient(90deg,#34d399,#10b981)' 
                                                            : 'linear-gradient(90deg,#fb7185,#e11d48)',
                                                        transition: 'width 0.4s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Preview stat cards (placeholder data for greyed-out state) */}
                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="card flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-500"><TrendingUp size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-muted uppercase font-bold tracking-wide">14-Day Estimate</p>
                                    <p className="text-lg font-bold text-slate-800">—</p>
                                </div>
                            </div>
                            <div className="card flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><CalendarDays size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-muted uppercase font-bold tracking-wide">Daily Average</p>
                                    <p className="text-lg font-bold text-slate-800">—</p>
                                </div>
                            </div>
                            <div className="card flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600"><Activity size={20} /></div>
                                <div>
                                    <p className="text-[11px] text-muted uppercase font-bold tracking-wide">Most Spent Category</p>
                                    <p className="text-sm font-bold text-slate-800">—</p>
                                    <p className="text-[10px] text-slate-400">No data</p>
                                </div>
                            </div>
                        </div>

                        {/* Preview forecast + budget (placeholder) */}
                        <div className="prediction-grid" style={{ marginTop: '1.5rem' }}>
                            <div className="card flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={18} className="text-indigo-600" />
                                    <h3 className="font-bold text-md text-primary">Daily Expense Projections (14 Days)</h3>
                                </div>
                                <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p className="text-sm text-muted">Data not available yet</p>
                                </div>
                            </div>
                            {/* Monthly Remaining Cash (Last 5 Months) */}
                            <div className="card flex flex-col gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Wallet size={18} className="text-emerald-600" />
                                        <h3 className="font-bold text-md text-primary">Monthly Remaining Cash (Last 5 Months)</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 ml-7">
                                        Track your remaining cash (Income - Expenses) to see if you are improving your savings over time.
                                    </p>
                                </div>
                                
                                <div className="flex flex-col gap-4 mt-1">
                                    {surplusHistory.data.map((item) => {
                                        const percentage = surplusHistory.maxAbs > 0 ? (Math.abs(item.surplus) / surplusHistory.maxAbs) * 100 : 0;
                                        const isPositive = item.surplus >= 0;
                                        return (
                                            <div key={item.ym} className="flex flex-col gap-1.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className={`${item.isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'}`}>
                                                        {item.label} {item.isCurrent && '(This Month)'}
                                                    </span>
                                                    <span className={`font-semibold ${isPositive ? 'text-slate-800' : 'text-rose-600'}`}>
                                                        {isPositive ? '+' : '-'}{fmtNum(Math.abs(item.surplus))}
                                                    </span>
                                                </div>
                                                <div style={{ height: '10px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${percentage}%`,
                                                        borderRadius: '9999px',
                                                        background: isPositive 
                                                            ? 'linear-gradient(90deg,#34d399,#10b981)' 
                                                            : 'linear-gradient(90deg,#fb7185,#e11d48)',
                                                        transition: 'width 0.4s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Expenses by Category + Monthly Comparison */}
            <div className="prediction-grid" style={{ marginTop: '1.5rem' }}>
                {/* Expenses by Category */}
                <div style={{ height: '360px' }}>
                    <ExpensesByCategory expenses={expenses} categoryColors={categoryColors} />
                </div>

                {/* Monthly Comparison */}
                <div className="card flex flex-col gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft size={18} className="text-indigo-500" />
                            <h3 className="font-bold text-md text-primary">Monthly Comparison (This Month vs. Last Month)</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 ml-7">Compare your total expenses between the current and previous month. A positive value means you saved more this month.</p>
                    </div>
                    {!monthlyComparison ? (
                        <p className="text-xs text-muted">No expense data available.</p>
                    ) : (
                        <div className="flex flex-col gap-4 mt-1">
                            {monthlyComparison.lastLabel && (
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400 font-medium">{monthlyComparison.lastLabel}</span>
                                        <span className="text-slate-400 font-semibold">{fmtNum(monthlyComparison.lastVal)}</span>
                                    </div>
                                    <div style={{ height: '10px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(monthlyComparison.lastVal / monthlyComparison.max) * 100}%`, borderRadius: '9999px', background: '#cbd5e1' }} />
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-indigo-600 font-bold">{monthlyComparison.thisLabel}</span>
                                    <span className="text-slate-800 font-bold">{fmtNum(monthlyComparison.thisVal)}</span>
                                </div>
                                <div style={{ height: '10px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(monthlyComparison.thisVal / monthlyComparison.max) * 100}%`, borderRadius: '9999px', background: 'linear-gradient(90deg,#6366f1,#4f46e5)' }} />
                                </div>
                            </div>
                            {monthlyComparison.lastLabel ? (() => {
                                // Savings = lastVal - thisVal (positive = you spent less = good)
                                const savings = monthlyComparison.lastVal - monthlyComparison.thisVal;
                                const savingsPct = monthlyComparison.lastVal > 0 ? (savings / monthlyComparison.lastVal) * 100 : null;
                                return (
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-sm">
                                        <span className="text-slate-500 font-medium">Difference</span>
                                        <span className={`font-bold flex items-center gap-1 ${savings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {savings >= 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
                                            {savings >= 0 ? '+' : '-'}{fmtNum(Math.abs(savings))}
                                            {savingsPct !== null && ` (${Math.abs(savingsPct).toFixed(0)}%)`}
                                        </span>
                                    </div>
                                );
                            })() : (
                                <p className="text-[11px] text-slate-400 pt-1">No comparison data available — new data from only one month.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
