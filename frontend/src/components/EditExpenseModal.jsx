import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import CategorySelect from './CategorySelect';

export default function EditExpenseModal({ isOpen, onClose, onEdit, expense, categories = [], onAddCategory, onDeleteCategory, currencySymbol = '$' }) {
    if (!isOpen || !expense) return null;

    const [formData, setFormData] = useState({
        desc: '',
        amount: '',
        category: '',
        date: ''
    });
    const [displayAmount, setDisplayAmount] = useState('');

    useEffect(() => {
        if (expense) {
            setFormData({
                desc: expense.desc || '',
                amount: expense.amount.toString() || '',
                category: expense.category || (categories[0] || 'Food & Dining'),
                date: expense.date || ''
            });
            // Format the initial amount
            const initialAmount = expense.amount;
            setDisplayAmount(initialAmount ? new Intl.NumberFormat('en-US').format(Math.floor(initialAmount)) : '');
        }
    }, [expense, categories]);

    const handleAmountChange = (e) => {
        const rawValue = e.target.value.replace(/[^\d]/g, ''); // Only digits
        const formatted = rawValue ? new Intl.NumberFormat('en-US').format(parseInt(rawValue, 10)) : '';
        setDisplayAmount(formatted);
        setFormData({ ...formData, amount: rawValue });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onEdit(expense.id, {
            ...formData,
            category: formData.category || categories[0] || 'Other',
            amount: parseFloat(formData.amount),
            displayDate: new Date(formData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        });
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Edit Expense</h2>
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
                                type="text"
                                className="form-input"
                                placeholder="0"
                                value={displayAmount}
                                onChange={handleAmountChange}
                            />
                        </div>

                        <div className="form-group flex-1">
                            <label className="form-label">Category</label>
                            <CategorySelect
                                value={formData.category}
                                onChange={cat => setFormData({ ...formData, category: cat })}
                                categories={categories}
                                onAddCategory={onAddCategory}
                                onDeleteCategory={onDeleteCategory}
                            />
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
                        <button type="submit" className="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
