import React from 'react';
import { Smartphone, RefreshCw, Wifi, WifiOff, Cloud, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  onOpenSync: () => void;
  syncCode: string | null;
  isSyncing: boolean;
  onQuickSync: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSync,
  syncCode,
  isSyncing,
  onQuickSync,
}) => {
  const { isInstallable, isIOS, isInstalled, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/5 px-3.5 pt-safe pb-2.5 transition-all duration-300 select-none">
        <div className="flex items-center justify-between w-full">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-lg shadow-purple-900/30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 opacity-30 blur-sm -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  JustPlay
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                  FREE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Ad-Free • Offline • Cross-Sync</p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-2">
            {/* Online / Offline status */}
            {!isOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            ) : null}

            {/* Cross-Device Sync Status button */}
            <button
              onClick={onOpenSync}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                syncCode
                  ? 'bg-purple-950/60 text-purple-200 border-purple-500/40 hover:bg-purple-900/70 shadow-sm shadow-purple-900/20'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title="Cross-Device Synchronization"
            >
              <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'text-purple-400 animate-pulse' : 'text-purple-300'}`} />
              {syncCode ? (
                <span className="font-mono text-[11px] tracking-wide">{syncCode}</span>
              ) : (
                <span className="hidden xs:inline">Sync</span>
              )}
              {isSyncing && (
                <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
              )}
            </button>

            {/* In-App PWA Install Prompt Button (as mandated by PWA skill) */}
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                onClick={() => {
                  if (isInstallable) {
                    install();
                  } else if (isIOS) {
                    setShowIOSModal(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Get App</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* iOS PWA Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/60 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-400 border border-purple-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Play offline & enjoy full-screen audio</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Tap the <strong>Share</strong> icon in the Safari navigation bar at the bottom.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Tap <strong>Add</strong> in the top right. JustPlay will launch just like a native app!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-6 w-full rounded-xl bg-white/10 hover:bg-white/15 py-2.5 text-xs font-semibold text-white transition active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
