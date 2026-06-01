import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, Check, Sparkles } from 'lucide-react';

export default function AnomalyDetector({ expenses = [], currencySymbol = '$' }) {
    // Initial mock data for dummy anomaly feed
    const [anomalies, setAnomalies] = useState([
        {
            id: 1,
            type: 'spike',
            category: 'Food & Dining',
            title: 'Pengeluaran Tidak Wajar (Spike)',
            description: `Pengeluaran sebesar ${currencySymbol}120.00 untuk "Makan Malam Mewah" lebih tinggi 3.5x lipat dari rata-rata harian kategori Food & Dining Anda (${currencySymbol}34.00).`,
            severity: 'high',
            date: '31 Mei 2026'
        },
        {
            id: 2,
            type: 'duplicate',
            category: 'Bills & Utilities',
            title: 'Kemungkinan Transaksi Ganda',
            description: `Terdeteksi 2 transaksi identik masing-masing sebesar ${currencySymbol}15.00 untuk "Netflix Subscription" dalam selang waktu hanya 3 menit.`,
            severity: 'medium',
            date: '28 Mei 2026'
        },
        {
            id: 3,
            type: 'recurring',
            category: 'Entertainment',
            title: 'Tagihan Baru Terdeteksi',
            description: `Langganan bulanan baru untuk "Adobe Creative Suite" sebesar ${currencySymbol}49.99 terdeteksi pertama kali. Kami menyarankan untuk memeriksa apakah ini tagihan terotorisasi.`,
            severity: 'info',
            date: '25 Mei 2026'
        }
    ]);

    const handleDismiss = (id) => {
        setAnomalies(prev => prev.filter(item => item.id !== id));
    };

    if (anomalies.length === 0) {
        return (
            <div className="card anomaly-container empty-state flex items-center justify-center p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="ai-success-icon">
                        <Sparkles size={22} className="text-emerald" style={{ color: 'var(--success)' }} />
                    </div>
                    <h3 className="font-bold text-lg text-primary mt-2">Semua Transaksi Wajar!</h3>
                    <p className="text-sm text-muted" style={{ maxWidth: '400px' }}>
                        AI tidak mendeteksi adanya pengeluaran tidak biasa atau mencurigakan bulan ini. Kerja bagus dalam menjaga anggaran Anda!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card anomaly-container flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert size={20} className="text-indigo-500" style={{ color: 'var(--primary)' }} />
                    <h3 className="font-bold text-lg">AI Deteksi Anomali</h3>
                    <span className="badge-ai">
                        <span className="pulse-dot"></span>
                        AI Active
                    </span>
                </div>
                <span className="text-xs text-muted font-medium bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {anomalies.length} Anomali Ditemukan
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {anomalies.map((item) => (
                    <div key={item.id} className={`anomaly-item severity-${item.severity} flex gap-3 p-3 rounded-lg border`}>
                        <div className="anomaly-icon-wrapper flex items-start mt-0.5">
                            <AlertTriangle size={18} className="icon-alert" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-bold text-sm text-primary">{item.title}</span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white shadow-sm border text-slate-600">
                                    {item.category}
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                                <span className="text-[10px] text-muted font-medium">{item.date}</span>
                                <div className="flex gap-2">
                                    <button 
                                        className="btn-action btn-dismiss text-xs"
                                        onClick={() => handleDismiss(item.id)}
                                        title="Abaikan peringatan ini"
                                    >
                                        <X size={12} /> Abaikan
                                    </button>
                                    <button 
                                        className="btn-action btn-resolve text-xs"
                                        onClick={() => handleDismiss(item.id)}
                                        title="Tandai transaksi sebagai wajar"
                                    >
                                        <Check size={12} /> Tandai Wajar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
