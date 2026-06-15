import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// Color Palette
const COLORS = {
    'Food & Dining': '#3b82f6', // Blue
    'Shopping': '#10b981', // Emerald
    'Transportation': '#facc15', // Yellow
    'Bills & Utilities': '#f97316', // Orange
    'Entertainment': '#c084fc', // Purple
    'Healthcare': '#818cf8', // Indigo
    'Other': '#94a3b8', // Slate
    'Transportasi': '#facc15', // Yellow
    'Makanan': '#3b82f6', // Blue
    'Kebutuhan': '#10b981', // Emerald
    'Lain-lain': '#94a3b8' // Slate
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

        // 2. Convert to array and sort by date
        return Object.values(grouped).sort((a, b) => new Date(a.original) - new Date(b.original));
    }, [expenses]);

    return (
        <div className="card h-full flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Daily Spending Trend</h3>
            <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
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

// --- Spending by Category (Pie) ---
export function SpendingByCategory({ expenses }) {
    const data = useMemo(() => {
        const grouped = expenses.reduce((acc, curr) => {
            const cat = curr.category || 'Other';
            if (!acc[cat]) acc[cat] = 0;
            acc[cat] += curr.amount;
            return acc;
        }, {});

        const total = Object.values(grouped).reduce((a, b) => a + b, 0);

        return Object.keys(grouped).map(cat => ({
            name: cat,
            value: total > 0 ? Number(((grouped[cat] / total) * 100).toFixed(0)) : 0, // Percentage
            rawTotal: grouped[cat],
            color: COLORS[cat] || COLORS['Other']
        })).sort((a, b) => b.value - a.value);
    }, [expenses]);

    return (
        <div className="card h-full flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Spending by Category</h3>
            <div className="flex-1 w-full flex items-center justify-center relative" style={{ minHeight: '200px' }}>
                {data.length === 0 ? (
                    <div className="text-muted text-sm">No spend data yet</div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius={80}
                                paddingAngle={1}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </div>
            {data.length > 0 && (
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted mt-2">
                    {data.map(d => (
                        <div key={d.name} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span>{d.name} {d.value}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Expenses by Category (Bar) ---
export function ExpensesByCategory({ expenses }) {
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
            <h3 className="text-sm font-medium text-muted mb-4">Expenses by Category</h3>
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
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS['Other']} />
                            ))}
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
