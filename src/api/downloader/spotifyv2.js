import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function getSpotifyMetadata(input) {
    try {
        if (!input) throw new Error('Input is required.');
        
        const { data: s } = await axios.get(`https://spotdown.org/api/song-details?url=${encodeURIComponent(input)}`, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            timeout: 10000
        });
        
        const song = s.songs[0];
        if (!song) throw new Error('Track not found.');
        
        return {
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            cover: song.thumbnail,
            url: song.url,
            album: song.album || '',
            year: song.year || '',
            genre: song.genre || '',
            explicit: song.explicit || false
        };
    } catch (error) {
        throw new Error(`Failed to get track metadata: ${error.message}`);
    }
}

async function downloadSpotifyAudio(trackUrl) {
    try {
        if (!trackUrl) throw new Error('Track URL is required.');
        
        const { data } = await axios.post('https://spotdown.org/api/download', {
            url: trackUrl
        }, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        return data;
    } catch (error) {
        throw new Error(`Failed to download audio: ${error.message}`);
    }
}

export default function (app) {
    // ============ GET TRACK METADATA ============
    app.get('/v2/spotify/metadata', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL or search query is required',
                    error: 'Missing "url" parameter in query string'
                });
            }
            
            const metadata = await getSpotifyMetadata(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Spotify track metadata fetched successfully',
                result: metadata,
                requested: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Spotify Metadata Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch Spotify track metadata',
                error: error.message
            });
        }
    });

    app.post('/v2/spotify/metadata', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL or search query is required',
                    error: 'Missing "url" field in request body'
                });
            }
            
            const metadata = await getSpotifyMetadata(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Spotify track metadata fetched successfully',
                result: metadata,
                requested: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Spotify Metadata Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch Spotify track metadata',
                error: error.message
            });
        }
    });

    // ============ DOWNLOAD TRACK AUDIO ============
    app.get('/v2/spotify/download', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL is required',
                    error: 'Missing "url" parameter in query string'
                });
            }
            
            // Get metadata first to get the actual track URL
            const metadata = await getSpotifyMetadata(url);
            const audioBuffer = await downloadSpotifyAudio(metadata.url);
            
            // Set headers for audio download
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${metadata.artist} - ${metadata.title}.mp3"`,
                'Content-Length': audioBuffer.length,
                'X-Track-Info': JSON.stringify({
                    title: metadata.title,
                    artist: metadata.artist,
                    duration: metadata.duration,
                    downloaded_at: new Date().toISOString()
                })
            });
            
            res.send(audioBuffer);
            
        } catch (error) {
            console.error('[Spotify Download Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to download Spotify track',
                error: error.message
            });
        }
    });

    app.post('/v2/spotify/download', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL is required',
                    error: 'Missing "url" field in request body'
                });
            }
            
            const metadata = await getSpotifyMetadata(url);
            const audioBuffer = await downloadSpotifyAudio(metadata.url);
            
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${metadata.artist} - ${metadata.title}.mp3"`,
                'Content-Length': audioBuffer.length,
                'X-Track-Info': JSON.stringify({
                    title: metadata.title,
                    artist: metadata.artist,
                    duration: metadata.duration,
                    downloaded_at: new Date().toISOString()
                })
            });
            
            res.send(audioBuffer);
            
        } catch (error) {
            console.error('[Spotify Download Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to download Spotify track',
                error: error.message
            });
        }
    });

    // ============ ALL-IN-ONE ENDPOINT ============
    app.get('/v2/spotify', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url, type = 'metadata' } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL is required',
                    error: 'Missing "url" parameter'
                });
            }
            
            const metadata = await getSpotifyMetadata(url);
            
            if (type === 'download') {
                const audioBuffer = await downloadSpotifyAudio(metadata.url);
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `attachment; filename="${metadata.artist} - ${metadata.title}.mp3"`,
                    'Content-Length': audioBuffer.length
                });
                return res.send(audioBuffer);
            }
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Spotify track information fetched successfully',
                result: metadata,
                download_url: `/v2/spotify/download?url=${encodeURIComponent(url)}`,
                requested: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Spotify Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to process Spotify request',
                error: error.message
            });
        }
    });

    app.post('/v2/spotify', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url, type = 'metadata' } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Track URL is required',
                    error: 'Missing "url" field'
                });
            }
            
            const metadata = await getSpotifyMetadata(url);
            
            if (type === 'download') {
                const audioBuffer = await downloadSpotifyAudio(metadata.url);
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `attachment; filename="${metadata.artist} - ${metadata.title}.mp3"`,
                    'Content-Length': audioBuffer.length
                });
                return res.send(audioBuffer);
            }
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Spotify track information fetched successfully',
                result: metadata,
                download_url: `/v2/spotify/download`,
                download_post: { url: url },
                requested: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Spotify Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to process Spotify request',
                error: error.message
            });
        }
    });

    // ============ API INFO ENDPOINT ============
    app.get('/v2/spotify/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Spotify v2 API information',
            endpoints: {
                metadata: {
                    get: '/v2/spotify/metadata?url=TRACK_URL_OR_QUERY',
                    post: '/v2/spotify/metadata (JSON with "url" field)'
                },
                download: {
                    get: '/v2/spotify/download?url=TRACK_URL_OR_QUERY',
                    post: '/v2/spotify/download (JSON with "url" field)'
                },
                all_in_one: {
                    get: '/v2/spotify?url=TRACK_URL&type=metadata|download',
                    post: '/v2/spotify (JSON with "url" and optional "type" fields)'
                }
            },
            input_types: {
                url: 'Spotify track URL (e.g., https://open.spotify.com/track/...)',
                query: 'Track name or artist query (e.g., "tek it", "Billie Eilish")'
            },
            supported_methods: ['GET', 'POST'],
            features: [
                'Track metadata extraction',
                'Direct audio download',
                'Search by URL or query',
                'MP3 format output'
            ],
            timestamp: new Date().toISOString()
        });
    });
}
