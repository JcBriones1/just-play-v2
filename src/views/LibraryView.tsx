import React, { useState } from 'react';
import {
  FolderPlus,
  Heart,
  Download,
  Trash2,
  Play,
  ArrowLeft,
  Check,
  Radio,
  Plus,
  History,
  Music2,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { Playlist, Track } from '../types/music';

interface LibraryViewProps {
  playlists: Playlist[];
  allTracks: Track[];
  likedTrackIds: string[];
  offlineTrackIds: string[];
  historyTrackIds: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  offlineStorageStats: { count: number; formattedSize: string };
  onPlayTrack: (track: Track, queueList?: Track[]) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onToggleLike: (trackOrId: Track | string) => void;
  onDownloadTrack: (track: Track) => void;
  onOpenCreatePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  onToggleTrackInPlaylist: (playlistId: string, trackOrId: Track | string) => void;
  selectedPlaylistId: string | null;
  onSelectPlaylistId: (id: string | null) => void;
}

type ViewMode = 'grid' | 'liked' | 'downloaded' | 'history';

export const LibraryView: React.FC<LibraryViewProps> = ({
  playlists,
  allTracks,
  likedTrackIds,
  offlineTrackIds,
  historyTrackIds,
  currentTrack,
  isPlaying,
  offlineStorageStats,
  onPlayTrack,
  onPlayPlaylist,
  onToggleLike,
  onDownloadTrack,
  onOpenCreatePlaylist,
  onDeletePlaylist,
  onRemoveTrackFromPlaylist,
  onToggleTrackInPlaylist,
  selectedPlaylistId,
  onSelectPlaylistId,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isAddSongsOpen, setIsAddSongsOpen] = useState(false);
  const [searchSongQuery, setSearchSongQuery] = useState('');

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  // Track resolver that matches standard IDs, YouTube IDs, or generates fallback track data
  const resolveTrack = (id: string): Track | null => {
    if (!id) return null;
    const match = allTracks.find(
      (t) =>
        t.id === id ||
        t.youtubeId === id ||
        (t.youtubeId && id === `yt-${t.youtubeId}`) ||
        (t.id && t.id.replace(/^yt-/, '') === id.replace(/^yt-/, ''))
    );
    if (match) return match;

    // Fallback if ID is a YouTube ID so user never sees empty folders
    const cleanYt = id.startsWith('yt-') ? id.slice(3) : id;
    if (cleanYt && cleanYt.length >= 5) {
      return {
        id: id,
        youtubeId: cleanYt,
        title: `YouTube Song (${cleanYt.slice(0, 6)})`,
        artist: 'YouTube Music',
        album: 'JustPlay Saved',
        duration: 210,
        audioUrl: `https://www.youtube.com/watch?v=${cleanYt}`,
        artworkUrl: `https://i.ytimg.com/vi/${cleanYt}/hqdefault.jpg`,
        genre: 'OPM / Stream',
        mood: 'Saved',
        accentColor: '#8b5cf6',
        source: 'youtube' as const,
        lyrics: [],
      };
    }
    return null;
  };

  // Derived track lists using full resolution
  const likedTracks = likedTrackIds.map(resolveTrack).filter(Boolean) as Track[];
  const downloadedTracks = offlineTrackIds.map(resolveTrack).filter(Boolean) as Track[];
  const historyTracks = historyTrackIds.map(resolveTrack).filter(Boolean) as Track[];

  const renderTrackList = (tracks: Track[], title: string, subtitle?: string, icon?: React.ReactNode) => (
    <div className="space-y-6 pb-4 overflow-x-hidden">
      {/* Back Button */}
      <button
        onClick={() => {
          setViewMode('grid');
          onSelectPlaylistId(null);
        }}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </button>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 p-5 rounded-3xl bg-white/5 border border-white/5">
        <div className="w-32 h-32 rounded-2xl bg-slate-800 flex items-center justify-center shadow-xl border border-white/10 text-white">
          {icon || <Music2 className="w-12 h-12 text-purple-400" />}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-white">{title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            {subtitle || `${tracks.length} tracks in this collection`}
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-3 font-medium">
            <span>{tracks.length} Songs</span>
          </div>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={() => onPlayTrack(tracks[0], tracks)}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
        )}
      </div>

      {/* Tracks List */}
      <div className="space-y-2">
        {tracks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 rounded-2xl bg-white/5 border border-white/5 p-6">
            <p className="text-sm font-medium">This folder is empty</p>
            <p className="text-xs text-slate-400 mt-1">Start playing or downloading songs to fill it up</p>
          </div>
        ) : (
          tracks.map((track, idx) => {
            const isCurrent = currentTrack?.id === track.id;
            const isLiked = likedTrackIds.includes(track.id);
            const isDownloaded = offlineTrackIds.includes(track.id);

            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => onPlayTrack(track, tracks)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all group ${
                  isCurrent
                    ? 'bg-rose-950/40 border border-rose-500/30'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-rose-300' : 'text-white'}`}>
                      {track.title}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {track.artist}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onDownloadTrack(track)} className="p-1.5 text-slate-400 hover:text-white transition">
                    {isDownloaded ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                  </button>
                  <button onClick={() => onToggleLike(track)} className="p-1.5 transition">
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-pink-500 text-pink-500' : 'text-slate-400'}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // If a playlist is actively selected, show its detail view
  if (selectedPlaylist) {
    const tracks = selectedPlaylist.trackIds.map(resolveTrack).filter(Boolean) as Track[];
    return (
      <div className="space-y-6 pb-4 overflow-x-hidden">
        <button
          onClick={() => onSelectPlaylistId(null)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </button>

        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 p-5 rounded-3xl bg-white/5 border border-white/5">
          <div className={`w-32 h-32 rounded-2xl bg-gradient-to-br ${selectedPlaylist.coverGradient} flex-shrink-0 flex items-center justify-center shadow-xl border border-white/10`}>
            <Radio className="w-10 h-10 text-white/90" />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-white">{selectedPlaylist.title}</h1>
            <p className="text-xs text-slate-400 mt-1">{selectedPlaylist.description || 'Custom Playlist'}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddSongsOpen(true)}
              className="px-3.5 py-2.5 rounded-full bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition text-xs font-semibold flex items-center gap-1.5 active:scale-95"
              title="Add Songs to this Folder"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">Add Songs</span>
            </button>
            <button
              onClick={() => onPlayPlaylist(selectedPlaylist)}
              disabled={tracks.length === 0}
              className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete playlist "${selectedPlaylist.title}"?`)) {
                  onDeletePlaylist(selectedPlaylist.id);
                  onSelectPlaylistId(null);
                }
              }}
              className="p-3 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {tracks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 rounded-3xl bg-white/5 border border-white/5 p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 mb-3">
                <FolderPlus className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">This folder is empty</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Add tracks to build your collection</p>
              <button
                onClick={() => setIsAddSongsOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition shadow-lg shadow-purple-900/40 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Songs to Folder
              </button>
            </div>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track, tracks)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow">
                    <img src={track.artworkUrl} alt={track.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm text-white truncate">{track.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{track.artist}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrackFromPlaylist(selectedPlaylist.id, track.id);
                  }}
                  className="p-2 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Slide-up Add Songs to Folder Modal */}
        {isAddSongsOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4">
            <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Add Songs to "{selectedPlaylist.title}"</h3>
                    <p className="text-[11px] text-slate-400">Tap to add or remove</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddSongsOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchSongQuery}
                  onChange={(e) => setSearchSongQuery(e.target.value)}
                  placeholder="Filter available tracks..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Track list */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                {allTracks
                  .filter((t) => {
                    if (!searchSongQuery.trim()) return true;
                    const q = searchSongQuery.toLowerCase();
                    return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
                  })
                  .map((track) => {
                    const isAdded = selectedPlaylist.trackIds.includes(track.id);
                    return (
                      <div
                        key={track.id}
                        onClick={() => onToggleTrackInPlaylist(selectedPlaylist.id, track)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition border ${
                          isAdded
                            ? 'bg-purple-950/40 border-purple-500/40'
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={track.artworkUrl}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-white truncate">{track.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">{track.artist}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTrackInPlaylist(selectedPlaylist.id, track);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                            isAdded
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                onClick={() => setIsAddSongsOpen(false)}
                className="mt-3 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Handle special views
  if (viewMode === 'liked') return renderTrackList(likedTracks, 'Liked Songs', 'Your favorite tracks', <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />);
  if (viewMode === 'downloaded') return renderTrackList(downloadedTracks, 'Downloads', `Cached Offline (${offlineStorageStats.formattedSize})`, <Download className="w-12 h-12 text-emerald-400" />);
  if (viewMode === 'history') return renderTrackList(historyTracks, 'History', 'Last 10 tracks played', <History className="w-12 h-12 text-amber-400" />);

  return (
    <div className="space-y-7 pb-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Your Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreatePlaylist}
            className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white transition active:scale-95"
            title="New Playlist"
            aria-label="New playlist"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Grid Folders */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* System Folder: Downloads */}
        <div
          onClick={() => setViewMode('downloaded')}
          className="group p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer flex flex-col justify-between aspect-square"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Downloads</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{offlineTrackIds.length} offline tracks</p>
          </div>
        </div>

        {/* System Folder: Liked */}
        <div
          onClick={() => setViewMode('liked')}
          className="group p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer flex flex-col justify-between aspect-square"
        >
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20 group-hover:scale-110 transition-transform">
            <Heart className="w-6 h-6 fill-pink-500" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Liked Songs</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{likedTrackIds.length} favorites</p>
          </div>
        </div>

        {/* System Folder: History */}
        <div
          onClick={() => setViewMode('history')}
          className="group p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer flex flex-col justify-between aspect-square"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">History</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{historyTrackIds.length} / 10 recent</p>
          </div>
        </div>

        {/* Create Playlist Button */}
        <div
          onClick={onOpenCreatePlaylist}
          className="group p-4 rounded-3xl border border-dashed border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition cursor-pointer flex flex-col justify-between aspect-square"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Create Folder</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Build custom playlist</p>
          </div>
        </div>
      </div>

      {/* User Playlists (Folders) */}
      {playlists.length > 0 && (
        <div className="pt-2">
          <h2 className="text-base font-bold text-white mb-3">Your Folders</h2>
          <div className="grid grid-cols-2 gap-3.5">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylistId(pl.id)}
                className="group p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer flex flex-col justify-between aspect-square relative overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pl.coverGradient} flex items-center justify-center text-white/90 shadow-lg group-hover:rotate-6 transition-transform`}>
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm truncate">{pl.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">{pl.trackIds.length} songs</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
