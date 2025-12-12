import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function spotify(input) {
    try {
        if (!input) throw new Error('Input is required.');
        
        const { data: s } = await axios.get(`https://spotdown.org/api/song-details?url=${encodeURIComponent(input)}`, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            }
        });
        
        const song = s.songs[0];
        if (!song) throw new Error('Track not found.');
        
        const { data } = await axios.post('https://spotdown.org/api/download', {
            url: song.url
        }, {
            headers: {
                origin: 'https://spotdown.org',
                referer: 'https://spotdown.org/',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
            },
            responseType: 'arraybuffer'
        });
        
        return {
            status: true,
            creator: "DitssCloud",
            message: 'Spotify track downloaded successfully',
            result: {
                metadata: {
                    title: song.title,
                    artist: song.artist,
                    duration: song.duration,
                    cover: song.thumbnail,
                    url: song.url
                },
                audio_base64: Buffer.from(data).toString('base64'),
                audio_size: data.length,
                audio_format: 'mp3'
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        throw new Error(error.message);
    }
}

export default function (app) {
    app.get('/v2/spotify', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.json({ 
                status: false, 
                creator: "DitssCloud",
                error: 'URL is required' 
            });
        }

        try {
            const results = await spotify(url);
            res.status(200).json(results);
        } catch (error) {
            res.status(500).json({ 
                status: false,
                creator: "DitssCloud",
                error: error.message 
            });
        }
    });

    app.post('/v2/spotify', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ 
                status: false,
                creator: "DitssCloud", 
                error: 'URL is required' 
            });
        }

        try {
            const results = await spotify(url);
            res.status(200).json(results);
        } catch (error) {
            res.status(500).json({ 
                status: false,
                creator: "DitssCloud",
                error: error.message 
            });
        }
    });
}
