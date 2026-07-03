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

export default function SettingsModal({ isOpen, onClose, currency, setCurrency, onUploadSuccess, onResetData, setIsSecretUnlocked }) {
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ success: false, message: '' });
    const [titleClicks, setTitleClicks] = useState(0);

    const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
    const userEmail = session.email || '';
    const exportUrl = userEmail ? `/api/export?email=${encodeURIComponent(userEmail)}` : '/api/export';

    const handleTitleClick = () => {
        const newClicks = titleClicks + 1;
        setTitleClicks(newClicks);
        if (newClicks >= 5) {
            setIsSecretUnlocked(true);
            alert("✨ Fitur rahasia 'Pelabelan AI' telah aktif! Silakan periksa tab baru di samping 'Prediksi Keuangan' untuk mengonfirmasi kategori transaksi Anda.");
            onClose(); // Close the settings modal immediately
        }
    };

    const handleResetClick = () => {
        const confirmFirst = window.confirm("Apakah Anda yakin ingin menghapus seluruh data transaksi (Pengeluaran & Pemasukan) Anda?");
        if (confirmFirst) {
            const confirmSecond = window.confirm("TINDAKAN INI TIDAK BISA DIBATALKAN! Seluruh riwayat keuangan Anda akan terhapus bersih. Apakah Anda benar-benar yakin?");
            if (confirmSecond) {
                onResetData().then(() => {
                    alert("Seluruh data transaksi berhasil dihapus.");
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
            </div>
        </div>
    );
}
