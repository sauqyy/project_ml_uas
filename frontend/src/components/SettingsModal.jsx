import React, { useState } from 'react';
import { X } from 'lucide-react';
import CustomColorPicker from './CustomColorPicker';

const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export default function SettingsModal({ isOpen, onClose, currency, setCurrency, onUploadSuccess, onResetData, setIsSecretUnlocked, categories = [], categoryColors = {}, onUpdateCategoryColor }) {
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ success: false, message: '' });
    const [titleClicks, setTitleClicks] = useState(0);
    const [activeColorPicker, setActiveColorPicker] = useState(null);

    const handleColorButtonClick = (e, cat) => {
        e.stopPropagation();
        if (activeColorPicker && activeColorPicker.category === cat) {
            setActiveColorPicker(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const parent = e.currentTarget.closest('.modal-content');
            if (parent) {
                const parentRect = parent.getBoundingClientRect();
                // Position popup relative to modal-content
                const top = rect.bottom - parentRect.top + 5;
                const left = rect.left - parentRect.left - 210; // align popup right edge to button
                setActiveColorPicker({
                    category: cat,
                    top: top,
                    left: left
                });
            }
        }
    };

    const handleModalContentClick = (e) => {
        e.stopPropagation();
        if (!e.target.closest('.color-trigger-btn') && !e.target.closest('.custom-picker-popover')) {
            setActiveColorPicker(null);
        }
    };

    const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
    const userEmail = session.email || '';
    const exportUrl = userEmail ? `/api/export?email=${encodeURIComponent(userEmail)}` : '/api/export';

    const handleTitleClick = () => {
        const newClicks = titleClicks + 1;
        setTitleClicks(newClicks);
        if (newClicks >= 5) {
            setIsSecretUnlocked(true);
            alert("✨ Secret feature 'AI Labeling' has been unlocked! Please check the new tab next to 'Financial Prediction' to confirm your transaction categories.");
            onClose(); // Close the settings modal immediately
        }
    };

    const handleResetClick = () => {
        const confirmFirst = window.confirm("Are you sure you want to delete all transaction data (Expenses & Income)?");
        if (confirmFirst) {
            const confirmSecond = window.confirm("THIS ACTION CANNOT BE UNDONE! All your financial history will be permanently deleted. Are you absolutely sure?");
            if (confirmSecond) {
                onResetData().then(() => {
                    alert("All transaction data successfully deleted.");
                    onClose();
                });
            }
        }
    };

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadStatus({ success: false, message: '' });

        const formData = new FormData();
        formData.append('file', file);

        const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
        const userEmail = session.email || 'demo@moneymind.com';

        fetch('/api/upload', {
            method: 'POST',
            body: formData,
            headers: {
                'X-User-Email': userEmail
            }
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Failed to upload file');
                }
                return data;
            })
            .then((data) => {
                setUploadStatus({
                    success: true,
                    message: `Success! Imported ${data.expenses_imported} expenses and ${data.incomes_imported} incomes with auto-classification by AI.`
                });
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
            })
            .catch((err) => {
                console.error("Error uploading file:", err);
                setUploadStatus({
                    success: false,
                    message: `Failed: ${err.message}`
                });
            })
            .finally(() => {
                setUploading(false);
            });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ position: 'relative' }} onClick={handleModalContentClick}>
                <div className="flex justify-between items-center mb-6">
                    <h2 
                        onClick={handleTitleClick} 
                        className="text-xl font-bold cursor-pointer select-none hover:text-primary transition-colors"
                        title="Click 5 times for Secret Mode"
                    >
                        Settings
                    </h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="form-group mb-6">
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

                <hr className="border-slate-200 my-6" />

                <div className="form-group mb-6">
                    <style>{`
                        .color-picker-input {
                            -webkit-appearance: none;
                            -moz-appearance: none;
                            appearance: none;
                            width: 24px;
                            height: 24px;
                            background-color: transparent;
                            border: none;
                            cursor: pointer;
                            padding: 0;
                        }
                        .color-picker-input::-webkit-color-swatch {
                            border-radius: 50%;
                            border: 2px solid #ffffff;
                            box-shadow: 0 0 0 1px #cbd5e1;
                        }
                        .color-picker-input::-moz-color-swatch {
                            border-radius: 50%;
                            border: 2px solid #ffffff;
                            box-shadow: 0 0 0 1px #cbd5e1;
                        }
                        .category-color-list {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 0.75rem;
                            max-height: 180px;
                            overflow-y: auto;
                            padding-right: 0.5rem;
                        }
                        /* Sleek custom scrollbar */
                        .category-color-list::-webkit-scrollbar {
                            width: 6px;
                        }
                        .category-color-list::-webkit-scrollbar-track {
                            background: #f1f5f9;
                            border-radius: 9999px;
                        }
                        .category-color-list::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 9999px;
                        }
                        .category-color-list::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
                        
                        .category-color-item {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 0.5rem 0.75rem;
                            border-radius: 10px;
                            background-color: #ffffff;
                            border: 1px solid #e2e8f0;
                            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
                            transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
                        }
                        .category-color-item:hover {
                            border-color: #cbd5e1;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                            transform: translateY(-1px);
                        }
                        .category-color-name {
                            font-size: 0.75rem;
                            font-weight: 600;
                            color: #334155;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                            max-width: 100px;
                        }
                        .category-color-right {
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        }
                        .category-color-hex {
                            font-family: monospace;
                            font-size: 0.65rem;
                            font-weight: 700;
                            color: #64748b;
                            letter-spacing: 0.5px;
                            background-color: #f1f5f9;
                            padding: 0.15rem 0.4rem;
                            border-radius: 4px;
                            text-transform: uppercase;
                        }
                        @media (max-width: 480px) {
                            .category-color-list {
                                grid-template-columns: 1fr;
                            }
                        }
                    `}</style>
                    <label className="form-label font-bold mb-1">Category Colors</label>
                    <p className="text-xs text-muted mb-4">
                        Customize color for each of your spending categories.
                    </p>
                    <div className="category-color-list">
                        {categories.map((cat) => {
                            const currentColor = categoryColors[cat] || '#64748b';
                            return (
                                <div key={cat} className="category-color-item">
                                    <span className="category-color-name" title={cat}>
                                        {cat}
                                    </span>
                                    <div className="category-color-right">
                                        <span className="category-color-hex">{currentColor}</span>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleColorButtonClick(e, cat)}
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                backgroundColor: currentColor,
                                                border: '2px solid #ffffff',
                                                boxShadow: '0 0 0 1px #cbd5e1',
                                                cursor: 'pointer',
                                                padding: 0,
                                                outline: 'none',
                                                transition: 'transform 0.1s'
                                            }}
                                            className="color-trigger-btn"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <hr className="border-slate-200 my-6" />

                <div className="form-group">
                    <label className="form-label font-bold mb-1">Import History Data</label>
                    <p className="text-xs text-muted mb-4">
                        Upload your transaction history CSV file to automatically clean and classify categories using our NLP model.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            id="csv-file-upload"
                            disabled={uploading}
                        />
                        <label 
                            htmlFor="csv-file-upload" 
                            className="btn btn-primary cursor-pointer text-center py-2.5 rounded-lg flex items-center justify-center gap-2"
                            style={{ 
                                backgroundColor: uploading ? '#cbd5e1' : 'var(--primary)', 
                                color: '#fff', 
                                display: 'inline-flex', 
                                padding: '0.6rem 1.2rem', 
                                borderRadius: '8px', 
                                fontWeight: 'bold',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            {uploading ? 'Processing with AI...' : 'Choose CSV File'}
                        </label>
                        
                        {uploadStatus.message && (
                            <div className="text-xs p-3 rounded-lg mt-3"
                                 style={{ 
                                     color: uploadStatus.success ? '#15803d' : '#be123c', 
                                     backgroundColor: uploadStatus.success ? '#f0fdf4' : '#fff1f2', 
                                     padding: '0.75rem', 
                                     borderRadius: '8px', 
                                     border: '1px solid',
                                     borderColor: uploadStatus.success ? '#bbf7d0' : '#fecdd3'
                                 }}>
                                {uploadStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="border-slate-200 my-6" />

                <div className="form-group">
                    <label className="form-label font-bold mb-1">Export Data</label>
                    <p className="text-xs text-muted mb-4">
                        Download all your expenses and incomes (wallet) data as a single CSV file.
                    </p>
                    <a
                        href={exportUrl}
                        download="money_mind_export.csv"
                        className="btn cursor-pointer text-center py-2.5 rounded-lg flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: '#10b981', 
                            color: '#fff',
                            display: 'inline-flex',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            border: 'none',
                            textDecoration: 'none',
                            outline: 'none'
                        }}
                    >
                        Export as CSV
                    </a>
                </div>

                <hr className="border-slate-200 my-6" />

                <div className="form-group">
                    <label className="form-label font-bold text-red-600 mb-1">Reset Data</label>
                    <p className="text-xs text-muted mb-4">
                        Permanently delete all your expense and income records. This action cannot be undone.
                    </p>
                    <button
                        type="button"
                        onClick={handleResetClick}
                        className="btn cursor-pointer text-center py-2.5 rounded-lg flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: '#ef4444', 
                            color: '#fff',
                            display: 'inline-flex',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            border: 'none',
                            outline: 'none'
                        }}
                    >
                        Delete All Data
                    </button>
                </div>

                {/* Custom Color Picker popover */}
                {activeColorPicker && (
                    <div 
                        style={{ 
                            position: 'absolute', 
                            top: `${activeColorPicker.top}px`, 
                            left: `${activeColorPicker.left}px`, 
                            zIndex: 1000 
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <CustomColorPicker 
                            value={categoryColors[activeColorPicker.category] || '#64748b'}
                            onChange={(color) => onUpdateCategoryColor(activeColorPicker.category, color)}
                            onClose={() => setActiveColorPicker(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
