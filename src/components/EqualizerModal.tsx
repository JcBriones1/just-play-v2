import React from 'react';
import { X, Sliders, Volume2, Sparkles } from 'lucide-react';
import { EqualizerPreset } from '../types/music';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreset: EqualizerPreset;
  onSelectPreset: (preset: EqualizerPreset) => void;
  playbackRate: number;
  onChangeRate: (rate: number) => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({
  isOpen,
  onClose,
  currentPreset,
  onSelectPreset,
  playbackRate,
  onChangeRate,
}) => {
  if (!isOpen) return null;

  const presets: Array<{ id: EqualizerPreset; name: string; desc: string }> = [
    { id: 'flat', name: 'Flat (Studio Reference)', desc: 'Pure uncolored original sound' },
    { id: 'bass-boost', name: 'Deep Bass Boost', desc: 'Enhanced sub-bass rumble (+8dB)' },
    { id: 'vocal', name: 'Vocal Clarity', desc: 'Crisp dialogue & vocal presence' },
    { id: 'electronic', name: 'Electronic Club', desc: 'Punchy kicks & sizzling hi-hats' },
    { id: 'acoustic', name: 'Acoustic & Warm', desc: 'Natural woody resonance' },
    { id: 'treble', name: 'Treble Air Boost', desc: 'Bright shimmering highs' },
  ];

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md p-0 overflow-hidden select-none">
      <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/60 p-6 shadow-2xl max-h-[88%] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sound Equalizer & Speed</h3>
              <p className="text-xs text-slate-400">Hardware-accelerated Web Audio DSP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playback Speed section */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
            Playback Speed
          </label>
          <div className="flex items-center justify-between gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
            {rates.map((rate) => (
              <button
                key={rate}
                onClick={() => onChangeRate(rate)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  playbackRate === rate
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* EQ Presets List */}
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2.5">
            Audio Equalizer Profiles
          </label>
          <div className="space-y-2">
            {presets.map((item) => {
              const isSelected = currentPreset === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPreset(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg shadow-purple-950/40'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs sm:text-sm">{item.name}</div>
                    <div className="text-[11px] text-slate-400">{item.desc}</div>
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-900/30"
        >
          Apply & Close
        </button>
      </div>
    </div>
  );
};
