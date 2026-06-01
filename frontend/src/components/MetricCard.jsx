import React from 'react';

export default function MetricCard({ title, value, subtext }) {
    return (
        <div className="card flex flex-col justify-between h-32">
            <h3 className="text-sm font-medium text-muted">{title}</h3>
            <div>
                <div className="text-3xl font-bold text-primary">{value}</div>
                {subtext && <p className="text-sm text-muted mt-1">{subtext}</p>}
            </div>
        </div>
    );
}
