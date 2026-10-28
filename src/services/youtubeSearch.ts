import type { Track } from '../types/music';

const SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwuSzDLzMHiIcKZmluId0ePwTcwmpMbNPYuDR5rVHc5TxDbSApII15ME9p6RgtmnV7HmQ/exec';

const BLOCKED_TITLE_PARTS = [
  'mix',
  'playlist',
  'full album',
  'nonstop',
  'non-stop',
  '1 hour',
  '2 hours',
  '3 hours',
  'best of',
  'medley',
  'compilation',
  'collection',
  'top hits',
  'popular songs',
  'trending songs',
  'karaoke',
  'lyrics video',
  'full video',
  'all songs',
  'top 50',
  'top 100',
  'vol.',
  'hits',
  'latest songs',
  'best',
  'top',
  '2024',
  '2023',
  'songs',
  'played',
];

const TRENDING_QUERIES = [
  'latest OPM official audio single 2025',
  'Maki OPM single 2025',
  'BINI official audio single',
  'TJ Monterde new single 2025',
  'Adie OPM single official',
];

function isBlockedTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return BLOCKED_TITLE_PARTS.some((part) => lower.includes(part));
}

export function mapScriptResults(data: unknown): Track[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item: { title?: string; duration?: number }) => {
      const title = item?.title || '';
      const isDurationLong = Boolean(item?.duration && item.duration > 330);
      return !isBlockedTitle(title) && !isDurationLong;
    })
    .map((item: {
      videoId?: string;
      title?: string;
      artist?: string;
      channel?: string;
      album?: string;
      duration?: number;
      audioUrl?: string;
      artworkUrl?: string;
      thumbnail?: string;
      lyrics?: Track['lyrics'];
    }) => {
      const videoId = item.videoId || '';
      const channel = item.channel && item.channel !== 'Unknown' ? item.channel : '';
      return {
        id: videoId ? `yt-${videoId}` : `yt-${Math.random()}`,
        youtubeId: videoId,
        title: item.title || 'YouTube Song',
        artist: item.artist || channel || 'YouTube Music',
        album: item.album || 'YouTube Stream',
        duration: item.duration || 240,
        audioUrl: item.audioUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
        artworkUrl:
          item.artworkUrl ||
          item.thumbnail ||
          (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
        genre: 'Suggested',
        mood: 'Trending',
        accentColor: '#8b5cf6',
        bitrate: 'YouTube HQ Audio',
        source: 'youtube' as const,
        lyrics: item.lyrics || [
          { time: 0, text: `♪ Streaming "${item.title || 'this track'}" from YouTube Music ♪` },
        ],
      };
    })
    .filter((track) => Boolean(track.youtubeId));
}

export async function fetchTracksFromScript(query: string): Promise<Track[]> {
  const response = await fetch(`${SCRIPT_URL}?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error(`Google Script responded with ${response.status}`);
  }
  const data = await response.json();
  return mapScriptResults(data);
}

export async function fetchTrendingPool(): Promise<Track[]> {
  const batches = await Promise.all(
    TRENDING_QUERIES.map((query) => fetchTracksFromScript(query).catch(() => [] as Track[])),
  );
  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (!item.youtubeId || seen.has(item.youtubeId)) return false;
    seen.add(item.youtubeId);
    return true;
  });
}

function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

async function fetchLocalResults(path: string): Promise<Track[] | null> {
  try {
    const res = await fetch(path);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('json')) return null;
    const data = await res.json();
    return Array.isArray(data?.results) ? (data.results as Track[]) : null;
  } catch {
    return null;
  }
}

export async function searchYouTubeTracks(query: string): Promise<Track[]> {
  if (!isNativeApp()) {
    const local = await fetchLocalResults(
      `/api/youtube/search?q=${encodeURIComponent(query)}&t=${Date.now()}`,
    );
    if (local) return local;
  }
  return fetchTracksFromScript(query);
}

export async function loadSuggestedTracks(): Promise<Track[]> {
  if (!isNativeApp()) {
    const local = await fetchLocalResults(`/api/youtube/trending?category=Suggested&t=${Date.now()}`);
    if (local && local.length > 0) return local;
  }
  return fetchTrendingPool();
}
