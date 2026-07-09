import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Color Palette
const COLORS = {
    'Food & Dining': '#3b82f6',
    'Shopping': '#10b981',
    'Transportation': '#facc15',
    'Other': '#94a3b8'
};

// --- Helper: Format number as Rp with comma separators ---
const formatRp = (value) => {
    if (value === 0) return 'Rp 0';
    return 'Rp ' + Number(value).toLocaleString('id-ID');
};

// --- Compact Rp for Y-axis ticks ---
const formatRpAxis = (value) => {
    if (value === 0) return '0';
    if (value >= 1000000) return 'Rp ' + (value / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'M';
    if (value >= 1000) return 'Rp ' + (value / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + 'k';
    return 'Rp ' + value;
};

// --- Custom Tooltip for money charts ---
const MoneyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 14px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)', fontSize: '13px' }}>
                {label && <p style={{ marginBottom: '4px', color: '#64748b', fontWeight: 600 }}>{label}</p>}
                <p style={{ color: '#8b5cf6', fontWeight: 700 }}>{formatRp(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

// --- Daily Spending Trend Data ---
export function DailySpendingTrend({ expenses }) {
    const data = useMemo(() => {
        // 1. Group by date
        const grouped = expenses.reduce((acc, curr) => {
            const dateStr = curr.date; // e.g. "2024-01-15"
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return acc;

            const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!acc[dateStr]) {
                acc[dateStr] = { original: dateStr, name: displayDate, value: 0 };
            }
            acc[dateStr].value += curr.amount;
            return acc;
        }, {});

        // 2. Convert to array, sort, and filter for last 30 days relative to latest transaction
        const sorted = Object.values(grouped).sort((a, b) => new Date(a.original) - new Date(b.original));
        if (sorted.length === 0) return [];
        
        const latestDate = new Date(sorted[sorted.length - 1].original);
        const cutoffDate = new Date(latestDate);
        cutoffDate.setDate(latestDate.getDate() - 30);
        
        return sorted.filter(item => new Date(item.original) >= cutoffDate);
    }, [expenses]);

    return (
        <div className="card h-full flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Daily Spending Trend (Last 30 Days)</h3>
            <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatRpAxis} width={90} />
                        <Tooltip content={<MoneyTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- Spending by Category (Pie/Donut) ---
export function SpendingByCategory({ expenses, categoryColors = {} }) {
    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    }, [expenses]);

    const data = useMemo(() => {
        const grouped = expenses.reduce((acc, curr) => {
            const cat = curr.category || 'Other';
            if (!acc[cat]) acc[cat] = 0;
            acc[cat] += curr.amount;
            return acc;
        }, {});

        return Object.keys(grouped).map(cat => ({
            name: cat,
            value: totalSpent > 0 ? Number(((grouped[cat] / totalSpent) * 100).toFixed(1)) : 0, // Percentage with 1 decimal
            rawTotal: grouped[cat],
            color: categoryColors[cat] || COLORS[cat] || COLORS['Other']
        })).sort((a, b) => b.rawTotal - a.rawTotal);
    }, [expenses, categoryColors, totalSpent]);

    return (
        <div className="card h-full flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Spending by Category</h3>
            {data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted text-sm" style={{ minHeight: '200px' }}>
                    No spend data yet
                </div>
            ) : (
                <div className="flex-1 flex flex-row gap-4 items-center justify-between" style={{ minHeight: 0 }}>
                    {/* Donut Chart with center text */}
                    <div style={{ width: '170px', height: '170px', position: 'relative' }} className="shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={2}
                                    dataKey="rawTotal"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={1.5} />
                                    ))}
                                </Pie>
                                <Tooltip content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const entry = payload[0].payload;
                                        return (
                                            <div style={{ background: '#fff', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.15)', fontSize: '13px' }}>
                                                <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{entry.name}</p>
                                                <p style={{ color: entry.color, fontWeight: 600 }}>{entry.value}%</p>
                                                <p style={{ color: '#64748b', fontSize: '12px' }}>{formatRp(entry.rawTotal)}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }} />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center text inside the donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '7.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Spent
                            </span>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                                {formatRp(totalSpent)}
                            </span>
                        </div>
                    </div>

                    {/* Donut Legend Details list matching mockup */}
                    <div className="flex-1 flex flex-col gap-2 w-full overflow-y-auto self-stretch" style={{ minHeight: 0 }}>
                        {data.map((item) => (
                            <div key={item.name} className="flex justify-between items-center text-xs p-1 rounded-md transition-colors hover:bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="shrink-0" 
                                        style={{ 
                                            width: '10px', 
                                            height: '10px', 
                                            borderRadius: '3px', 
                                            backgroundColor: item.color 
                                        }}
                                    />
                                    <span className="font-semibold text-slate-700 truncate" style={{ maxWidth: '110px' }} title={item.name}>
                                        {item.name}
                                    </span>
                                </div>
                                <div className="text-slate-500 font-medium text-right shrink-0">
                                    {item.value.toFixed(1)}% <span className="text-slate-200 mx-1">|</span> {formatRp(item.rawTotal)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Expenses by Category (Bar) ---
export function ExpensesByCategory({ expenses, categoryColors = {} }) {
    const data = useMemo(() => {
        const grouped = expenses.reduce((acc, curr) => {
            const cat = curr.category || 'Other';
            if (!acc[cat]) acc[cat] = 0;
            acc[cat] += curr.amount;
            return acc;
        }, {});

        return Object.keys(grouped).map(cat => ({
            name: cat,
            value: grouped[cat]
        })).sort((a, b) => b.value - a.value);
    }, [expenses]);

    return (
        <div className="card h-full flex flex-col">
            <h3 className="font-bold text-md text-primary mb-4">Expenses by Category</h3>
            <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={formatRpAxis} width={90} />
                        <Tooltip content={<MoneyTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => {
                                const color = categoryColors[entry.name] || COLORS[entry.name] || COLORS['Other'];
                                return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default {
    DailySpendingTrend,
    SpendingByCategory,
    ExpensesByCategory
};
