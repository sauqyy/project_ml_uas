import React from 'react';
import { X } from 'lucide-react';

const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export default function SettingsModal({ isOpen, onClose, currency, setCurrency }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select
                        value={currency.code}
                        onChange={(e) => {
                            const selected = CURRENCIES.find(c => c.code === e.target.value);
                            setCurrency(selected);
                        }}
                        className="form-input"
                    >
                        {CURRENCIES.map((curr) => (
                            <option key={curr.code} value={curr.code}>
                                {curr.symbol} - {curr.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted mt-2">
                        Select your preferred currency symbol for the dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
