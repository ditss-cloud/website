import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function fontinterceptor(url) {
    try {
        if (!url) throw new Error('Url is required');
        
        const { data } = await axios.get('https://3yw15p319h.execute-api.us-east-1.amazonaws.com/prod/scrape', {
            params: {
                url: url.startsWith('https://') ? url : 'https://' + url
            },
            timeout: 15000
        });
        
        return data;
    } catch (error) {
        throw new Error(error.message);
    }
}

export default function (app) {
    app.get('/v1/tools/fontinterceptor', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.query;
        
        if (!url) {
            return res.json({ 
                status: false, 
                creator: "DitssCloud",
                error: 'URL is required' 
            });
        }

        try {
            const results = await fontinterceptor(url);
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Fonts extracted successfully',
                result: results,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                status: false,
                creator: "DitssCloud", 
                error: error.message 
            });
        }
    });

    app.post('/v1/tools/fontinterceptor', createApiKeyMiddleware(), async (req, res) => {
        const { url } = req.body;
        
        if (!url) {
            return res.json({ 
                status: false,
                creator: "DitssCloud", 
                error: 'URL is required' 
            });
        }

        try {
            const results = await fontinterceptor(url);
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Fonts extracted successfully',
                result: results,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ 
                status: false,
                creator: "DitssCloud",
                error: error.message 
            });
        }
    });
}
