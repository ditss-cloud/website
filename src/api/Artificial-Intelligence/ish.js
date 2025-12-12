// ['grok-4-fast-reasoning', 'grok-4-fast-non-reasoning'
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function fetchIshChatResponse(question, model = 'gpt-oss-120b') {
    try {
        const models = ['gpt-4o-mini', 'o3-mini', 'o4-mini', 'grok-3-mini', 'gpt-5-mini', 'gpt-5-nano', 'gpt-oss-120b', 'gpt-5', 'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning'];
        
        if (!question) throw new Error('Question is required.');
        if (!models.includes(model)) throw new Error(`Available models: ${models.join(', ')}.`);
        
        const response = await axios.post('https://openai.junioralive.workers.dev/v1/chat/completions', {
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
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-proxy-key': 'ish-7f9e2c1b-5c8a-4b0f-9a7d-1e5c3b2a9f74'
            }
        });
        
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error?.message || error.message);
    }
}

export default function (app) {
    // Endpoint normal dengan format clean
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
            
            const rawData = await fetchIshChatResponse(question, model);
            
            // Format clean response berdasarkan struktur yang kita lihat
            const result = {
                status: true,
                creator: "DitssCloud",
                message: 'AI response generated successfully',
                data: {
                    id: rawData.id,
                    model: rawData.model,
                    created: rawData.created,
                    response: rawData.choices?.[0]?.message?.content || '',
                    reasoning: rawData.choices?.[0]?.message?.reasoning_content || null, // Hanya untuk model tertentu
                    finish_reason: rawData.choices?.[0]?.finish_reason,
                    usage: rawData.usage
                },
                timestamp: new Date().toISOString()
            };
            
            res.status(200).json(result);
            
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
                    error: 'Missing "question" field'
                });
            }
            
            const rawData = await fetchIshChatResponse(question, model);
            
            const result = {
                status: true,
                creator: "DitssCloud",
                message: 'AI response generated successfully',
                data: {
                    id: rawData.id,
                    model: rawData.model,
                    created: rawData.created,
                    response: rawData.choices?.[0]?.message?.content || '',
                    reasoning: rawData.choices?.[0]?.message?.reasoning_content || null,
                    finish_reason: rawData.choices?.[0]?.finish_reason,
                    usage: rawData.usage
                },
                timestamp: new Date().toISOString()
            };
            
            res.status(200).json(result);
            
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

    // Proxy endpoint tetap seperti sebelumnya
    app.get('/v1/ai/ishchat/proxy', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { question, model = 'gpt-oss-120b' } = req.query;
            
            if (!question) {
                return res.status(400).json({
                    error: {
                        message: 'Missing "question" parameter',
                        type: 'invalid_request_error'
                    }
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
                    },
                    transformResponse: [data => data],
                    validateStatus: function (status) {
                        return true;
                    }
                }
            );
            
            res.status(response.status)
               .set(response.headers)
               .send(response.data);
               
        } catch (error) {
            console.error('[Proxy Error]:', error.message);
            
            if (error.response) {
                res.status(error.response.status)
                   .set(error.response.headers)
                   .send(error.response.data);
            } else {
                res.status(500).json({
                    error: {
                        message: error.message,
                        type: 'internal_server_error'
                    }
                });
            }
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
