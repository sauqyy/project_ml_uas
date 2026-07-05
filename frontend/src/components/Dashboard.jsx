import React from 'react';
import MetricCard from './MetricCard';
import RecentExpenses from './RecentExpenses';
import { DailySpendingTrend, SpendingByCategory } from './Charts';
import AnomalyDetector from './AnomalyDetector';

export default function Dashboard({ expenses, onDelete, onEditClick, totalSpent, transactionCount, avgTransaction, currencySymbol = '$', categoryColors = {} }) {
    return (
        <div className="dashboard-grid h-full">
            {/* Left Column: Recent Expenses LIST */}
            <div className="h-full" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <RecentExpenses expenses={expenses} onDelete={onDelete} onEditClick={onEditClick} currencySymbol={currencySymbol} />
            </div>

            {/* Right Column: Metrics & Charts */}
            <div className="main-content-grid">

                {/* Row 1: Metrics */}
                <div className="stats-grid">
                    <MetricCard title="Total Spent" value={`${currencySymbol}${totalSpent} `} />
                    <MetricCard title="Total Transactions" value={transactionCount} />
                    <MetricCard title="Average per Transaction" value={`${currencySymbol}${avgTransaction} `} />
                </div>

                {/* Row 2: Charts (Line & Pie) */}
                <div className="charts-row">
                    <DailySpendingTrend expenses={expenses} />
                    <SpendingByCategory expenses={expenses} categoryColors={categoryColors} />
                </div>

                {/* Row 3: Anomaly Detection */}
                <AnomalyDetector expenses={expenses} currencySymbol={currencySymbol} />

            </div>
        </div>
    );
}
