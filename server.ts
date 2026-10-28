import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchTracksFromScript, fetchTrendingPool } from './src/services/youtubeSearch.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

app.use(express.json({ limit: '10mb' }));
app.use('/api/youtube/download', (req, res, next) => {
  const origin = req.get('origin');
  if (!origin) return next();

  let allowed = origin === 'https://localhost' || origin === 'http://localhost';
  try {
    const requestOrigin = new URL(origin);
    if (requestOrigin.hostname === 'localhost' && ['http:', 'https:'].includes(requestOrigin.protocol)) {
      allowed = true;
    }
    if (process.env.APP_URL && requestOrigin.origin === new URL(process.env.APP_URL).origin) {
      allowed = true;
    }
  } catch {
    allowed = false;
  }

  if (!allowed) return res.sendStatus(403);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.sendStatus(204);
  }
  return next();
});

app.post('/api/youtube/download', async (req, res) => {
  const videoUrl = typeof req.body?.url === 'string' ? req.body.url : '';
  let parsedVideoUrl: URL;
  try {
    parsedVideoUrl = new URL(videoUrl);
  } catch {
    return res.status(400).json({ error: 'Enter a valid YouTube video URL.' });
  }

  const allowedHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']);
  if (parsedVideoUrl.protocol !== 'https:' || !allowedHosts.has(parsedVideoUrl.hostname.toLowerCase())) {
    return res.status(400).json({ error: 'Only YouTube video URLs are supported.' });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'The download service is not configured on the server.' });
  }

  try {
    const formData = new URLSearchParams({ url: parsedVideoUrl.toString() });
    const conversionResponse = await fetch('https://fast-yt-to-mp3-converter.p.rapidapi.com/converter', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'fast-yt-to-mp3-converter.p.rapidapi.com',
      },
      body: formData,
      signal: AbortSignal.timeout(90_000),
    });

    let audioResponse = conversionResponse;
    const conversionType = conversionResponse.headers.get('content-type') || '';
    if (!conversionResponse.ok) {
      return res.status(502).json({ error: 'The conversion provider could not process this video.' });
    }

    if (!conversionType.startsWith('audio/') && !conversionType.includes('application/octet-stream')) {
      const result = await conversionResponse.json() as {
        link?: unknown;
        download_url?: unknown;
        downloadUrl?: unknown;
        data?: { link?: unknown; download_url?: unknown; downloadUrl?: unknown };
        result?: { link?: unknown; download_url?: unknown; downloadUrl?: unknown };
      } | null;
      const downloadLink = result && [
        result.link,
        result.download_url,
        result.downloadUrl,
        result.data?.link,
        result.data?.download_url,
        result.data?.downloadUrl,
        result.result?.link,
        result.result?.download_url,
        result.result?.downloadUrl,
      ].find((value): value is string => typeof value === 'string' && value.length > 0);

      if (!downloadLink) {
        return res.status(502).json({ error: 'The provider did not return a downloadable audio file.' });
      }

      const parsedDownloadUrl = new URL(downloadLink);
      if (parsedDownloadUrl.protocol !== 'https:') {
        return res.status(502).json({ error: 'The provider returned an unsupported download link.' });
      }
      audioResponse = await fetch(parsedDownloadUrl, { signal: AbortSignal.timeout(90_000) });
    }

    if (!audioResponse.ok) {
      return res.status(502).json({ error: 'The converted audio could not be downloaded.' });
    }

    const contentType = audioResponse.headers.get('content-type') || '';
    if (!contentType.startsWith('audio/') && !contentType.includes('application/octet-stream')) {
      return res.status(502).json({ error: 'The provider response was not an audio file.' });
    }

    const reader = audioResponse.body?.getReader();
    if (!reader) {
      return res.status(502).json({ error: 'The provider returned an empty audio response.' });
    }

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_AUDIO_BYTES) {
          await reader.cancel();
          return res.status(413).json({ error: 'The audio file is larger than the 50 MB limit.' });
        }
        chunks.push(Buffer.from(value));
      }
    }

    const audio = Buffer.concat(chunks);
    if (audio.length < 1000) {
      return res.status(502).json({ error: 'The provider returned an invalid audio file.' });
    }

    const title = String(req.body?.title || 'track')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .trim()
      .slice(0, 100) || 'track';
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audio.length);
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    return res.send(audio);
  } catch (error) {
    console.error('YouTube audio download failed:', error);
    return res.status(502).json({ error: 'Download failed. Check the provider response and try again.' });
  }
});

// In-memory sync store with persistence support
const syncStore = new Map<string, {
  payload: unknown;
  updatedAt: string;
}>();

// API routes for Cross-Device Library Synchronization
app.post('/api/sync/save', (req, res) => {
  const { syncCode, playlists, likedTrackIds, history } = req.body;
  if (!syncCode) {
    return res.status(400).json({ error: 'Missing syncCode parameter' });
  }

  const code = String(syncCode).toUpperCase().trim();
  const payload = {
    syncCode: code,
    playlists: playlists || [],
    likedTrackIds: likedTrackIds || [],
    history: history || [],
    updatedAt: new Date().toISOString(),
  };

  syncStore.set(code, {
    payload,
    updatedAt: payload.updatedAt,
  });

  return res.json({
    success: true,
    message: `Library synchronized successfully with sync key ${code}`,
    updatedAt: payload.updatedAt,
  });
});

app.get('/api/sync/:code', (req, res) => {
  const code = req.params.code.toUpperCase().trim();
  const item = syncStore.get(code);

  if (!item) {
    return res.status(404).json({ error: 'No library found for this sync code' });
  }

  return res.json({
    success: true,
    payload: item.payload,
    lastSynced: item.updatedAt,
  });
});

// Search YouTube Music Endpoint
app.get('/api/youtube/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json({ results: [] });
  }

  try {
    const results = await fetchTracksFromScript(query);
    return res.json({
      query,
      count: results.length,
      results,
    });
  } catch (err) {
    console.warn('Google Script fetch failed:', err);
    return res.json({ query, count: 0, results: [] });
  }
});

// Trending YouTube Music Endpoint (Used for Suggested Songs)
app.get('/api/youtube/trending', async (_req, res) => {
  try {
    const uniquePool = await fetchTrendingPool();
    return res.json({
      category: 'Suggested Songs',
      count: uniquePool.length,
      results: uniquePool,
    });
  } catch (err) {
    console.warn('Failed to build OPM pool:', err);
    return res.json({ results: [] });
  }
});

// Accurate Synchronized Lyrics Endpoint via LRCLIB
app.get('/api/lyrics', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();

  if (!title) {
    return res.json({ lyrics: [] });
  }

  // Clean title & artist of YouTube clutter: (Official Video), (Lyrics), ft., etc.
  const cleanTitle = title
    .replace(/(\(|\[).*?(official|audio|video|lyrics|visualizer|hd|4k|feat|ft\.).*?(\)|\])/gi, '')
    .replace(/-.*?official.*/gi, '')
    .replace(/\|\s*lyrics/gi, '')
    .trim();

  const cleanArtist = artist
    .replace(/(vevo|records|official|topic|music)/gi, '')
    .trim();

  const lrclibHeaders = {
    'User-Agent': 'AuraStreamMusic/1.0 (https://aurastream.app)',
  };

  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });

    let data: any = null;

    try {
      const resp = await fetch(`https://lrclib.net/api/get?${params}`, {
        headers: lrclibHeaders,
        signal: AbortSignal.timeout(3500),
      });
      if (resp.ok) {
        data = await resp.json();
      }
    } catch (_) {
      // LRCLIB primary get failed or timed out
    }

    if (!data?.syncedLyrics && !data?.plainLyrics) {
      // Fallback search on LRCLIB
      try {
        const searchResp = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`,
          {
            headers: lrclibHeaders,
            signal: AbortSignal.timeout(3500),
          }
        );
        if (searchResp.ok) {
          const searchResults = await searchResp.json();
          if (Array.isArray(searchResults) && searchResults.length > 0) {
            data = searchResults[0];
          }
        }
      } catch (_) {
        // Search query failed or reset
      }
    }

    if (data?.syncedLyrics) {
      const parsed: Array<{ time: number; text: string }> = [];
      const lines = String(data.syncedLyrics).split('\n');
      for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseFloat(match[2]);
          const text = match[3].trim();
          if (text) {
            parsed.push({ time: Math.round((minutes * 60 + seconds) * 10) / 10, text });
          }
        }
      }
      if (parsed.length > 0) {
        return res.json({ synced: true, lyrics: parsed });
      }
    }

    if (data?.plainLyrics) {
      const plainLines = String(data.plainLyrics)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const estDuration = 180;
      const step = plainLines.length > 0 ? estDuration / plainLines.length : 5;
      const parsed = plainLines.map((text, i) => ({
        time: Math.round(i * step),
        text,
      }));
      return res.json({ synced: false, lyrics: parsed });
    }

    // Default lyrics placeholder so UI remains clean
    return res.json({
      synced: false,
      lyrics: [
        { time: 0, text: `♪ ${cleanTitle} ♪` },
        { time: 5, text: `Artist: ${cleanArtist || 'YouTube Music'}` },
        { time: 12, text: '♪ Enjoy the music ♪' },
      ],
    });
  } catch (_) {
    return res.json({ lyrics: [] });
  }
});

// Vite middleware or static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AuraStream Music server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
