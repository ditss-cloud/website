import axios from "axios";
import * as cheerio from 'cheerio';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";
import { getRandomUA } from "../../../src/utils/userAgen.js";

async function spotifyDownloader(url) {
    if (!url) throw new Error("URL is required");
    if (!url.includes('spotify.com')) throw new Error("Invalid URL, please enter a valid Spotify URL");

    const baseURL = "https://spotmate.online";
    const userAgent = getRandomUA();

    try {
        const getTokenResponse = await axios.get(baseURL, {
            headers: { "User-Agent": userAgent },
        });

        const html = getTokenResponse.data;
        const match = html.match(
            /<meta[^>]+(csrf[-_]?token|csrf|csrf_token)[^>]+content=["']([^"']+)["']/
        );
        
        if (!match) throw new Error("CSRF token not found");
        
        const token = match[2];
        const cookie = (getTokenResponse.headers["set-cookie"] || [])
            .map((c) => c.split(";")[0])
            .join("; ");

        const headers = {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": token,
            Cookie: cookie,
            Referer: baseURL + "/",
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": userAgent,
        };

        const trackResponse = await axios.post(
            baseURL + "/getTrackData", 
            { spotify_url: url }, 
            { headers }
        );

        if (trackResponse.status !== 200) {
            throw new Error("Failed to get track metadata");
        }

        const meta = trackResponse.data;
        
        const result = {
            metadata: {
                title: meta.name,
                id: meta.id,
                images: meta.album?.images?.[0]?.url || "",
                duration: formatTime(meta.duration_ms),
                artist: meta.artists?.[0]?.name || "Unknown Artist",
                album: meta.album?.name || "",
                release_date: meta.album?.release_date || "",
                popularity: meta.popularity || 0
            },
            download: null,
            lyrics: ""
        };

        try {
            const geniusUrl = `https://genius.com/${result.metadata.artist.split(" ").join("-").toLowerCase()}-${result.metadata.title.split(" ").join("-").toLowerCase()}-lyrics`;
            
            const lyricsResponse = await axios.get(geniusUrl, {
                headers: {
                    'User-Agent': userAgent
                },
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                },
                timeout: 10000
            });

            const $ = cheerio.load(lyricsResponse.data);
            const lyricsContainers = $('[data-lyrics-container="true"]');
            let lyrics = '';

            lyricsContainers.each((i, container) => {
                const containerText = $(container).html();
                const textWithBreaks = containerText
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/div>/gi, '\n')
                    .replace(/<[^>]+>/g, '');

                lyrics += textWithBreaks + '\n';
            });

            result.lyrics = lyrics
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n')
                .split(';')
                .pop() 
                || 'Lyrics not found';

        } catch (lyricsError) {
            console.log('Lyrics not available:', lyricsError.message);
            result.lyrics = "Lyrics not available";
        }

        const cdnURL = `https://cdn-spotify-247.zm.io.vn/download/${result.metadata.id}/ditssganteng?name=${encodeURIComponent(result.metadata.title)}&artist=${encodeURIComponent(result.metadata.artist)}`;
        result.download = cdnURL;

        return result;

    } catch (error) {
        console.error('Spotify downloader error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function (app) {
    app.get('/v1/download/spotify', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'URL is required',
                error: 'Missing url parameter in query string' 
            });
        }

        try {
            const results = await spotifyDownloader(url);
            res.status(200).json({
                status: true,
                message: 'Spotify track processed successfully',
                result: results
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to process Spotify track',
                error: error.message 
            });
        }
    });

    app.post('/v1/download/spotify', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                status: false, 
                message: 'URL is required',
                error: 'Missing url field in request body' 
            });
        }

        try {
            const results = await spotifyDownloader(url);
            res.status(200).json({
                status: true,
                message: 'Spotify track processed successfully',
                result: results
            });
        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to process Spotify track',
                error: error.message 
            });
        }
    });
              }
