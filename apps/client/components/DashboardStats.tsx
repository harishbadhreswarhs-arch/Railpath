import React from 'react';

interface StatsProps {
    gates: any[];
}

export const DashboardStats: React.FC<StatsProps> = ({ gates }) => {
    const total = gates.length;
    const open = gates.filter(g => g.status === 'OPEN').length;
    const closed = gates.filter(g => g.status === 'CLOSED').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {/* Total Gates */}
            <div className="bg-[#434770] rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden shadow-lg shadow-[#434770]/30 min-h-[120px]">
                <p className="text-white/70 text-sm font-medium mb-1">Total Gates</p>
                <h2 className="text-white text-4xl font-bold tracking-tight">{total}</h2>
            </div>

            {/* Open Gates */}
            <div className="bg-[#426E75] rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden shadow-lg shadow-[#426E75]/30 min-h-[120px]">
                <p className="text-white/70 text-sm font-medium mb-1">Open Gates</p>
                <h2 className="text-white text-4xl font-bold tracking-tight">{open}</h2>
            </div>

            {/* Closed Gates */}
            <div className="bg-[#78546A] rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden shadow-lg shadow-[#78546A]/30 min-h-[120px]">
                <p className="text-white/70 text-sm font-medium mb-1">Closed Gates</p>
                <h2 className="text-white text-4xl font-bold tracking-tight">{closed}</h2>
            </div>
        </div>
    );
};
