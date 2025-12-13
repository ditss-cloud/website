import axios from 'axios';
import crypto from 'crypto';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

class Qwen {
    constructor({ email, password }) {
        if (!email) throw new Error('Email is required.');
        if (!password) throw new Error('Password is required.');
        
        this.api = axios.create({
            baseURL: 'https://chat.qwen.ai/api',
            headers: {
                'Bx-V': '2.5.31',
                'Connection': 'keep-alive',
                'Host': 'chat.qwen.ai',
                'Origin': 'https://chat.qwen.ai',
                'Referer': 'https://chat.qwen.ai/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
                'Version': '0.0.230',
                'X-Request-Id': crypto.randomUUID()
            }
        });
        this.types = {
            chat: 't2t',
            search: 'search',
            thinking: 'think'
        };
        this.token = '';
        this.expiresAt = 0;
        this.email = email;
        this.password = password;
        this.isInitialized = false;
    }
    
    isTokenExpired() {
        return !this.token || Date.now() / 1000 >= this.expiresAt - 300;
    }
    
    async refreshToken() {
        try {
            const { data } = await this.api.get('/v1/auths', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (data.token && data.expires_at) {
                this.token = data.token;
                this.expiresAt = data.expires_at;
                return data;
            }
        } catch (error) {
            await this.login();
        }
    }
    
    async ensureValidToken() {
        if (!this.isInitialized) {
            await this.login();
            this.isInitialized = true;
        } else if (this.isTokenExpired()) {
            await this.refreshToken();
        }
    }
    
    async login() {
        try {
            const { data } = await this.api.post('/v1/auths/signin', {
                email: this.email,
                password: crypto.createHash('sha256').update(this.password).digest('hex')
            });
            
            this.token = data.token;
            this.expiresAt = data.expires_at;
            
            return data;
        } catch (error) {
            throw new Error(`Failed to login: ${error.message}.`);
        }
    }
    
    async models() {
        try {
            await this.ensureValidToken();
            
            const { data } = await this.api.get('/models', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return data.data.map(model => {
                const abilities = model.info.meta.abilities || {};
                const chatTypes = model.info.meta.chat_type || [];
                
                return {
                    id: model.id,
                    name: model.name,
                    thinking: abilities.thinking === 1 || abilities.thinking === 4 || false,
                    search: chatTypes.includes('search'),
                    vision: abilities.vision === 1 || false,
                    context_length: model.context_length || 0,
                    provider: model.provider || 'qwen'
                };
            });
        } catch (error) {
            throw new Error(`Failed to get models: ${error.message}.`);
        }
    }
    
    async setInstruction(prompt) {
        try {
            await this.ensureValidToken();
            if (!prompt) throw new Error('Prompt is required.');
            
            const { data } = await this.api.post('/v2/users/user/settings/update', {
                personalization: {
                    name: '',
                    description: '',
                    style: '',
                    instruction: prompt,
                    enable_for_new_chat: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return data.data;
        } catch (error) {
            throw new Error(`Failed to set instruction: ${error.message}.`);
        }
    }
    
    async newChat({ model = 'qwen3-max' } = {}) {
        try {
            await this.ensureValidToken();
            
            const models = await this.models();
            if (!models.map(m => m.id).includes(model)) throw new Error('Model not found.');
            
            const { data } = await this.api.post('/v2/chats/new', {
                title: 'New Chat',
                models: [model],
                chat_mode: 'normal',
                chat_type: 't2t',
                timestamp: Date.now()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return data.data.id;
        } catch (error) {
            throw new Error(`Failed to create new chat: ${error.message}.`);
        }
    }
    
    async loadChat(chatId) {
        try {
            await this.ensureValidToken();
            
            if (!chatId) throw new Error('Chat id is required.');
            
            const { data } = await this.api.get(`/v2/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return data.data;
        } catch (error) {
            throw new Error(`Failed to load chat: ${error.message}.`);
        }
    }
    
    async deleteChat(chatId) {
        try {
            await this.ensureValidToken();
            
            if (!chatId) throw new Error('Chat id is required.');
            
            const { data } = await this.api.delete(`/v2/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            return data.data;
        } catch (error) {
            throw new Error(`Failed to delete chat: ${error.message}.`);
        }
    }
    
    async chat(question, { instruction = null, model = 'qwen3-max', type = 'chat', chatId = null } = {}) {
        try {
            await this.ensureValidToken();
            
            if (!question) throw new Error('Question is required.');
            
            const models = await this.models();
            if (!models.map(m => m.id).includes(model)) throw new Error('Model not found.');
            if (type === 'search' && !models.find(m => model === m.id).search) throw new Error('Search is not supported by the model.');
            if (type === 'thinking' && !models.find(m => model === m.id).thinking) throw new Error('Thinking is not supported by the model.');
            if (!this.types[type]) throw new Error('Type not found.');
            
            let parent = null;
            if (chatId) {
                const chatInfo = await this.loadChat(chatId);
                parent = chatInfo.currentId;
            } else {
                chatId = await this.newChat({ model });
            }
            
            if (instruction) await this.setInstruction(instruction);
            
            const { data } = await this.api.post('/v2/chat/completions', {
                stream: true,
                incremental_output: true,
                chat_id: chatId,
                chat_mode: 'normal',
                model: model,
                parent_id: parent,
                messages: [
                    {
                        fid: crypto.randomUUID(),
                        parentId: parent,
                        childrenIds: [crypto.randomUUID()],
                        role: 'user',
                        content: question,
                        user_action: 'chat',
                        files: [],
                        timestamp: Date.now(),
                        models: [model],
                        chat_type: this.types[type],
                        feature_config: {
                            thinking_enabled: type === 'thinking',
                            output_schema: 'phase'
                        },
                        extra: {
                            meta: {
                                subChatType: this.types[type]
                            }
                        },
                        sub_chat_type: this.types[type],
                        parent_id: parent
                    }
                ],
                timestamp: Date.now()
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                params: {
                    chat_id: chatId
                },
                responseType: 'stream'
            });
            
            let responseData = '';
            const decoder = new TextDecoder();
            
            return new Promise((resolve, reject) => {
                data.on('data', (chunk) => {
                    responseData += decoder.decode(chunk);
                });
                
                data.on('end', () => {
                    try {
                        const lines = responseData.split('\n\n').filter(l => l.trim() && l.startsWith('data: ')).map(l => JSON.parse(l.substring(6)));
                        const res = {
                            chatId: null,
                            response: {
                                reasoning: '',
                                content: '',
                                web_search: []
                            },
                            timestamp: new Date().toISOString()
                        };
                        
                        lines.forEach(l => {
                            if (l?.['response.created']?.chat_id) res.chatId = l['response.created'].chat_id;
                            const d = l?.choices?.[0]?.delta;
                            if (d?.phase === 'think' && d.content) res.response.reasoning += d.content;
                            if (d?.phase === 'answer' && d.content) res.response.content += d.content;
                            if (d?.phase === 'web_search' && d.extra?.web_search_info) res.response.web_search = d.extra.web_search_info;
                        });
                        
                        resolve({
                            status: true,
                            creator: "DitssCloud",
                            message: 'Qwen response generated successfully',
                            result: res,
                            timestamp: new Date().toISOString()
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
                
                data.on('error', (error) => {
                    reject(new Error(`Stream error: ${error.message}`));
                });
            });
        } catch (error) {
            throw new Error(`Failed to chat: ${error.message}.`);
        }
    }
}

export default function (app) {
    // Store user sessions
    const userSessions = new Map();
    
    // ============ LOGIN / INITIALIZE ============
    app.post('/v1/ai/qwen/login', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Email and password are required'
                });
            }
            
            const qwen = new Qwen({ email, password });
            await qwen.login();
            
            // Generate session ID
            const sessionId = crypto.randomUUID();
            userSessions.set(sessionId, qwen);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Logged in successfully',
                session_id: sessionId,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Login Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ GET MODELS ============
    app.get('/v1/ai/qwen/models', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const models = await qwen.models();
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Models fetched successfully',
                result: models,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Models Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ CHAT ============
    app.post('/v1/ai/qwen/chat', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            const { question, instruction = null, model = 'qwen3-max', type = 'chat', chat_id = null } = req.body;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            if (!question) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Question is required'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const result = await qwen.chat(question, { 
                instruction, 
                model, 
                type, 
                chatId: chat_id 
            });
            
            res.status(200).json(result);
            
        } catch (error) {
            console.error('[Qwen Chat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ NEW CHAT ============
    app.post('/v1/ai/qwen/chat/new', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            const { model = 'qwen3-max' } = req.body;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const chatId = await qwen.newChat({ model });
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'New chat created successfully',
                result: {
                    chat_id: chatId
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen New Chat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ LOAD CHAT ============
    app.get('/v1/ai/qwen/chat/:chat_id', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            const { chat_id } = req.params;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            if (!chat_id) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Chat ID is required'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const chatInfo = await qwen.loadChat(chat_id);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Chat loaded successfully',
                result: chatInfo,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Load Chat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ DELETE CHAT ============
    app.delete('/v1/ai/qwen/chat/:chat_id', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            const { chat_id } = req.params;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            if (!chat_id) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Chat ID is required'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const result = await qwen.deleteChat(chat_id);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Chat deleted successfully',
                result: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Delete Chat Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
// ============ SET INSTRUCTION ============
    app.post('/v1/ai/qwen/instruction', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            const { instruction } = req.body;
            
            if (!session_id || !userSessions.has(session_id)) {
                return res.status(401).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Invalid or expired session. Please login first.'
                });
            }
            
            if (!instruction) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Instruction is required'
                });
            }
            
            const qwen = userSessions.get(session_id);
            const result = await qwen.setInstruction(instruction);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Instruction set successfully',
                result: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Instruction Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ LOGOUT ============
    app.post('/v1/ai/qwen/logout', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { session_id } = req.headers;
            
            if (!session_id) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Session ID is required'
                });
            }
            
            if (userSessions.has(session_id)) {
                userSessions.delete(session_id);
            }
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Logged out successfully',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[Qwen Logout Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });
    
    // ============ API INFO ============
    app.get('/v1/ai/qwen/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Qwen AI API',
            endpoints: {
                login: {
                    path: '/v1/ai/qwen/login',
                    method: 'POST',
                    parameters: {
                        email: 'Qwen account email',
                        password: 'Qwen account password'
                    }
                },
                models: {
                    path: '/v1/ai/qwen/models',
                    method: 'GET',
                    headers: {
                        'session_id': 'Session ID from login'
                    }
                },
                chat: {
                    path: '/v1/ai/qwen/chat',
                    method: 'POST',
                    headers: {
                        'session_id': 'Session ID from login'
                    },
                    parameters: {
                        question: 'Question (required)',
                        instruction: 'Custom instruction (optional)',
                        model: 'qwen3-max (default), qwen3-7b, etc.',
                        type: 'chat (default), search, thinking',
                        chat_id: 'Existing chat ID (optional)'
                    }
                },
                new_chat: {
                    path: '/v1/ai/qwen/chat/new',
                    method: 'POST',
                    headers: {
                        'session_id': 'Session ID from login'
                    },
                    parameters: {
                        model: 'Model to use'
                    }
                },
                logout: {
                    path: '/v1/ai/qwen/logout',
                    method: 'POST',
                    headers: {
                        'session_id': 'Session ID from login'
                    }
                }
            },
            session_flow: 'Login → Get Session ID → Use Session ID in headers → Logout',
            timestamp: new Date().toISOString()
        });
    });
}
