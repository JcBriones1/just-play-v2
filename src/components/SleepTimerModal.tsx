import React from 'react';
import { X, Moon, Clock } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingSeconds: number | null;
  onSetTimer: (minutes: number | 'end_of_track' | null) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  remainingSeconds,
  onSetTimer,
}) => {
  if (!isOpen) return null;

  const timerOptions: Array<{ label: string; value: number | 'end_of_track' | null }> = [
    { label: '15 Minutes', value: 15 },
    { label: '30 Minutes', value: 30 },
    { label: '45 Minutes', value: 45 },
    { label: '1 Hour', value: 60 },
    { label: 'End of Current Track', value: 'end_of_track' },
    { label: 'Turn Off Timer', value: null },
  ];

  const formatRemaining = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md p-0 overflow-hidden select-none">
      <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/60 p-6 shadow-2xl max-h-[85%] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sleep Timer</h3>
              <p className="text-xs text-slate-400">
                {remainingSeconds !== null
                  ? `Active: ${formatRemaining(remainingSeconds)} remaining`
                  : 'Stops playback automatically'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {timerOptions.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSetTimer(opt.value);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                opt.value === null && remainingSeconds === null
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs sm:text-sm font-medium">{opt.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
