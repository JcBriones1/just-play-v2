import { Track, Playlist } from '../types/music';

export const MUSIC_CATALOG: Track[] = [
  {
    id: 'track-1',
    title: 'Palagi',
    artist: 'TJ Monterde',
    album: 'Acoustic Love OPM',
    duration: 225,
    audioUrl: 'https://cdn.freesound.org/previews/476/476579_9996778-lq.mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
    genre: 'OPM Acoustic',
    mood: 'Romantic & Chill',
    accentColor: '#3b82f6',
    bitrate: '320 kbps',
    bpm: 90,
    youtubeId: '908773h7OAM',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Soft acoustic guitar strumming) ♪' },
      { time: 16, text: 'Kahit kailan, hindi nagbabago' },
      { time: 32, text: 'Ikaw ang tanging iniibig ko' },
      { time: 50, text: 'Palagi kang pipiliin sa bawat araw' }
    ]
  },
  {
    id: 'track-2',
    title: 'Dilaw',
    artist: 'Maki',
    album: 'OPM Chart Toppers',
    duration: 218,
    audioUrl: 'https://cdn.freesound.org/previews/573/573381_5674468-lq.mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    genre: 'OPM Pop',
    mood: 'In Love & Bright',
    accentColor: '#eab308',
    bitrate: '320 kbps',
    bpm: 120,
    youtubeId: 'L215z9C4Zd8',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Bright upbeat acoustic intro) ♪' },
      { time: 12, text: 'Sundo sa madilim na sulok ng mundo' },
      { time: 25, text: 'Biglang nagliwanag nang makita ka' }
    ]
  },
  {
    id: 'track-3',
    title: 'Pantropiko',
    artist: 'BINI',
    album: 'P-Pop Nation',
    duration: 210,
    audioUrl: 'https://cdn.freesound.org/previews/589/589073_12891963-lq.mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    genre: 'P-Pop / Dance',
    mood: 'Summer & Energetic',
    accentColor: '#ec4899',
    bitrate: '320 kbps',
    bpm: 126,
    youtubeId: 'Zx31bB2vMns',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Tropical summer dance beat) ♪' },
      { time: 15, text: 'Bawat simoy ng hangin ay parang nasa beach' }
    ]
  },
  {
    id: 'track-4',
    title: 'Salamin, Salamin',
    artist: 'BINI',
    album: 'P-Pop Hits 2026',
    duration: 215,
    audioUrl: 'https://cdn.freesound.org/previews/568/568169_5674468-lq.mp3',
    artworkUrl: 'https://i.ytimg.com/vi/J1Ip2sC_lss/hqdefault.jpg',
    genre: 'P-Pop / Dance',
    mood: 'Upbeat & Catchy',
    accentColor: '#a855f7',
    bitrate: '320 kbps',
    bpm: 122,
    youtubeId: 'J1Ip2sC_lss',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Catchy P-Pop synth intro) ♪' },
      { time: 14, text: 'Salamin, salamin sa dingding' }
    ]
  },
  {
    id: 'track-5',
    title: 'Raining in Manila',
    artist: 'Lola Amour',
    album: 'OPM Modern Rock',
    duration: 250,
    audioUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    genre: 'OPM Brass Rock',
    mood: 'Groovy & Nostalgic',
    accentColor: '#10b981',
    bitrate: '320 kbps',
    bpm: 115,
    youtubeId: 'dglBgJSMr-E',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Funky brass horn riff) ♪' },
      { time: 18, text: 'Sanib-puwersa ang ulan at ang traffic dito' }
    ]
  },
  {
    id: 'track-6',
    title: 'Sining',
    artist: 'Denise Julia',
    album: 'R&B OPM Hits',
    duration: 198,
    audioUrl: 'https://cdn.freesound.org/previews/665/665426_11861866-lq.mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    genre: 'OPM R&B',
    mood: 'Smooth & Groovy',
    accentColor: '#f97316',
    bitrate: '320 kbps',
    bpm: 98,
    youtubeId: 'aQMTsaF3kXI',
    source: 'youtube',
    lyrics: [
      { time: 0, text: '♪ (Smooth R&B groove intro) ♪' },
      { time: 15, text: 'Mukhang sining ang iyong mga mata' }
    ]
  }
];

export const GENRES = [
  { name: 'All', color: 'from-purple-600 to-indigo-600' },
  { name: 'OPM Acoustic', color: 'from-blue-600 to-cyan-700' },
  { name: 'OPM Pop', color: 'from-amber-500 to-yellow-600' },
  { name: 'P-Pop / Dance', color: 'from-pink-600 to-rose-700' },
];

export const INITIAL_PLAYLISTS: Playlist[] = [];
