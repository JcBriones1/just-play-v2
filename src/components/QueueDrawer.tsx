import React from 'react';
import { X, Music2, Trash2, Play } from 'lucide-react';
import { Track } from '../types/music';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  queueIndex: number;
  currentTrack: Track | null;
  onSelectTrack: (track: Track, index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  queueIndex,
  currentTrack,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md p-0 overflow-hidden select-none">
      <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/60 p-5 shadow-2xl max-h-[85%] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-white text-base">Up Next Queue</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <button
                onClick={onClearQueue}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="overflow-y-auto no-scrollbar space-y-2 flex-grow pr-1">
          {queue.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Your playback queue is empty
            </div>
          ) : (
            queue.map((track, idx) => {
              const isCurrent = idx === queueIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => onSelectTrack(track, idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-purple-950/70 border border-purple-500/40 text-white shadow-md'
                      : 'bg-white/5 border border-transparent text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-purple-900/60 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 fill-white text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm truncate">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {track.artist}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20">
                        Playing
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTrack(idx);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-white/5"
                        title="Remove from Queue"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
