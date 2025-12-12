import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

class UsernameGen {
    constructor() {
        this.headers = {
            referer: 'https://usernamegenerator.com/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        };
    }
    
    validate(input, fieldName) {
        if (!input) throw new Error(`${fieldName} is required`);
        if (!/^[a-zA-Z0-9]+$/.test(input)) throw new Error(`${fieldName} must contain only letters and numbers (no spaces or special characters)`);
        
        return input;
    }
    
    async create(keyword, { mode = 'instans', theme = 'action' } = {}) {
        try {
            keyword = this.validate(keyword, 'Keyword');
            
            const conf = {
                modes: ['instans', 'ai'],
                themes: ['action', 'adventure', 'fantasy', 'historical', 'horror', 'mythology', 'nature', 'sci-fi', 'strategy']
            };
            
            if (!conf.modes.includes(mode)) throw new Error(`Available modes: ${conf.modes.join(', ')}`);
            
            if (mode === 'instans') {
                const { data } = await axios.get(`https://usernamegenerator.com/wk/gamertags/${keyword}`, {
                    headers: this.headers,
                    timeout: 10000
                });
                
                return data;
            } else {
                if (!conf.themes.includes(theme)) throw new Error(`Available themes: ${conf.themes.join(', ')}`);
                const { data } = await axios.post('https://usernamegenerator.com/ai/generate/player-names', {
                    genre: theme,
                    keywords: keyword
                }, {
                    headers: this.headers,
                    timeout: 15000
                });
                
                return data;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    async mix(name1, name2) {
        try {
            name1 = this.validate(name1, 'Name1');
            name2 = this.validate(name2, 'Name2');
            
            const { data } = await axios.get(`https://usernamegenerator.com/wk/mix-words/${name1}-${name2}`, {
                headers: this.headers,
                timeout: 10000
            });
            
            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

export default function (app) {
    const usernameGen = new UsernameGen();

    // ============ CREATE USERNAMES ============
    app.get('/v1/tools/usernamegen/create', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { keyword, mode = 'instans', theme = 'action' } = req.query;
            
            if (!keyword) {
                return res.json({ 
                    status: false, 
                    creator: "DitssCloud",
                    error: 'Keyword is required' 
                });
            }
            
            const result = await usernameGen.create(keyword, { mode, theme });
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Usernames generated successfully',
                config: {
                    keyword: keyword,
                    mode: mode,
                    theme: theme
                },
                result: result,
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

    app.post('/v1/tools/usernamegen/create', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { keyword, mode = 'instans', theme = 'action' } = req.body;
            
            if (!keyword) {
                return res.json({ 
                    status: false,
                    creator: "DitssCloud", 
                    error: 'Keyword is required' 
                });
            }
            
            const result = await usernameGen.create(keyword, { mode, theme });
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Usernames generated successfully',
                config: {
                    keyword: keyword,
                    mode: mode,
                    theme: theme
                },
                result: result,
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

    // ============ MIX USERNAMES ============
    app.get('/v1/tools/usernamegen/mix', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { name1, name2 } = req.query;
            
            if (!name1 || !name2) {
                return res.json({ 
                    status: false, 
                    creator: "DitssCloud",
                    error: 'Both name1 and name2 are required' 
                });
            }
            
            const result = await usernameGen.mix(name1, name2);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Usernames mixed successfully',
                config: {
                    name1: name1,
                    name2: name2
                },
                result: result,
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

    app.post('/v1/tools/usernamegen/mix', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { name1, name2 } = req.body;
            
            if (!name1 || !name2) {
                return res.json({ 
                    status: false,
                    creator: "DitssCloud", 
                    error: 'Both name1 and name2 are required' 
                });
            }
            
            const result = await usernameGen.mix(name1, name2);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Usernames mixed successfully',
                config: {
                    name1: name1,
                    name2: name2
                },
                result: result,
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

    // ============ API INFO ============
    app.get('/v1/tools/usernamegen/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Username Generator API',
            endpoints: {
                create: {
                    path: '/v1/tools/usernamegen/create',
                    methods: ['GET', 'POST'],
                    parameters: {
                        keyword: 'Base keyword (letters/numbers only)',
                        mode: 'instans (default) or ai',
                        theme: 'action, adventure, fantasy, historical, horror, mythology, nature, sci-fi, strategy'
                    }
                },
                mix: {
                    path: '/v1/tools/usernamegen/mix',
                    methods: ['GET', 'POST'],
                    parameters: {
                        name1: 'First name (letters/numbers only)',
                        name2: 'Second name (letters/numbers only)'
                    }
                }
            },
            examples: {
                create_instans: '/v1/tools/usernamegen/create?keyword=rynn&mode=instans',
                create_ai: '/v1/tools/usernamegen/create?keyword=rynn&mode=ai&theme=fantasy',
                mix: '/v1/tools/usernamegen/mix?name1=rynn&name2=shadow'
            },
            timestamp: new Date().toISOString()
        });
    });
              }
