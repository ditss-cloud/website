import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function amdata(url) {
    try {
        const match = url.match(/\/u\/([^\/]+)\/p\/([^\/\?#]+)/);
        if (!match) throw new Error('Invalid Alight Motion URL format');
        
        const { data } = await axios.post('https://us-central1-alight-creative.cloudfunctions.net/getProjectMetadata', {
            data: {
                uid: match[1],
                pid: match[2],
                platform: 'android',
                appBuild: 1002592,
                acctTestMode: 'normal'
            }
        }, {
            headers: {
                'content-type': 'application/json; charset=utf-8'
            },
            timeout: 10000
        });
        
        if (!data || !data.result) {
            throw new Error('No project data found');
        }
        
        return data.result;
    } catch (error) {
        throw new Error(`Failed to fetch Alight Motion data: ${error.message}`);
    }
}

export default function (app) {
    // GET endpoint untuk Alight Motion
    app.get('/v1/tools/alightmotion', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Alight Motion URL is required',
                    error: 'Missing "url" parameter in query string'
                });
            }
            
            const result = await amdata(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Alight Motion project data fetched successfully',
                result: result,
                requested_url: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Alight Motion Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch Alight Motion project data',
                error: error.message
            });
        }
    });

    // POST endpoint untuk Alight Motion
    app.post('/v1/tools/alightmotion', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Alight Motion URL is required',
                    error: 'Missing "url" field in request body'
                });
            }
            
            const result = await amdata(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Alight Motion project data fetched successfully',
                result: result,
                requested_url: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Alight Motion Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch Alight Motion project data',
                error: error.message
            });
        }
    });

    // Endpoint untuk info API
    app.get('/v1/tools/alightmotion/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Alight Motion API information',
            endpoints: {
                get: '/v1/tools/alightmotion?url=ALIGHT_MOTION_URL',
                post: '/v1/tools/alightmotion (JSON with "url" field)'
            },
            url_format: 'https://alightcreative.com/am/share/u/{USER_ID}/p/{PROJECT_ID}',
            supported_methods: ['GET', 'POST'],
            timestamp: new Date().toISOString()
        });
    });
              }
