import React from 'react';
import { Timestamp } from 'firebase/firestore';

interface Gate {
    id: string;
    name: string;
    status: 'OPEN' | 'CLOSED';
    lastUpdated?: Timestamp;
}

interface GateListItemProps {
    gate: Gate;
    onClick: (gate: Gate) => void;
    isNearby: boolean;
}

export const GateListItem: React.FC<GateListItemProps> = ({ gate, onClick, isNearby }) => {
    const isOpen = gate.status === 'OPEN';

    return (
        <div
            onClick={() => onClick(gate)}
            className="bg-[#2A2E45] p-4 rounded-xl mb-3 flex items-center justify-between shadow-md hover:bg-[#33364D] transition-colors cursor-pointer border border-[#3D405B]"
        >
            <div className="flex items-center gap-4">
                {/* Status Dot */}
                <div className={`w-3 h-3 rounded-full shadow-lg ${isOpen ? 'bg-[#00D2A0] shadow-[#00D2A0]/50' : 'bg-[#FF5C75] shadow-[#FF5C75]/50'}`} />

                <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{gate.name}</h3>
                    <p className="text-slate-400 text-xs font-mono mt-1">ID: {gate.id.substring(0, 6).toUpperCase()}</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {isNearby && (
                    <span className="text-[10px] text-[#FF5C75] font-bold border border-[#FF5C75] px-2 py-0.5 rounded animate-pulse">NEARBY</span>
                )}
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border ${isOpen
                        ? 'bg-[#00D2A0]/10 text-[#00D2A0] border-[#00D2A0]/20'
                        : 'bg-[#FF5C75]/10 text-[#FF5C75] border-[#FF5C75]/20'
                    }`}>
                    {isOpen ? 'OPEN' : 'CLOSED'}
                </span>
            </div>
        </div>
    );
};
