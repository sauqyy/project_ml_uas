import React, { useState, useEffect } from 'react';
import { 
    Utensils, 
    ShoppingBag, 
    Car, 
    Plane, 
    Stethoscope, 
    ArrowRightLeft, 
    Zap, 
    Briefcase,
    Sparkles 
} from 'lucide-react';

// Icon mapping helper
const getIcon = (category) => {
    switch (category) {
        case 'Food & Dining':
        case 'Makanan & Minuman':
            return Utensils;
        case 'Shopping':
        case 'Belanja':
        case 'Perabotan':
            return ShoppingBag;
        case 'Transportation':
        case 'Transportasi':
            return Car;
        case 'Tiket Pesawat':
        case 'Travel':
            return Plane;
        case 'Healthcare':
        case 'Kesehatan':
        case 'Rumah Sakit':
            return Stethoscope;
        case 'Transfer':
            return ArrowRightLeft;
        case 'Bills & Utilities':
        case 'Tagihan':
            return Zap;
        default:
            return Briefcase;
    }
};

// Date formatter helper (English layout: Jul 2, Jun 29, etc.)
const formatDateEng = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
};

export default function AnomalyDetector({ expenses = [], currencySymbol = '$' }) {
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deciding, setDeciding] = useState(null); // id currently being decided

    const userEmail = (() => {
        const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
        return session.email || 'demo@moneymind.com';
    })();

    useEffect(() => {
        setLoading(true);
        fetch('/api/anomalies', { headers: { 'X-User-Email': userEmail } })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch anomalies");
                return res.json();
            })
            .then(data => setAnomalies(Array.isArray(data) ? data : []))
            .catch(err => console.error("Error fetching anomalies:", err))
            .finally(() => setLoading(false));
    }, [expenses]);

    const handleDecide = (id, keepAsRoutine) => {
        setDeciding(id);
        fetch('/api/anomalies/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
            body: JSON.stringify({ transaksi_id: id, keep_as_routine: keepAsRoutine }),
        })
            .then(res => res.json())
            .then(() => setAnomalies(prev => prev.filter(item => item.id !== id)))
            .catch(err => console.error("Error deciding anomaly:", err))
            .finally(() => setDeciding(null));
    };

    if (loading) {
        return (
            <div className="card anomaly-container flex items-center justify-center p-6 bg-white">
                <p className="text-sm text-muted">Running AI Anomaly Detection...</p>
            </div>
        );
    }

    if (anomalies.length === 0) {
        return (
            <div className="card anomaly-container empty-state flex items-center justify-center p-6 text-center bg-white">
                <div className="flex flex-col items-center gap-2">
                    <div className="ai-success-icon">
                        <Sparkles size={22} className="text-emerald" style={{ color: 'var(--success)' }} />
                    </div>
                    <h3 className="font-bold text-lg text-primary mt-2">All Transactions Normal!</h3>
                    <p className="text-sm text-muted" style={{ maxWidth: '400px' }}>
                        The AI model (Modified Z-Score based on Median + MAD) did not find any suspicious expenses that need your review.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card anomaly-container flex flex-col gap-4 bg-white">
            {/* Header section matching the mockup */}
            <div className="anomaly-header">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-primary">Transactions to check</h3>
                    <span className="text-sm text-muted font-medium">
                        {anomalies.length} awaiting decision
                    </span>
                </div>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                    These amounts are far from your usual spending habits. Let us know if this is a recurring expense or just a one-off, so that future forecasts stay accurate.
                </p>
            </div>

            {/* List of anomalies */}
            <div className="flex flex-col gap-3">
                {anomalies.map((item) => {
                    const ratioVal = item.ratio || 1.0;
                    const displayTitle = item.category ? `${item.title} — ${item.category}` : item.title;
                    const IconComponent = getIcon(item.category);
                    
                    return (
                        <div key={item.id} className="anomaly-card-item flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white">
                            <div className="flex items-center gap-3">
                                {/* Icon container */}
                                <div className="anomaly-icon-box flex items-center justify-center bg-slate-50 text-slate-500 rounded-lg p-2.5 w-11 h-11">
                                    <IconComponent size={20} className="text-slate-500" />
                                </div>
                                {/* Text details */}
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-sm text-primary">{displayTitle}</span>
                                    <span className="text-xs text-muted">
                                        {formatDateEng(item.date)} · {ratioVal}x of your average
                                    </span>
                                </div>
                            </div>
                            
                            {/* Actions and Amount group */}
                            <div className="flex items-center gap-4">
                                <span className="text-base font-bold text-slate-800">
                                    {currencySymbol === '$' ? 'Rp' : currencySymbol} {Math.round(Number(item.amount) || 0).toLocaleString('en-US').replace(/,/g, '.')}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        className="btn-anomaly-action btn-anomaly-outline"
                                        disabled={deciding === item.id}
                                        onClick={() => handleDecide(item.id, true)}
                                    >
                                        Routine
                                    </button>
                                    <button
                                        className="btn-anomaly-action btn-anomaly-filled"
                                        disabled={deciding === item.id}
                                        onClick={() => handleDecide(item.id, false)}
                                    >
                                        One-off
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
