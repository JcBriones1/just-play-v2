import React, { useState } from 'react';
import {
  X,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Share2,
  Download,
  Upload,
  Smartphone,
  Laptop,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { SyncPayload } from '../types/music';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCode: string | null;
  onGenerateCode: () => void;
  onConnectCode: (code: string) => Promise<boolean>;
  onManualSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  playlistsCount: number;
  likedCount: number;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  syncCode,
  onGenerateCode,
  onConnectCode,
  onManualSync,
  isSyncing,
  lastSyncedAt,
  playlistsCount,
  likedCount,
  onExport,
  onImport,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    if (!syncCode) return;
    const url = `${window.location.origin}/?sync=${syncCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'JustPlay Music Sync',
        text: `Sync my music library with code ${syncCode}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setConnectError(null);
    setConnectSuccess(null);
    const success = await onConnectCode(inputCode.trim());
    if (success) {
      setConnectSuccess(`Connected to ${inputCode.toUpperCase()}! Library synced.`);
      setInputCode('');
    } else {
      setConnectError('Could not find library with this sync code. Please check and try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-md p-0 overflow-hidden select-none">
      <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/60 p-6 shadow-2xl max-h-[92%] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Cross-Device Synchronization</h3>
              <p className="text-xs text-slate-400">Keep your playlists & likes in sync across mobile, tablet & PC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Sync Key Section */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Your Device Sync Key
            </span>
            {syncCode && (
              <button
                onClick={() => setShowQR(!showQR)}
                className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20"
              >
                <QrCode className="w-3.5 h-3.5" />
                {showQR ? 'Hide QR' : 'Show QR'}
              </button>
            )}
          </div>

          {syncCode ? (
            <div>
              <div className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-white/10 mb-3">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-purple-300">
                  {syncCode}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                    title="Copy Key"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleShareLink}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                    title="Share Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QR Code Simulation */}
              {showQR && (
                <div className="mb-4 p-4 rounded-xl bg-white text-slate-950 flex flex-col items-center justify-center">
                  <div className="p-2 bg-slate-950 rounded-lg">
                    {/* SVG QR Code Simulation */}
                    <svg viewBox="0 0 120 120" className="w-32 h-32 fill-white">
                      <rect x="10" y="10" width="30" height="30" rx="4" fill="none" stroke="white" strokeWidth="6" />
                      <rect x="20" y="20" width="10" height="10" fill="white" />
                      <rect x="80" y="10" width="30" height="30" rx="4" fill="none" stroke="white" strokeWidth="6" />
                      <rect x="90" y="20" width="10" height="10" fill="white" />
                      <rect x="10" y="80" width="30" height="30" rx="4" fill="none" stroke="white" strokeWidth="6" />
                      <rect x="20" y="90" width="10" height="10" fill="white" />
                      {/* Random data matrix squares */}
                      <rect x="50" y="20" width="8" height="8" />
                      <rect x="62" y="32" width="8" height="8" />
                      <rect x="50" y="50" width="14" height="14" />
                      <rect x="70" y="60" width="8" height="8" />
                      <rect x="30" y="55" width="8" height="8" />
                      <rect x="85" y="85" width="12" height="12" />
                      <rect x="55" y="85" width="8" height="8" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium mt-2">
                    Scan with your phone camera to pair library
                  </p>
                </div>
              )}

              {/* Sync Statistics & Manual Push button */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>{playlistsCount} Playlists • {likedCount} Liked Songs</span>
                <span>
                  {lastSyncedAt ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Ready to sync'}
                </span>
              </div>

              <button
                onClick={onManualSync}
                disabled={isSyncing}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Synchronizing Cloud Vault...' : 'Sync Now with Cloud'}
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-slate-400 mb-3">
                Generate a unique sync key to share this library across all your devices.
              </p>
              <button
                onClick={onGenerateCode}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow hover:bg-purple-500 transition"
              >
                Generate Sync Key
              </button>
            </div>
          )}
        </div>

        {/* Connect to Another Device Section */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
          <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            Connect Existing Device / Library
          </h4>
          <p className="text-[11px] text-slate-400 mb-3">
            Enter the 6-character sync key shown on your other phone, tablet, or laptop.
          </p>

          <form onSubmit={handleConnect} className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. AURA-8492"
              maxLength={12}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!inputCode.trim() || isSyncing}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold transition active:scale-95"
            >
              Connect
            </button>
          </form>

          {connectSuccess && (
            <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {connectSuccess}
            </div>
          )}

          {connectError && (
            <div className="mt-2 text-xs text-rose-400 font-medium">
              {connectError}
            </div>
          )}
        </div>

        {/* Air-Gapped JSON Backup & Restore */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Air-Gapped Backup & Restore
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExport}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              Export .JSON
            </button>

            <label className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Import .JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
