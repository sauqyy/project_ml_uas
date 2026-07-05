import React, { useState, useEffect } from 'react';
import { Sparkles, Brain } from 'lucide-react';
import CategorySelect from './CategorySelect';

export default function LabelingView({ onUploadSuccess, categories = [], onAddCategory, onDeleteCategory }) {
    const [labelingJobs, setLabelingJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [updatingJobDesc, setUpdatingJobDesc] = useState(null);

    const loadData = () => {
        // Load labeling jobs
        setLoadingJobs(true);
        const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
        const userEmail = session.email || 'demo@moneymind.com';
        fetch('/api/labeling-jobs', {
            headers: {
                'X-User-Email': userEmail
            }
        })
            .then(res => res.json())
            .then(data => setLabelingJobs(data))
            .catch(err => console.error("Error loading labeling jobs:", err))
            .finally(() => setLoadingJobs(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleLabelChange = (desc, newCategory) => {
        setUpdatingJobDesc(desc);
        const session = JSON.parse(localStorage.getItem('moneymind_session') || '{}');
        const userEmail = session.email || 'demo@moneymind.com';
        fetch('/api/confirm-label', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-User-Email': userEmail
            },
            body: JSON.stringify({ desc, category: newCategory })
        })
            .then(async (res) => {
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || 'Failed to update label');
                }
                // Update local state
                setLabelingJobs(prev => prev.map(job => 
                    job.desc === desc ? { ...job, category: newCategory, confirmed: true } : job
                ));
                // Trigger parent refresh to update the dashboard immediately
                if (onUploadSuccess) {
                    onUploadSuccess();
                }
            })
            .catch(err => {
                alert("Failed to update category: " + err.message);
            })
            .finally(() => {
                setUpdatingJobDesc(null);
            });
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            AI Labeling & Interactive Machine Learning
                            <Sparkles size={18} className="text-amber-500 animate-pulse" />
                        </h2>
                        <p className="text-muted text-sm">
                            This page loads a list of unique transaction descriptions. You can confirm or change the category predicted by the AI.
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed mb-6">
                    <strong>💡 How It Works?</strong> When you change the category for a transaction (e.g., changing <em>"coffee purchase"</em> to <strong>Food & Dining</strong>), the system saves your preference and automatically retrains the <strong>Logistic Regression</strong> model in the backend. This new model learns from your corrections, so other similar transactions (like <em>"iced latte"</em> or <em>"buy coffee"</em>) will also change their categories intelligently!
                </div>

                {loadingJobs ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-2"></div>
                        <p>Loading transactions...</p>
                    </div>
                ) : labelingJobs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm card bg-slate-50 border-dashed">
                        No expense transactions available to label.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs" style={{ overflow: 'visible' }}>
                        <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                                    <th className="p-4" style={{ width: '40%' }}>Transaction Description</th>
                                    <th className="p-4 text-center" style={{ width: '15%' }}>Transaction Count</th>
                                    <th className="p-4 text-center" style={{ width: '20%' }}>Classification Status</th>
                                    <th className="p-4 text-right" style={{ width: '25%' }}>Action / Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {labelingJobs.map((job) => (
                                    <tr key={job.desc} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors text-sm">
                                        <td className="p-4 font-semibold text-slate-800 truncate" title={job.desc}>
                                            {job.desc}
                                        </td>
                                        <td className="p-4 text-center text-slate-600 font-medium">
                                            {job.count}x
                                        </td>
                                        <td className="p-4 text-center">
                                            <span 
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: job.confirmed ? '#f0fdf4' : '#eff6ff',
                                                    color: job.confirmed ? '#15803d' : '#1d4ed8',
                                                    border: '1px solid',
                                                    borderColor: job.confirmed ? '#bbf7d0' : '#bfdbfe'
                                                }}
                                            >
                                                {job.confirmed ? '✅ Confirmed' : '🤖 AI Prediction'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right" style={{ overflow: 'visible' }}>
                                            {updatingJobDesc === job.desc ? (
                                                <span className="text-xs text-primary font-bold animate-pulse">Retraining Model...</span>
                                            ) : (
                                                <div style={{ width: '180px', display: 'inline-block', textAlign: 'left', position: 'relative' }}>
                                                    <CategorySelect
                                                        value={job.category}
                                                        onChange={(newCat) => handleLabelChange(job.desc, newCat)}
                                                        categories={categories}
                                                        onAddCategory={onAddCategory}
                                                        onDeleteCategory={onDeleteCategory}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
