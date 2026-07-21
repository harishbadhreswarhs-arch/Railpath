import React, { useEffect, useState } from 'react';

interface TrainAlertOverlayProps {
  jamAlertPayload: string | null;
}

export const TrainAlertOverlay: React.FC<TrainAlertOverlayProps> = ({ jamAlertPayload }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [parsedPayload, setParsedPayload] = useState<any>(null);

  useEffect(() => {
    if (jamAlertPayload) {
      setIsVisible(true);
      try {
        setParsedPayload(JSON.parse(jamAlertPayload));
      } catch (e) {
        setParsedPayload(null);
      }
    } else {
      setIsVisible(false);
      setParsedPayload(null);
    }
  }, [jamAlertPayload]);

  if (!isVisible || !jamAlertPayload) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4 md:p-8">
      {/* Flashing Red Background */}
      <div className="absolute inset-0 bg-red-900/40 animate-[pulse_1s_ease-in-out_infinite] backdrop-blur-sm"></div>
      
      {/* Alert Container */}
      <div className="relative bg-[#1A0B0B] border-4 border-red-600 rounded-3xl p-6 md:p-10 max-w-2xl w-full shadow-[0_0_100px_rgba(220,38,38,0.5)] pointer-events-auto">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-red-600 animate-ping absolute opacity-75"></div>
          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center relative z-10">
            <span className="text-white text-3xl">⚠️</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-red-500 uppercase tracking-widest text-center" style={{ textShadow: '0 0 20px rgba(239,68,68,0.8)' }}>
            Critical Alert
          </h1>
        </div>

        <div className="bg-[#2A1111] p-6 rounded-2xl border border-red-900/50 mb-6">
          <h2 className="text-red-400 text-xl font-bold uppercase tracking-widest mb-2 border-b border-red-900/50 pb-2">
            Automated Gate-Jam Detection
          </h2>
          <p className="text-red-200 text-lg md:text-xl font-medium mb-4">
            Optical flow monitors have detected a mechanical failure. A railway crossing gate has failed to close.
          </p>
          
          <div className="bg-black/50 p-4 rounded-xl font-mono text-sm md:text-base text-red-400 border border-red-900/30 overflow-x-auto shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-red-700 uppercase">Incoming JSON Payload</span>
              <span className="text-xs text-red-500 animate-pulse">● LIVE</span>
            </div>
            <pre className="whitespace-pre-wrap">
              {jamAlertPayload}
            </pre>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-white text-2xl md:text-3xl font-black uppercase tracking-widest bg-red-600 rounded-xl py-4 px-8 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            {parsedPayload?.instruction ? parsedPayload.instruction.replace(/_/g, ' ') : 'SLOW DOWN IMMEDIATELY'}
          </h3>
        </div>
      </div>
    </div>
  );
};
