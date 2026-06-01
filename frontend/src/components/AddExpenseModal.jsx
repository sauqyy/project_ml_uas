import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddExpenseModal({ isOpen, onClose, onAdd, currencySymbol = '$' }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        desc: '',
        amount: '',
        category: 'Food & Dining',
        date: new Date().toISOString().split('T')[0] // Default to today YYYY-MM-DD
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd({
            ...formData,
            amount: parseFloat(formData.amount),
            displayDate: new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        });
        setFormData({ desc: '', amount: '', category: 'Food & Dining', date: new Date().toISOString().split('T')[0] });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Add New Expense</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <input
                            required
                            className="form-input"
                            placeholder="e.g. Lunch at Cafe"
                            value={formData.desc}
                            onChange={e => setFormData({ ...formData, desc: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="form-group flex-1">
                            <label className="form-label">Amount ({currencySymbol})</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-input"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Category</label>
                            <select
                                className="form-input"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option>Food & Dining</option>
                                <option>Shopping</option>
                                <option>Transportation</option>
                                <option>Bills & Utilities</option>
                                <option>Entertainment</option>
                                <option>Healthcare</option>
                                <option>Other</option>
                            </select>
                        </div>
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
                        <button type="submit" className="btn-primary">Add Expense</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
