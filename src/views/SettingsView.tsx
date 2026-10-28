import React, { useState } from 'react';
import {
  Cloud,
  HardDrive,
  Trash2,
  Download,
  RefreshCw,
  Radio,
} from 'lucide-react';

interface SettingsViewProps {
  syncCode: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  offlineStorageStats: { count: number; formattedSize: string };
  onOpenSyncModal: () => void;
  onManualSync: () => void;
  onClearOfflineCache: () => void;
  onDownloadAllLiked: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  syncCode,
  lastSyncedAt,
  isSyncing,
  offlineStorageStats,
  onOpenSyncModal,
  onManualSync,
  onClearOfflineCache,
  onDownloadAllLiked,
}) => {
  const [audioQuality, setAudioQuality] = useState<'320' | '256' | '128'>('320');
  const [loudnessNorm, setLoudnessNorm] = useState(true);

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          Sync & Settings
        </h1>
        <p className="text-xs text-slate-400">
          Manage your cloud library, offline audio cache, and audio quality
        </p>
      </div>

      {/* Cross-Device Synchronization Section */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Cross-Device Synchronization</h2>
              <p className="text-[11px] text-slate-400">Share library across your phone, tablet, and PC</p>
            </div>
          </div>
          {syncCode && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
              {syncCode}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          {syncCode
            ? `Your library is linked to sync key ${syncCode}. Any playlist updates or liked tracks sync automatically.`
            : 'No sync key active on this device. Generate or connect a key to pair your music library.'}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSyncModal}
            className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition active:scale-95"
          >
            {syncCode ? 'Manage Sync Key & QR' : 'Pair Device Now'}
          </button>

          {syncCode && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-purple-400' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Storage Manager */}
      <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Offline Audio Cache</h2>
              <p className="text-[11px] text-slate-400">IndexedDB local storage on your device</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            {offlineStorageStats.formattedSize}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 text-xs text-slate-300 border-b border-white/5 mb-3">
          <span>Cached Offline Tracks</span>
          <span className="font-semibold">{offlineStorageStats.count} songs</span>
        </div>

        <div className="space-y-2">
          <button
            onClick={onDownloadAllLiked}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download All Liked Songs for Offline</span>
          </button>

          {offlineStorageStats.count > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all offline downloaded audio tracks?')) {
                  onClearOfflineCache();
                }
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Offline Storage</span>
            </button>
          )}
        </div>
      </div>

      {/* Audio Streaming Quality */}
      <div className="p-5 rounded-3xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">Streaming & Audio Fidelity</h2>
            <p className="text-[11px] text-slate-400">Ad-free high-resolution playback</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Streaming Quality (Bitrate)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '320' as const, label: '320 kbps', desc: 'Ultra Lossless' },
                { id: '256' as const, label: '256 kbps', desc: 'High Quality' },
                { id: '128' as const, label: '128 kbps', desc: 'Data Saver' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setAudioQuality(item.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    audioQuality === item.id
                      ? 'bg-purple-950/60 border-purple-500 text-white shadow'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs font-semibold text-white block">Volume Normalization</span>
              <span className="text-[10px] text-slate-400">Maintain consistent audio levels across tracks</span>
            </div>
            <button
              onClick={() => setLoudnessNorm(!loudnessNorm)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                loudnessNorm ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  loudnessNorm ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
