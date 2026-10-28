import React, { useState } from 'react';
import { X, Plus, FolderPlus, Check } from 'lucide-react';
import { Playlist, Track } from '../types/music';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: Playlist[];
  trackToAddTo?: Track | null;
  onCreatePlaylist: (title: string, description: string, gradient: string) => void;
  onToggleTrackInPlaylist: (playlistId: string, track: Track | string) => void;
}

const GRADIENTS = [
  'from-purple-700 via-indigo-700 to-pink-600',
  'from-blue-600 to-cyan-500',
  'from-rose-600 to-amber-600',
  'from-emerald-600 to-teal-500',
  'from-fuchsia-600 to-purple-800',
  'from-amber-500 to-orange-600',
];

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  trackToAddTo,
  onCreatePlaylist,
  onToggleTrackInPlaylist,
}) => {
  const [mode, setMode] = useState<'create' | 'add'>(trackToAddTo ? 'add' : 'create');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreatePlaylist(title.trim(), description.trim(), selectedGradient);
    setTitle('');
    setDescription('');
    if (trackToAddTo) {
      setMode('add');
    } else {
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md p-0 overflow-hidden select-none">
      <div className="w-full rounded-t-3xl bg-slate-900 border-t border-slate-700/60 p-6 shadow-2xl max-h-[92%] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {mode === 'create' ? 'Create New Playlist' : 'Add to Playlist'}
              </h3>
              {trackToAddTo && mode === 'add' && (
                <p className="text-xs text-slate-400 truncate max-w-[200px]">
                  {trackToAddTo.title} by {trackToAddTo.artist}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher if trackToAddTo exists */}
        {trackToAddTo && (
          <div className="flex items-center gap-2 mb-4 bg-black/40 p-1 rounded-xl">
            <button
              onClick={() => setMode('add')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'add'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Choose Existing
            </button>
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'create'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              + Create New
            </button>
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Playlist Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Midnight Vibes, Workout 2026..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is the mood of this playlist?"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Cover Art Color Theme
              </label>
              <div className="grid grid-cols-6 gap-2">
                {GRADIENTS.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedGradient(grad)}
                    className={`h-10 rounded-xl bg-gradient-to-br ${grad} border-2 transition-all ${
                      selectedGradient === grad ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-900/40 transition active:scale-95"
            >
              Create Playlist
            </button>
          </form>
        ) : (
          /* Add Track to Existing Playlists */
          <div className="space-y-2">
            {playlists.map((playlist) => {
              const hasTrack = trackToAddTo ? playlist.trackIds.includes(trackToAddTo.id) : false;
              return (
                <button
                  key={playlist.id}
                  onClick={() => trackToAddTo && onToggleTrackInPlaylist(playlist.id, trackToAddTo)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    hasTrack
                      ? 'bg-purple-950/60 border-purple-500/50 text-white'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${playlist.coverGradient} flex items-center justify-center shadow`}
                    >
                      <FolderPlus className="w-5 h-5 text-white/90" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm">{playlist.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {playlist.trackIds.length} tracks
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      hasTrack
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-slate-600 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => setMode('create')}
              className="mt-4 w-full py-2.5 rounded-xl border border-dashed border-white/20 text-slate-300 hover:text-white hover:border-purple-500 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
