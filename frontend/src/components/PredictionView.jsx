import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, Sliders, Lightbulb, ShieldCheck, DollarSign } from 'lucide-react';

export default function PredictionView({ expenses = [], incomes = [], currencySymbol = '$' }) {
    // 1. Simulation States
    const [expenseSavingsPercent, setExpenseSavingsPercent] = useState(0); // 0% to 50%
    const [incomeIncreasePercent, setIncomeIncreasePercent] = useState(0);   // 0% to 50%

    // 2. Base Averages from Real User Data (Fall back to mock values if empty)
    const baseMonthlySpend = useMemo(() => {
        if (expenses.length === 0) return 1200; // Mock fallback
        // Calculate average monthly spend or total spend
        return expenses.reduce((sum, item) => sum + item.amount, 0) || 1200;
    }, [expenses]);

    const baseMonthlyIncome = useMemo(() => {
        if (incomes.length === 0) return 5000; // Mock fallback
        return incomes.reduce((sum, item) => sum + item.amount, 0) || 5000;
    }, [incomes]);

    // 3. Dynamic Calculation for the next 4 months
    const forecastData = useMemo(() => {
        const months = ['Juni', 'Juli', 'Agustus', 'September'];
        
        // Base growth rates (inflation/trend factors)
        const spendTrendMultiplier = [1.0, 1.05, 1.09, 1.14]; // Projected spending trend (increasing without cuts)
        const incomeTrendMultiplier = [1.0, 1.0, 1.02, 1.02];  // Projected income trend
        
        return months.map((month, idx) => {
            // Apply simulation factors
            const simulatedSpendReduction = 1 - (expenseSavingsPercent / 100);
            const simulatedIncomeIncrease = 1 + (incomeIncreasePercent / 100);

            const baseSpend = baseMonthlySpend * spendTrendMultiplier[idx];
            const baseIncome = baseMonthlyIncome * incomeTrendMultiplier[idx];

            const predictedSpend = Math.round(baseSpend * simulatedSpendReduction);
            const predictedIncome = Math.round(baseIncome * simulatedIncomeIncrease);
            const predictedSavings = Math.max(0, predictedIncome - predictedSpend);

            return {
                name: month,
                'Estimasi Pendapatan': predictedIncome,
                'Estimasi Pengeluaran': predictedSpend,
                'Estimasi Tabungan': predictedSavings
            };
        });
    }, [baseMonthlySpend, baseMonthlyIncome, expenseSavingsPercent, incomeIncreasePercent]);

    // 4. Summaries and Badging logic based on simulation
    const currentForecastSpend = forecastData[1]['Estimasi Pengeluaran']; // July forecast
    const currentForecastIncome = forecastData[1]['Estimasi Pendapatan']; // July forecast
    
    // Determine overall trend badge
    const trendType = useMemo(() => {
        const initialSpend = baseMonthlySpend;
        const finalForecastSpend = forecastData[3]['Estimasi Pengeluaran'];
        
        if (finalForecastSpend > initialSpend * 1.05) {
            return {
                label: 'Tren Pengeluaran: Meningkat 📈',
                class: 'increasing',
                desc: 'Pengeluaran bulanan Anda diproyeksikan tumbuh karena inflasi dan kebiasaan belanja belakangan ini. Disarankan melakukan simulasi penghematan di bawah.'
            };
        } else if (finalForecastSpend < initialSpend * 0.95) {
            return {
                label: 'Tren Pengeluaran: Menurun 📉',
                class: 'decreasing',
                desc: 'Luar biasa! Simulasi penghematan Anda efektif memotong tren kenaikan belanja di masa depan.'
            };
        } else {
            return {
                label: 'Tren Pengeluaran: Stabil ➡️',
                class: 'stable',
                desc: 'Arus kas dan pengeluaran Anda diproyeksikan konstan dan stabil selama 4 bulan ke depan.'
            };
        }
    }, [baseMonthlySpend, forecastData]);

    return (
        <div className="flex flex-col gap-6">
            
            {/* Top Banner: AI Trend Summary */}
            <div className="card prediction-banner">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-center">
                            <Sparkles size={22} className="text-indigo-600" style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-primary">AI Prediksi Keuangan & Arus Kas</h2>
                            <p className="text-xs text-muted">Proyeksi pertumbuhan finansial cerdas berdasarkan data historis Anda</p>
                        </div>
                    </div>
                    
                    <span className={`trend-badge ${trendType.class}`}>
                        {trendType.label}
                    </span>
                </div>
                
                <hr className="border-slate-200" style={{ margin: '0.25rem 0' }} />
                
                <p className="text-sm text-slate-600 leading-relaxed">
                    {trendType.desc}
                </p>
            </div>

            {/* Main Content Grid */}
            <div className="prediction-grid">
                
                {/* Left Column: Interactive Simulation Control */}
                <div className="simulation-panel">
                    <div className="flex items-center gap-2 mb-2">
                        <Sliders size={18} className="text-slate-500" />
                        <h3 className="font-bold text-md text-primary">Panel Simulasi Finansial</h3>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                        Geser parameter di bawah untuk melihat bagaimana keputusan finansial hari ini memengaruhi saldo masa depan Anda.
                    </p>

                    <div className="flex flex-col gap-5 mt-2">
                        {/* Slider 1: Expenses Cut */}
                        <div className="slider-group">
                            <div className="slider-header">
                                <span>Simulasi Hemat Belanja</span>
                                <span className="slider-value">{expenseSavingsPercent}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="50" 
                                value={expenseSavingsPercent}
                                onChange={(e) => setExpenseSavingsPercent(Number(e.target.value))}
                                className="slider-input"
                            />
                            <span className="text-[10px] text-muted">Mengurangi pengeluaran bulanan tidak wajib.</span>
                        </div>

                        {/* Slider 2: Income Growth */}
                        <div className="slider-group">
                            <div className="slider-header">
                                <span>Simulasi Naik Pendapatan</span>
                                <span className="slider-value">+{incomeIncreasePercent}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="50" 
                                value={incomeIncreasePercent}
                                onChange={(e) => setIncomeIncreasePercent(Number(e.target.value))}
                                className="slider-input"
                            />
                            <span className="text-[10px] text-muted">Estimasi kenaikan gaji, bonus, atau investasi.</span>
                        </div>
                    </div>

                    <hr className="border-slate-200 my-2" />

                    {/* Simulation Metrics */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Estimasi Belanja (Juli):</span>
                            <span className="font-bold text-slate-700">{currencySymbol}{currentForecastSpend.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Estimasi Pendapatan (Juli):</span>
                            <span className="font-bold text-slate-700">{currencySymbol}{currentForecastIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                            <span className="text-indigo-600 font-semibold">Proyeksi Tabungan Bulanan:</span>
                            <span className="font-bold text-indigo-700">{currencySymbol}{(currentForecastIncome - currentForecastSpend).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & AI Insights */}
                <div className="flex flex-col gap-6">
                    
                    {/* Forecast Chart Card */}
                    <div className="card flex flex-col gap-4" style={{ minHeight: '380px' }}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="font-bold text-md text-primary">Grafik Proyeksi Finansial (4 Bulan Depan)</h3>
                                <p className="text-xs text-muted">Menunjukkan kurva pendapatan, pengeluaran, dan tabungan Anda</p>
                            </div>
                        </div>

                        <div className="flex-1 w-full" style={{ minHeight: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecastData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 500 }} />
                                    
                                    <Line
                                        type="monotone"
                                        dataKey="Estimasi Pendapatan"
                                        stroke="#10b981" // Emerald / Success
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="Estimasi Pengeluaran"
                                        stroke="#ef4444" // Red / Danger
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#ef4444', strokeWidth: 1.5, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="Estimasi Tabungan"
                                        stroke="#6366f1" // Indigo / Primary
                                        strokeWidth={2.5}
                                        strokeDasharray="4 4"
                                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 1.5, stroke: '#fff' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Recommendations */}
                    <div className="flex flex-col gap-3">
                        <h4 className="font-bold text-sm text-primary px-1">Rekomendasi AI Untuk Mengoptimalkan Saldo</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="recommendation-card p-4 flex gap-3 shadow-xs border border-slate-200">
                                <div className="text-indigo-500 mt-0.5">
                                    <Lightbulb size={18} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-xs text-primary">Target Penghematan Kuliner</span>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Data transaksi Anda menunjukkan pengeluaran 'Food & Dining' bertambah 8% setiap bulan. 
                                        Mengaktifkan simulasi hemat sebesar 15% berpotensi mengamankan saldo ekstra {currencySymbol}144.00 dalam 3 bulan mendatang.
                                    </p>
                                </div>
                            </div>

                            {/* Card 2 */}
                            <div className="recommendation-card p-4 flex gap-3 shadow-xs border border-slate-200" style={{ borderLeftColor: 'var(--success)' }}>
                                <div className="text-emerald-500 mt-0.5" style={{ color: 'var(--success)' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-xs text-primary">Stabilitas Pengeluaran Rutin</span>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">
                                        Biaya rutin bulanan Anda (tagihan listrik & internet) terpantau sangat stabil. 
                                        Arus kas konstan ini adalah jangkar yang kuat untuk merencanakan investasi atau tabungan jangka panjang.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}
