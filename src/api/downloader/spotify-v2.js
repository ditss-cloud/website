// src/api/spotify/spotify.js
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";
import { getRandomUA } from "../../../src/utils/userAgen.js";

async function getRawSpotmateResponse(url) {
    const baseURL = "https://spotmate.online";
    const userAgent = getRandomUA();

    // 1. Get CSRF Token
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

    // 2. Request ke spotmate.online
    const headers = {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": token,
        "Cookie": cookie,
        "Referer": baseURL + "/",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": userAgent,
    };

    const response = await axios.post(
        baseURL + "/getTrackData", 
        { spotify_url: url }, 
        { 
            headers: headers,
            // Jangan parse JSON, biarkan raw
            transformResponse: [data => data]
        }
    );

    return response.data; // Ini STRING mentah
}

export default function (app) {
    // ENDPOINT KHUSUS UNTUK LIHAT RESPONS MENTAH
    app.get('/v1/debug/spotify/raw', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) {
                return res.status(400).send('URL is required');
            }

            // Ambil respons mentah sebagai string
            const rawResponse = await getRawSpotmateResponse(url);
            
            // Kirim sebagai text plain, biar bisa baca mentah
            res.set('Content-Type', 'text/plain');
            res.send(`=== RESPON MENTAH DARI SPOTMATE.ONLINE ===\n\n${rawResponse}`);

        } catch (error) {
            res.status(500).send(`ERROR: ${error.message}`);
        }
    });
}
