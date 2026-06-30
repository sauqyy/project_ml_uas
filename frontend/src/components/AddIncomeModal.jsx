import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddIncomeModal({ isOpen, onClose, onAdd, currencySymbol = '$' }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        source: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [displayAmount, setDisplayAmount] = useState('');

    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, ''); // Only digits
        const formatted = rawValue ? new Intl.NumberFormat('en-US').format(parseInt(rawValue, 10)) : '';
        setDisplayAmount(formatted);
        setFormData({ ...formData, amount: rawValue });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            ...formData,
            amount: parseFloat(formData.amount),
        });
        setFormData({ source: '', amount: '', date: new Date().toISOString().split('T')[0] });
        setDisplayAmount('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Add Income</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Source</label>
                        <input
                            required
                            className="form-input"
                            placeholder="e.g. Salary, Freelance"
                            value={formData.source}
                            onChange={e => setFormData({ ...formData, source: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Amount ({currencySymbol})</label>
                        <input
                            required
                            type="text"
                            className="form-input"
                            placeholder="0"
                            value={displayAmount}
                            onChange={handleAmountChange}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Add to Wallet</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
