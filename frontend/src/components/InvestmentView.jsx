import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Coins, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, PieChart as PieIcon, ArrowRightLeft, Target, Sparkles, HelpCircle, Wallet, BarChart2, Info } from 'lucide-react';

// Color Palette for categories
const CATEGORY_COLORS = {
    'Food & Dining': '#3b82f6', // blue
    'Shopping': '#10b981', // emerald
    'Transportation': '#f59e0b', // amber
    'Other': '#64748b' // slate
};

const DEFAULT_COLOR = '#94a3b8';

// CSS Styling to inject for premium look
const customCSS = `
.wealth-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    padding-bottom: 4rem;
}

.wealth-grid-top {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 1.5rem;
}

.wealth-grid-mid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

@media (max-width: 1024px) {
    .wealth-grid-top, .wealth-grid-mid {
        grid-template-columns: 1fr;
    }
}

/* Styled Sliders */
.slider-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.slider-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.slider-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #334155;
}

.slider-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
}

.slider-badge.invest {
    color: #4f46e5;
    background-color: #e0e7ff;
}

.slider-badge.savings {
    color: #059669;
    background-color: #d1fae5;
}

.custom-range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 9999px;
    background: #e2e8f0;
    outline: none;
    cursor: pointer;
    transition: background 0.2s;
}

.custom-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    cursor: pointer;
    transition: transform 0.1s, background-color 0.2s;
}

.custom-range-slider.invest-slider::-webkit-slider-thumb {
    background-color: #6366f1;
}

.custom-range-slider.savings-slider::-webkit-slider-thumb {
    background-color: #10b981;
}

.custom-range-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}

/* Allocation Bar */
.allocation-bar-container {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #f1f5f9;
}

.allocation-bar-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #475569;
}

.allocation-bar {
    display: flex;
    height: 16px;
    border-radius: 9999px;
    overflow: hidden;
    background-color: #f1f5f9;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.allocation-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    transition: width 0.3s ease;
}

.allocation-segment.expenses { background-color: #94a3b8; }
.allocation-segment.invest { background-color: #6366f1; }
.allocation-segment.savings { background-color: #10b981; }

/* Financial Balance Info */
.balance-card-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.balance-card-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #f8fafc;
}

.balance-card-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

/* Donut Legend */
.legend-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    padding: 0.5rem;
    border-radius: 8px;
    transition: background-color 0.2s;
}

.legend-item:hover {
    background-color: #f8fafc;
}

/* Reduction Card */
.reduction-item-card {
    display: flex;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    border-radius: 12px;
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.02);
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}

.reduction-item-card:hover {
    transform: translateY(-1px);
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
}

.risk-tab-container {
    display: inline-flex;
    width: fit-content;
    background-color: #f1f5f9;
    padding: 3px;
    border-radius: 8px;
}

.risk-tab-btn {
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
}

.risk-tab-btn.active {
    background-color: #ffffff;
    color: #1e293b;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
`;

const formatRp = (value) => {
    if (value === 0) return 'Rp 0';
    return 'Rp ' + Number(value).toLocaleString('id-ID');
};

const formatRpJt = (value) => {
    if (value === 0) return 'Rp 0';
    if (value >= 1000000) {
        const millions = (value / 1000000).toFixed(1);
        return 'Rp ' + millions + 'M';
    }
    if (value >= 1000) {
        return 'Rp ' + Math.round(value / 1000) + 'k';
    }
    return 'Rp ' + value;
};

const formatRpAxis = (value) => {
    if (value === 0) return '0';
    if (value >= 1000000) return 'Rp ' + (value / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'M';
    if (value >= 1000) return 'Rp ' + (value / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + 'k';
    return 'Rp ' + value;
};

export default function InvestmentView({ expenses = [], incomes = [], currencySymbol = 'Rp', categoryColors = {} }) {
    // 1. Target Allocation States
    const [targetInvestPercent, setTargetInvestPercent] = useState(30); // Default 30%
    const [targetSavingsPercent, setTargetSavingsPercent] = useState(20); // Default 20%
    const [riskLevel, setRiskLevel] = useState('Medium'); // Risk level

    // Allocation Lock/Confirm state
    const [isAllocationLocked, setIsAllocationLocked] = useState(() => {
        return localStorage.getItem('moneymind_target_locked') === 'true';
    });

    // Load saved percentages if they exist
    useEffect(() => {
        const savedInvest = localStorage.getItem('moneymind_target_invest_percent');
        const savedSavings = localStorage.getItem('moneymind_target_savings_percent');
        if (savedInvest) setTargetInvestPercent(parseInt(savedInvest));
        if (savedSavings) setTargetSavingsPercent(parseInt(savedSavings));
    }, []);

    const handleLockToggle = () => {
        if (isAllocationLocked) {
            setIsAllocationLocked(false);
            localStorage.setItem('moneymind_target_locked', 'false');
        } else {
            setIsAllocationLocked(true);
            localStorage.setItem('moneymind_target_locked', 'true');
            localStorage.setItem('moneymind_target_invest_percent', String(targetInvestPercent));
            localStorage.setItem('moneymind_target_savings_percent', String(targetSavingsPercent));
        }
    };

    // Month Selector States — only months that have actual data
    const monthOptions = useMemo(() => {
        const monthsSet = new Set();

        [...expenses, ...incomes].forEach(item => {
            if (item.date) {
                const date = new Date(item.date);
                if (!isNaN(date.getTime())) {
                    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    monthsSet.add(ym);
                }
            }
        });

        return Array.from(monthsSet).sort().reverse();
    }, [expenses, incomes]);

    const [selectedMonth, setSelectedMonth] = useState('');
    const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
    const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
    const monthPickerRef = useRef(null);

    useEffect(() => {
        if (monthOptions.length > 0 && (!selectedMonth || !monthOptions.includes(selectedMonth))) {
            setSelectedMonth(monthOptions[0]); // default to latest month with data
        }
    }, [monthOptions, selectedMonth]);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) {
                setIsMonthPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // When picker opens, set pickerYear to the currently selected month's year
    useEffect(() => {
        if (isMonthPickerOpen && selectedMonth) {
            const [year] = selectedMonth.split('-');
            setPickerYear(parseInt(year));
        }
    }, [isMonthPickerOpen, selectedMonth]);

    const navigateMonth = (direction) => {
        const idx = monthOptions.indexOf(selectedMonth);
        if (direction === 'prev' && idx < monthOptions.length - 1) {
            setSelectedMonth(monthOptions[idx + 1]);
        } else if (direction === 'next' && idx > 0) {
            setSelectedMonth(monthOptions[idx - 1]);
        }
    };

    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const getMonthLabel = (ymStr) => {
        if (!ymStr) return '';
        const [year, month] = ymStr.split('-');
        const months = [
            'January', 'February', 'March', 'April', 'Mei', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    // Filtered data based on selectedMonth
    const filteredExpenses = useMemo(() => {
        if (!selectedMonth) return [];
        return expenses.filter(item => {
            if (!item.date) return false;
            const date = new Date(item.date);
            const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return ym === selectedMonth;
        });
    }, [expenses, selectedMonth]);

    const filteredIncomes = useMemo(() => {
        if (!selectedMonth) return [];
        return incomes.filter(item => {
            if (!item.date) return false;
            const date = new Date(item.date);
            const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return ym === selectedMonth;
        });
    }, [incomes, selectedMonth]);

    // 2. Computed Financial Totals
    const totalIncome = useMemo(() => {
        return filteredIncomes.reduce((sum, item) => sum + item.amount, 0) || 0;
    }, [filteredIncomes]);

    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, item) => sum + item.amount, 0) || 0;
    }, [filteredExpenses]);

    const targetExpensesPercent = useMemo(() => {
        return Math.max(0, 100 - targetInvestPercent - targetSavingsPercent);
    }, [targetInvestPercent, targetSavingsPercent]);

    // Computed Target Amounts in Rupiah
    const targetInvestAmount = useMemo(() => {
        return totalIncome * (targetInvestPercent / 100);
    }, [totalIncome, targetInvestPercent]);

    const targetSavingsAmount = useMemo(() => {
        return totalIncome * (targetSavingsPercent / 100);
    }, [totalIncome, targetSavingsPercent]);

    const targetExpensesAmount = useMemo(() => {
        return totalIncome * (targetExpensesPercent / 100);
    }, [totalIncome, targetExpensesPercent]);

    // 2.5. Auto-proportional Reductions for Investment and Savings
    const { fundedInvestAmount, fundedSavingsAmount, uangTersisaAmount } = useMemo(() => {
        const availableForAllocations = totalIncome - totalExpenses;
        const targetCombined = targetInvestAmount + targetSavingsAmount;

        if (availableForAllocations <= 0) {
            return { fundedInvestAmount: 0, fundedSavingsAmount: 0, uangTersisaAmount: 0 };
        } else if (availableForAllocations >= targetCombined) {
            return {
                fundedInvestAmount: targetInvestAmount,
                fundedSavingsAmount: targetSavingsAmount,
                uangTersisaAmount: availableForAllocations - targetCombined
            };
        } else {
            // Proportional reduction
            const ratio = availableForAllocations / (targetCombined || 1);
            return {
                fundedInvestAmount: targetInvestAmount * ratio,
                fundedSavingsAmount: targetSavingsAmount * ratio,
                uangTersisaAmount: 0
            };
        }
    }, [totalIncome, totalExpenses, targetInvestAmount, targetSavingsAmount]);

    // 3a. Per-category expense aggregation (used by the budget cut planner)
    const categoryExpenses = useMemo(() => {
        const aggregated = {};
        filteredExpenses.forEach(e => {
            const cat = e.category || 'Other';
            aggregated[cat] = (aggregated[cat] || 0) + e.amount;
        });
        return Object.keys(aggregated).map(cat => ({
            name: cat,
            value: aggregated[cat],
            color: categoryColors[cat] || CATEGORY_COLORS[cat] || DEFAULT_COLOR
        })).sort((a, b) => b.value - a.value);
    }, [filteredExpenses, categoryColors]);

    // 3b. High-level income allocation for the donut chart:
    // Belanja Aktual (all spending) / Investasi / Tabungan / Sisa Anggaran Aman
    const donutData = useMemo(() => {
        const segments = [
            { name: 'Safe Remaining Budget', value: Math.round(uangTersisaAmount), color: '#14b8a6' },
            { name: 'Target Investment (Funded)', value: Math.round(fundedInvestAmount), color: '#7c3aed' },
            { name: 'Target Savings (Funded)', value: Math.round(fundedSavingsAmount), color: '#22c55e' },
            { name: 'Actual Spending', value: Math.round(totalExpenses), color: '#94a3b8' },
        ];
        return segments.filter(s => s.value > 0);
    }, [uangTersisaAmount, fundedInvestAmount, fundedSavingsAmount, totalExpenses]);

    // 3.5. Current Month vs Past Month logic
    const isCurrentMonth = useMemo(() => {
        if (!selectedMonth) return false;
        const now = new Date();
        const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return selectedMonth === currentYM;
    }, [selectedMonth]);

    const remainingBudget = useMemo(() => {
        return targetExpensesAmount - totalExpenses;
    }, [targetExpensesAmount, totalExpenses]);

    // Percentage of the max spending limit already used (for progress bar)
    const spendingUsedPercent = useMemo(() => {
        if (targetExpensesAmount <= 0) return 0;
        return (totalExpenses / targetExpensesAmount) * 100;
    }, [totalExpenses, targetExpensesAmount]);

    // 4. Budget Cut Planner engine
    const overspendAmount = useMemo(() => {
        return totalExpenses - targetExpensesAmount;
    }, [totalExpenses, targetExpensesAmount]);

    const cutRecommendations = useMemo(() => {
        if (overspendAmount <= 0) return { items: [], fullyResolved: true, remainingGap: 0 };
        const recommendations = [];
        const discretionaryCats = ['Shopping', 'Food & Dining', 'Entertainment', 'Other'];
        let restToCut = overspendAmount;

        const activeExpensesData = categoryExpenses;

        activeExpensesData.forEach(item => {
            const isDiscretionary = discretionaryCats.some(c => item.name.toLowerCase().includes(c.toLowerCase()));
            if (isDiscretionary && item.value > 0) {
                const maxCutPossible = item.value * 0.45; // up to 45% cuts
                const suggestCut = Math.min(maxCutPossible, restToCut);

                if (suggestCut > 1000) {
                    const percentCut = Math.round((suggestCut / item.value) * 100);
                    let icon = '🍔';
                    if (item.name.toLowerCase().includes('shop') || item.name.toLowerCase().includes('belanja')) icon = '🛍️';
                    if (item.name.toLowerCase().includes('hibur') || item.name.toLowerCase().includes('enter')) icon = '🎬';
                    if (item.name.toLowerCase().includes('lain') || item.name.toLowerCase().includes('oth')) icon = '💼';

                    recommendations.push({
                        category: item.name,
                        currentVal: item.value,
                        suggestedCut: suggestCut,
                        remainingVal: item.value - suggestCut,
                        percentCut: percentCut,
                        icon: icon,
                        message: `Reduce spending on category **${item.name}** by **${percentCut}%** (saving ${formatRp(suggestCut)})`
                    });
                    restToCut -= suggestCut;
                }
            }
        });

        if (restToCut > 0) {
            activeExpensesData.forEach(item => {
                const alreadyCut = recommendations.some(r => r.category === item.name);
                if (!alreadyCut && item.value > 0) {
                    const maxCutPossible = item.value * 0.25; // 25% cut on others
                    const suggestCut = Math.min(maxCutPossible, restToCut);
                    if (suggestCut > 1000) {
                        const percentCut = Math.round((suggestCut / item.value) * 100);
                        recommendations.push({
                            category: item.name,
                            currentVal: item.value,
                            suggestedCut: suggestCut,
                            remainingVal: item.value - suggestCut,
                            percentCut: percentCut,
                            icon: '💡',
                            message: `Optimize spending on category **${item.name}** by **${percentCut}%** (saving ${formatRp(suggestCut)})`
                        });
                        restToCut -= suggestCut;
                    }
                }
            });
        }

        return {
            items: recommendations,
            fullyResolved: restToCut <= 0,
            remainingGap: Math.max(0, restToCut)
        };
    }, [categoryExpenses, overspendAmount]);

    // 5. Compounding Growth Projection
    const annualReturnRate = useMemo(() => {
        switch (riskLevel) {
            case 'Rendah': return 0.05; // 5%
            case 'Sedang': return 0.08; // 8%
            case 'Tinggi': return 0.12;  // 12%
            default: return 0.08;
        }
    }, [riskLevel]);

    const projectionData = useMemo(() => {
        const data = [];
        let totalAccumulated = 0;
        const monthlyRate = annualReturnRate / 12;
        const monthlyContribution = targetInvestAmount;

        data.push({
            year: 'Sekarang',
            'Capital Invested': 0,
            'Portfolio Value': 0
        });

        if (monthlyContribution === 0) {
            for (let year = 1; year <= 10; year++) {
                data.push({
                    year: `Tahun ${year}`,
                    'Capital Invested': 0,
                    'Portfolio Value': 0
                });
            }
            return data;
        }

        for (let year = 1; year <= 10; year++) {
            for (let month = 1; month <= 12; month++) {
                totalAccumulated = (totalAccumulated + monthlyContribution) * (1 + monthlyRate);
            }
            const totalPrincipal = monthlyContribution * 12 * year;
            data.push({
                year: `Thn ${year}`,
                'Capital Invested': Math.round(totalPrincipal),
                'Portfolio Value': Math.round(totalAccumulated)
            });
        }
        return data;
    }, [targetInvestAmount, annualReturnRate]);

    const finalPortfolioValue = projectionData[projectionData.length - 1]['Portfolio Value'];
    const totalInvestedAmount = projectionData[projectionData.length - 1]['Capital Invested'];
    const profitAmount = finalPortfolioValue - totalInvestedAmount;

    // Constrains maximum sum of Target Invest + Savings to 80% to ensure 20% for expenses is left
    const handleInvestSliderChange = (e) => {
        const val = parseInt(e.target.value);
        setTargetInvestPercent(val);
        if (val + targetSavingsPercent > 80) {
            setTargetSavingsPercent(80 - val);
        }
    };

    const handleSavingsSliderChange = (e) => {
        const val = parseInt(e.target.value);
        setTargetSavingsPercent(val);
        if (val + targetInvestPercent > 80) {
            setTargetInvestPercent(80 - val);
        }
    };

    const parseInlineStyles = (str) => {
        const parts = str.split('**');
        return parts.map((part, index) => {
            if (index % 2 === 1) {
                return <strong key={index} className="font-bold text-slate-900">{part}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="wealth-container">
            <style>{customCSS}</style>

            {/* Month Picker — compact bar with popup grid */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }} ref={monthPickerRef}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* Main Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        userSelect: 'none'
                    }}>
                        <button
                            type="button"
                            onClick={() => navigateMonth('prev')}
                            disabled={monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1 ? 'not-allowed' : 'pointer',
                                opacity: monthOptions.indexOf(selectedMonth) >= monthOptions.length - 1 ? 0.35 : 1,
                                transition: 'background 0.15s, opacity 0.15s'
                            }}
                        >
                            <ChevronLeft size={18} color="#475569" />
                        </button>

                        <div
                            onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                            style={{
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                minWidth: '140px'
                            }}
                        >
                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                {getMonthLabel(selectedMonth)}
                            </div>
                            {(() => {
                                const now = new Date();
                                const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                return selectedMonth === currentYM ? (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        color: '#4f46e5',
                                        fontWeight: 600,
                                        background: '#e0e7ff',
                                        padding: '2px 10px',
                                        borderRadius: '9999px',
                                        lineHeight: 1.4
                                    }}>This month</span>
                                ) : null;
                            })()}
                        </div>

                        <button
                            type="button"
                            onClick={() => navigateMonth('next')}
                            disabled={monthOptions.indexOf(selectedMonth) <= 0}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: monthOptions.indexOf(selectedMonth) <= 0 ? 'not-allowed' : 'pointer',
                                opacity: monthOptions.indexOf(selectedMonth) <= 0 ? 0.35 : 1,
                                transition: 'background 0.15s, opacity 0.15s'
                            }}
                        >
                            <ChevronRight size={18} color="#475569" />
                        </button>
                    </div>

                    {/* Month Grid Popup */}
                    {isMonthPickerOpen && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            zIndex: 50,
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                            padding: '1rem',
                            minWidth: '240px',
                            animation: 'fadeInDown 0.15s ease-out'
                        }}>
                            {/* Year Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setPickerYear(prev => prev - 1)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '6px',
                                        border: '1px solid #e2e8f0', background: '#f8fafc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ChevronLeft size={14} color="#475569" />
                                </button>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{pickerYear}</span>
                                <button
                                    type="button"
                                    onClick={() => setPickerYear(prev => prev + 1)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '6px',
                                        border: '1px solid #e2e8f0', background: '#f8fafc',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ChevronRight size={14} color="#475569" />
                                </button>
                            </div>

                            {/* Month Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                                {MONTH_SHORT.map((mLabel, mIdx) => {
                                    const ym = `${pickerYear}-${String(mIdx + 1).padStart(2, '0')}`;
                                    const hasData = monthOptions.includes(ym);
                                    const isSelected = ym === selectedMonth;
                                    return (
                                        <button
                                            key={ym}
                                            type="button"
                                            disabled={!hasData}
                                            onClick={() => {
                                                if (hasData) {
                                                    setSelectedMonth(ym);
                                                    setIsMonthPickerOpen(false);
                                                }
                                            }}
                                            style={{
                                                padding: '0.55rem 0',
                                                fontSize: '0.8rem',
                                                fontWeight: isSelected ? 700 : 500,
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: isSelected ? '#3b82f6' : hasData ? '#f1f5f9' : 'transparent',
                                                color: isSelected ? '#ffffff' : hasData ? '#334155' : '#cbd5e1',
                                                cursor: hasData ? 'pointer' : 'default',
                                                transition: 'all 0.12s'
                                            }}
                                        >
                                            {mLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Top Grid: Interactive Target Allocation Sync & Current Stats */}
            <div className="wealth-grid-top">

                {/* 1. Synced Allocation Slider Card */}
                <div className="card p-6 flex flex-col justify-between" style={{ minHeight: '340px' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                                <ArrowRightLeft size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Set Financial Targets</h3>
                        </div>
                        <p className="text-xs text-muted mb-5">
                            Set your target allocation for investment and savings. The remaining balance automatically becomes your monthly spending budget.
                        </p>

                        <div className="slider-group">
                            {/* Investment Slider */}
                            <div className="slider-wrapper">
                                <div className="slider-header">
                                    <span className="slider-title">Target Investment</span>
                                    <span className="slider-badge invest">
                                        {targetInvestPercent}% ({formatRp(targetInvestAmount)})
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="80"
                                    value={targetInvestPercent}
                                    onChange={handleInvestSliderChange}
                                    className="custom-range-slider invest-slider"
                                    disabled={isAllocationLocked}
                                />
                            </div>

                            {/* Savings Slider */}
                            <div className="slider-wrapper">
                                <div className="slider-header">
                                    <span className="slider-title">Target Savings (Emergency Fund)</span>
                                    <span className="slider-badge savings">
                                        {targetSavingsPercent}% ({formatRp(targetSavingsAmount)})
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="80"
                                    value={targetSavingsPercent}
                                    onChange={handleSavingsSliderChange}
                                    className="custom-range-slider savings-slider"
                                    disabled={isAllocationLocked}
                                />
                            </div>
                        </div>

                        {/* Lock / Confirm Toggle Button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                            <button
                                type="button"
                                onClick={handleLockToggle}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.45rem 1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    border: isAllocationLocked ? '1px solid #cbd5e1' : 'none',
                                    backgroundColor: isAllocationLocked ? '#ffffff' : '#4f46e5',
                                    color: isAllocationLocked ? '#475569' : '#ffffff',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isAllocationLocked ? (
                                    <>
                                        <span>✏️ Edit Targets</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔒 Confirm Targets</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar of allocations */}
                    <div className="allocation-bar-container">
                        <div className="allocation-bar-label">
                            <span>Your Target Allocation Formula:</span>
                            <span className="font-bold text-indigo-600">
                                {targetExpensesPercent}% Spending / {targetInvestPercent}% Investment / {targetSavingsPercent}% Savings
                            </span>
                        </div>

                        <div className="allocation-bar">
                            {targetExpensesPercent > 0 && (
                                <div
                                    className="allocation-segment expenses"
                                    style={{ width: `${targetExpensesPercent}%` }}
                                    title="Spending / Expenses"
                                >
                                    {targetExpensesPercent >= 10 ? `${targetExpensesPercent}%` : ''}
                                </div>
                            )}
                            {targetInvestPercent > 0 && (
                                <div
                                    className="allocation-segment invest"
                                    style={{ width: `${targetInvestPercent}%` }}
                                    title="Investment"
                                >
                                    {targetInvestPercent >= 10 ? `${targetInvestPercent}%` : ''}
                                </div>
                            )}
                            {targetSavingsPercent > 0 && (
                                <div
                                    className="allocation-segment savings"
                                    style={{ width: `${targetSavingsPercent}%` }}
                                    title="Savings"
                                >
                                    {targetSavingsPercent >= 10 ? `${targetSavingsPercent}%` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Real-time Balance Comparison Card */}
                <div className="card p-6 flex flex-col" style={{ minHeight: '340px' }}>
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                                <Target size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight text-slate-800">Financial Balance Comparison</h3>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
                                <span className="text-sm text-slate-600 font-medium">Monthly Income</span>
                                <strong className="text-sm font-bold text-slate-800 shrink-0">{formatRp(totalIncome)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                <span className="text-sm text-slate-600 font-medium">Spending Budget (Target)</span>
                                <strong className="text-sm font-bold text-slate-800 shrink-0">{formatRp(targetExpensesAmount)}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                <span className="text-sm text-slate-600 font-medium">Total Spending (Actual)</span>
                                <strong className="text-sm font-bold text-slate-800 shrink-0">{formatRp(totalExpenses)}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.25rem' }}>
                        {totalIncome === 0 ? (
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#fef7e0',
                                border: '1px solid #feecb5',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                fontSize: '13px',
                                color: '#b06000',
                                lineHeight: '1.6'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#b06000',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>!</div>
                                <span>No income recorded. Please enter your income transaction history in the Wallet menu.</span>
                            </div>
                        ) : overspendAmount > 0 ? (
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#fce8e6',
                                border: '1px solid #fad2cf',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                fontSize: '13px',
                                color: '#c5221f',
                                lineHeight: '1.6'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#c5221f',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>!</div>
                                <span>
                                    Your monthly spending exceeds target allocation by <strong style={{ fontWeight: 'bold', color: '#c5221f' }}>{formatRp(overspendAmount)}</strong>. Use the spending cut plan below to balance it.
                                </span>
                            </div>
                        ) : (
                            <div style={{
                                padding: '18px',
                                backgroundColor: '#e6f4ea',
                                border: '1px solid #ceead6',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                fontSize: '13px',
                                color: '#137333',
                                lineHeight: '1.6'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#137333',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}>✓</div>
                                <span>
                                    <strong style={{ fontWeight: 'bold', color: '#137333' }}>Great!</strong> Your spending is below target limits. You have a surplus of <strong style={{ fontWeight: 'bold', color: '#137333' }}>{formatRp(Math.abs(overspendAmount))}</strong> ready to be put into savings or extra investments.
                                </span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Middle Grid: Advanced Donut Chart & Actionable Cuts Recommendation */}
            <div className="wealth-grid-mid">

                {/* 3. Advanced Category Donut Chart */}
                <div className="card p-6 flex flex-col" style={{ minHeight: '380px' }}>
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg">
                                <PieIcon size={20} />
                            </div>
                            <h3 className="font-bold text-lg">Income & Spending Allocation</h3>
                        </div>

                        {donutData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <span className="text-2xl mb-1">📊</span>
                                <p className="text-xs font-semibold">No expenses recorded this month.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between" style={{ marginTop: '1rem' }}>
                                {/* Chart wrapper with fixed height to prevent collapsing */}
                                <div style={{ width: '180px', height: '180px', position: 'relative' }} className="shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={donutData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {donutData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1.5} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatRp(value)} />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Text in the center of the donut */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {totalIncome > totalExpenses ? 'Total Income' : 'Total Spent'}
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginTop: '2px' }}>
                                            {formatRp(totalIncome > totalExpenses ? totalIncome : totalExpenses)}
                                        </span>
                                    </div>
                                </div>

                                {/* Donut Legend Details */}
                                <div className="flex-1 flex flex-col gap-1.5 w-full overflow-y-auto" style={{ maxHeight: '260px' }}>
                                    {donutData.map((item) => {
                                        const denominator = Math.max(totalIncome, totalExpenses);
                                        const pct = denominator > 0 ? ((item.value / denominator) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={item.name} className="legend-item">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="shrink-0"
                                                        style={{
                                                            width: '12px',
                                                            height: '12px',
                                                            borderRadius: '3px',
                                                            backgroundColor: item.color
                                                        }}
                                                    />
                                                    <span className="font-semibold text-slate-700 truncate" style={{ maxWidth: '120px' }} title={item.name}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="text-slate-500 font-medium">
                                                    {pct}% <span className="text-slate-200 mx-1">|</span> {formatRp(item.value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {totalIncome > 0 && (
                        <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center gap-3 text-xs text-slate-500">
                            <span>Actual Spending to Budget Ratio:</span>
                            <strong className="text-slate-800 font-bold shrink-0">{spendingUsedPercent.toFixed(1)}%</strong>
                        </div>
                    )}
                </div>

                {/* 4. Actionable Budget Cut Plan / Current Month Budget */}
                <div className="card p-6 flex flex-col justify-between" style={{ minHeight: '380px' }}>
                    <div>
                        {isCurrentMonth ? (
                            <>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-2.5 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                                        <Target size={22} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight">Monthly Spending Target</h3>
                                    </div>
                                </div>

                                {totalIncome === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center gap-2">
                                        <span>💡</span>
                                        <p className="text-xs leading-relaxed max-w-[280px]">
                                            Please add your monthly income so the system can map your spending budget limit.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {/* Usage progress bar */}
                                        <div className="flex flex-col gap-2 mb-2">
                                            <div className="flex justify-between items-center gap-3">
                                                <span className="text-xs font-medium text-slate-500">Used of maximum limit</span>
                                                <span className="text-sm font-bold shrink-0" style={{ color: remainingBudget >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {spendingUsedPercent.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div style={{ height: '8px', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${Math.min(spendingUsedPercent, 100)}%`,
                                                    borderRadius: '9999px',
                                                    background: remainingBudget >= 0 ? '#10b981' : '#ef4444',
                                                    transition: 'width 0.4s ease'
                                                }} />
                                            </div>
                                        </div>

                                        {/* Summary rows */}
                                        <div style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
                                                <span className="text-sm text-slate-600 font-medium">Max Spending Limit ({targetExpensesPercent}%)</span>
                                                <strong className="text-sm font-bold text-slate-800 shrink-0">{formatRp(targetExpensesAmount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                                <span className="text-sm text-slate-600 font-medium">Current Spending</span>
                                                <strong className="text-sm font-bold text-slate-800 shrink-0">{formatRp(totalExpenses)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                                <span className="text-sm text-slate-600 font-medium">
                                                    {remainingBudget >= 0 ? 'Safe Remaining Budget' : 'Overspending'}
                                                </span>
                                                <strong className="text-sm font-bold shrink-0" style={{ color: remainingBudget >= 0 ? '#1d4ed8' : '#c5221f' }}>
                                                    {formatRp(Math.abs(remainingBudget))}
                                                </strong>
                                            </div>
                                        </div>

                                        {remainingBudget >= 0 ? (
                                            <div style={{
                                                padding: '18px',
                                                backgroundColor: '#e6f4ea',
                                                border: '1px solid #ceead6',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '12px',
                                                fontSize: '13px',
                                                color: '#137333',
                                                lineHeight: '1.6'
                                            }}>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#137333',
                                                    color: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    marginTop: '2px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold'
                                                }}>✓</div>
                                                <span>
                                                    <strong style={{ fontWeight: 'bold', color: '#137333' }}>Your budget is safe!</strong> Your spending is below the maximum limit. Maintain this spending pattern to fully fund your investment and savings targets.
                                                </span>
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '18px',
                                                backgroundColor: '#fce8e6',
                                                border: '1px solid #fad2cf',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '12px',
                                                fontSize: '13px',
                                                color: '#c5221f',
                                                lineHeight: '1.6'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#c5221f',
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        marginTop: '2px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}>!</div>
                                                    <span>
                                                        <strong style={{ fontWeight: 'bold', color: '#c5221f' }}>You have exceeded the safe spending limit!</strong> Actual expenses have reduced your investment and savings allocations.
                                                    </span>
                                                </div>
                                                <div style={{
                                                    paddingTop: '10px',
                                                    borderTop: '1px solid rgba(197, 34, 31, 0.2)',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    color: '#c5221f'
                                                }}>
                                                    ⚠️ Investment allocation shrunk to <strong>{formatRp(fundedInvestAmount)}</strong> (target: {formatRp(targetInvestAmount)}) and savings shrunk to <strong>{formatRp(fundedSavingsAmount)}</strong> (target: {formatRp(targetSavingsAmount)}).
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                                            <Sparkles size={20} />
                                        </div>
                                        <h3 className="font-bold text-lg">Spending Saving Plan</h3>
                                    </div>
                                    {overspendAmount > 0 && (
                                        <span className="badge font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs">
                                            Difference {formatRp(overspendAmount)}
                                        </span>
                                    )}
                                </div>

                                {totalIncome === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center gap-2">
                                        <span>💡</span>
                                        <p className="text-xs leading-relaxed max-w-[280px]">
                                            Please add your monthly income so the system can calculate a detailed spending saving plan for you.
                                        </p>
                                    </div>
                                ) : overspendAmount <= 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
                                            ✓
                                        </div>
                                        <h4 className="font-bold text-slate-800">Your Budget is Very Safe!</h4>
                                        <p className="text-xs text-muted max-w-[280px] leading-relaxed">
                                            Your actual monthly spending already meets the target ratio. No spending cuts are needed. Keep up the good work!
                                        </p>
                                    </div>
                                ) : cutRecommendations.items.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-slate-400">
                                        <HelpCircle size={24} />
                                        <p className="text-xs leading-relaxed max-w-[280px]">
                                            No non-essential expenses (shopping, dining out, entertainment) were detected to cut. You are advised to lower your target savings/investment allocation.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
                                        {cutRecommendations.items.map((rec) => (
                                            <div key={rec.category} className="reduction-item-card">
                                                <span className="text-base shrink-0 mt-0.5">{rec.icon}</span>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-slate-700 leading-normal" style={{ fontSize: '11px' }}>
                                                        {parseInlineStyles(rec.message)}
                                                    </p>
                                                    <p className="text-slate-400 mt-1" style={{ fontSize: '10px' }}>
                                                        Alokasi Saat Ini: <strong className="text-slate-600">{formatRp(rec.currentVal)}</strong> → Target Baru: <strong className="text-indigo-600">{formatRp(rec.remainingVal)}</strong>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {!isCurrentMonth && overspendAmount > 0 && cutRecommendations.items.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs leading-relaxed">
                            {cutRecommendations.fullyResolved ? (
                                <div className="text-emerald-600 font-semibold flex items-center gap-1.5">
                                    <span>✨</span> The spending cuts above can fully cover your budget deficit gap!
                                </div>
                            ) : (
                                <div className="text-amber-600 flex items-start gap-1">
                                    <span className="shrink-0">⚠️</span>
                                    <span>The cuts above still leave a gap of <strong>{formatRp(cutRecommendations.remainingGap)}</strong>. Try reducing your Investment/Savings targets a bit more.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Bottom Row: Future Projection Chart (compounding calculator) */}
            <div className="card p-6">
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Investment Return Projection</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Simulation of accumulated capital for monthly investment target ({targetInvestPercent}% = {formatRp(targetInvestAmount)}) with compounding interest effect
                        </p>
                    </div>
                    {/* Risk level toggle */}
                    <div className="risk-tab-container" style={{ display: 'inline-flex', width: 'fit-content' }}>
                        {['Low', 'Medium', 'High'].map((lvl) => {
                            const pct = lvl === 'Low' ? '5%' : lvl === 'Medium' ? '8%' : '12%';
                            const isActive = riskLevel === lvl;

                            let pctColor = '#64748b'; // Inactive gray
                            if (isActive) {
                                pctColor = lvl === 'Low' ? '#10b981' : lvl === 'Medium' ? '#6366f1' : '#8b5cf6';
                            }

                            return (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setRiskLevel(lvl)}
                                    className={`risk-tab-btn ${isActive ? 'active' : ''}`}
                                >
                                    {lvl} <span className="ml-1 font-bold" style={{ color: pctColor }}>({pct})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Projection Stats summary cards */}
                {(() => {
                    const profitPercent = totalInvestedAmount > 0 ? Math.round((profitAmount / totalInvestedAmount) * 100) : 0;

                    // Dynamic themes based on active risk level
                    const isRendah = riskLevel === 'Low';
                    const isSedang = riskLevel === 'Medium';

                    const themeColor = isRendah ? '#10b981' : isSedang ? '#6366f1' : '#8b5cf6';
                    const themeBg = isRendah ? '#e6f4ea' : isSedang ? '#e0e7ff' : '#f3e8ff';

                    return (
                        <>
                            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                                {/* Card 1: Total Capital Invested */}
                                <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl shrink-0">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Capital Invested</span>
                                        <span className="text-base font-extrabold text-slate-800 mt-0.5">{formatRpJt(totalInvestedAmount)}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">{formatRp(totalInvestedAmount)}</span>
                                    </div>
                                </div>

                                {/* Card 2: Potential Returns */}
                                <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Potential Returns</span>
                                        <span className="text-base font-extrabold text-emerald-600 mt-0.5">+{formatRpJt(profitAmount)}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">+{profitPercent}% of capital</span>
                                    </div>
                                </div>

                                {/* Card 3: Estimated Final Value */}
                                <div className="p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-4">
                                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: themeBg, color: themeColor }}>
                                        <BarChart2 size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: themeColor }}>Estimated Final Value</span>
                                        <span className="text-base font-extrabold mt-0.5" style={{ color: themeColor }}>{formatRpJt(finalPortfolioValue)}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">After 10 years</span>
                                    </div>
                                </div>
                            </div>

                            {/* Area Chart Wrapper with explicit height to prevent collapsing */}
                            <div style={{ width: '100%', height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={projectionData}
                                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.25} />
                                                <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis
                                            dataKey="year"
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            tickFormatter={formatRpAxis}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [formatRp(value), name]}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="Capital Invested"
                                            name="Total Capital Invested"
                                            stroke="#94a3b8"
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                            fill="#94a3b8"
                                            fillOpacity={0}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="Portfolio Value"
                                            name="Portfolio Value"
                                            stroke={themeColor}
                                            strokeWidth={3}
                                            fill="url(#portfolioFill)"
                                            dot={{ r: 2 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bottom Alert Disclaimer Box */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 18px',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #dbeafe',
                                borderRadius: '12px',
                                fontSize: '13px',
                                color: '#1e40af',
                                lineHeight: '1.5',
                                marginTop: '1.5rem'
                            }}>
                                <Info size={16} className="shrink-0 text-blue-600" />
                                <span>
                                    This projection is for illustrative purposes only. Actual returns may vary depending on market conditions. An interest rate of {isRendah ? '5%' : isSedang ? '8%' : '12%'}/year ({riskLevel === 'Low' ? 'Low' : riskLevel === 'Medium' ? 'Medium' : 'High'}) is used as a simulation assumption.
                                </span>
                            </div>
                        </>
                    );
                })()}
            </div>

        </div>
    );
}
