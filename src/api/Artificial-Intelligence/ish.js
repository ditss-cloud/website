import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default function (app) {
    // ENDPOINT PROXY MENTAH - Respons 100% sama dengan ish.chat
    app.get('/v1/ai/ishchat/proxy', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { question, model = 'gpt-oss-120b' } = req.query;
            
            if (!question) {
                // Kembalikan error juga dalam format ish.chat
                return res.status(400).json({
                    error: {
                        message: 'Missing "question" parameter',
                        type: 'invalid_request_error'
                    }
                });
            }
            
            // Buat request langsung ke ish.chat tanpa transformasi
            const response = await axios.post(
                'https://openai.junioralive.workers.dev/v1/chat/completions', 
                {
                    model: model,
                    messages: [{
                        role: 'user',
                        content: question
                    }],
                    stream: false
                }, 
                {
                    headers: {
                        origin: 'https://ish.chat',
                        referer: 'https://ish.chat/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                        'x-proxy-key': 'ish-7f9e2c1b-5c8a-4b0f-9a7d-1e5c3b2a9f74'
                    },
                    // JANGAN transform response sama sekali!
                    transformResponse: [data => data],
                    // Jangan throw error untuk status non-2xx
                    validateStatus: function (status) {
                        return true; // Terima semua status
                    }
                }
            );
            
            // TERUSKAN PERSIS APA ADANYA:
            // 1. Status code sama
            res.status(response.status);
            
            // 2. Headers sama (kecuali CORS)
            Object.keys(response.headers).forEach(key => {
                // Skip beberapa header yang mungkin bermasalah
                if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                    res.setHeader(key, response.headers[key]);
                }
            });
            
            // 3. Body sama persis
            res.send(response.data);
            
        } catch (error) {
            // Tangkap error dan kembalikan dalam format ish.chat
            console.error('[Proxy Error]:', error.message);
            
            if (error.response) {
                // Jika ada response error dari ish.chat, teruskan
                res.status(error.response.status)
                   .set(error.response.headers)
                   .send(error.response.data);
            } else {
                // Error network/timeout
                res.status(500).json({
                    error: {
                        message: error.message,
                        type: 'internal_server_error'
                    }
                });
            }
        }
    });

    // ENDPOINT NORMAL (yang kita pakai sehari-hari)
    app.get('/v1/ai/ishchat', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { question, model = 'gpt-oss-120b' } = req.query;
            
            if (!question) {
                return res.status(400).json({
                    status: false,
                    message: 'Question is required',
                    error: 'Missing "question" parameter'
                });
            }
            
            const response = await axios.post(
                'https://openai.junioralive.workers.dev/v1/chat/completions', 
                {
                    model: model,
                    messages: [{
                        role: 'user',
                        content: question
                    }],
                    stream: false
                }, 
                {
                    headers: {
                        origin: 'https://ish.chat',
                        referer: 'https://ish.chat/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                        'x-proxy-key': 'ish-7f9e2c1b-5c8a-4b0f-9a7d-1e5c3b2a9f74'
                    }
                }
            );
            
            const result = response.data?.choices?.[0]?.message?.content;
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'AI response generated successfully',
                result: result,
                model: model,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[IshChat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to get AI response',
                error: error.message
            });
        }
    });
}
/*

import { getRandomUA } from "../../../src/utils/userAgen.js";
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function ishchat(question, model = 'gpt-oss-120b') {
    try {
        const models = ['grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'gpt-oss-120b', 'grok-3-mini'];
        
        if (!question) throw new Error('Question is required.');
        if (!models.includes(model)) throw new Error(`Available models: ${models.join(', ')}.`);
        
        const { data } = await axios.post('https://openai.junioralive.workers.dev/v1/chat/completions', {
            model: model,
            messages: [{
                role: 'user',
                content: question
            }],
            stream: false
        }, {
            headers: {
                origin: 'https://ish.chat',
                referer: 'https://ish.chat/',
                'user-agent': getRandomUA(),
                'x-proxy-key': 'ish-7f9e2c1b-5c8a-4b0f-9a7d-1e5c3b2a9f74'
            }
        });
        
        const result = data?.choices?.[0]?.message?.content;
        if (!result) throw new Error('No result found.');
        
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

export default function (app) {
    app.get('/v1/ai/ishchat', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { question, model = 'gpt-oss-120b' } = req.query;
            
            if (!question) {
                return res.status(400).json({
                    status: false,
                    message: 'Question is required',
                    error: 'Missing "question" parameter in query string'
                });
            }
            
            const response = await ishchat(question, model);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'AI response generated successfully',
                result: response,
                model: model,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[IshChat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to get AI response',
                error: error.message
            });
        }
    });

    app.post('/v1/ai/ishchat', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { question, model = 'gpt-oss-120b' } = req.body;
            
            if (!question) {
                return res.status(400).json({
                    status: false,
                    message: 'Question is required',
                    error: 'Missing "question" field in request body'
                });
            }
            
            const response = await ishchat(question, model);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'AI response generated successfully',
                result: response,
                model: model,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[IshChat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to get AI response',
                error: error.message
            });
        }
    });

    // Endpoint untuk melihat model yang tersedia
    app.get('/v1/ai/ishchat/models', createApiKeyMiddleware(), (req, res) => {
        const models = ['grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'gpt-oss-120b', 'grok-3-mini'];
        
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Available AI models',
            models: models,
            default: 'gpt-oss-120b',
            timestamp: new Date().toISOString()
        });
    });
}*/
