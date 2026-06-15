import React, { useState } from 'react';
import { X } from 'lucide-react';

const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export default function SettingsModal({ isOpen, onClose, currency, setCurrency, onUploadSuccess }) {
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ success: false, message: '' });

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadStatus({ success: false, message: '' });

        const formData = new FormData();
        formData.append('file', file);

        fetch('/api/upload', {
            method: 'POST',
            body: formData,
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
                    message: `Sukses! Berhasil mengimpor ${data.expenses_imported} pengeluaran dan ${data.incomes_imported} pendapatan dengan kategori otomatis AI.`
                });
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
            })
            .catch((err) => {
                console.error("Error uploading file:", err);
                setUploadStatus({
                    success: false,
                    message: `Gagal: ${err.message}`
                });
            })
            .finally(() => {
                setUploading(false);
            });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Settings</h2>
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
            </div>
        </div>
    );
}
