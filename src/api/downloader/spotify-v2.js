// src/api/spotify/spotify.js
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";
import { getRandomUA } from "../../../src/utils/userAgen.js";

async function fetchSpotmateResponse(url) {
    if (!url) throw new Error("URL is required");
    if (!url.includes('spotify.com')) throw new Error("Invalid URL, please enter a valid Spotify URL");

    const baseURL = "https://spotmate.online";
    const userAgent = getRandomUA();

    // 1. Ambil Token CSRF dari halaman utama
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

    // 2. Buat request ke endpoint `/getTrackData` spotmate.online
    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
        "Cookie": cookie,
        "Referer": baseURL + "/",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": userAgent,
    };

    // Gunakan axios untuk mendapatkan respons asli
    const trackResponse = await axios.post(
        baseURL + "/getTrackData", 
        { spotify_url: url }, 
        { 
            headers: headers,
            responseType: 'json' // Jaga format respons
        }
    );

    // Kembalikan data dan headers dari respons spotmate.online
    return {
        status: trackResponse.status,
        headers: trackResponse.headers,
        data: trackResponse.data
    };
}

export default function (app) {
    // Endpoint GET
    app.get('/v2/download/spotify', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'URL is required in query parameters'
                });
            }

            // Ambil respons langsung dari spotmate.online
            const spotmateResponse = await fetchSpotmateResponse(url);
            
            // Teruskan status kode, headers, dan data JSON asli
            res.status(spotmateResponse.status)
               .set(spotmateResponse.headers)
               .json(spotmateResponse.data); // [citation:4][citation:7]

        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to fetch from Spotify service',
                error: error.message 
            });
        }
    });

    // Endpoint POST
    app.post('/v2/download/spotify', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'URL is required in request body'
                });
            }

            // Ambil respons langsung dari spotmate.online
            const spotmateResponse = await fetchSpotmateResponse(url);
            
            // Teruskan respons asli
            res.status(spotmateResponse.status)
               .set(spotmateResponse.headers)
               .json(spotmateResponse.data);

        } catch (error) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to fetch from Spotify service',
                error: error.message 
            });
        }
    });
                                                                      }
