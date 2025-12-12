import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

class StickerLy {
    async search(query) {
        try {
            if (!query) throw new Error('Query is required');
            
            const { data } = await axios.post('https://api.sticker.ly/v4/stickerPack/smartSearch', {
                keyword: query,
                enabledKeywordSearch: true,
                filter: {
                    extendSearchResult: false,
                    sortBy: 'RECOMMENDED',
                    languages: [
                        'ALL'
                    ],
                    minStickerCount: 5,
                    searchBy: 'ALL',
                    stickerType: 'ALL'
                }
            }, {
                headers: {
                    'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                    'content-type': 'application/json',
                    'accept-encoding': 'gzip'
                },
                timeout: 10000
            });
            
            if (!data.result?.stickerPacks) {
                throw new Error('No sticker packs found');
            }
            
            return data.result.stickerPacks.map(pack => ({
                name: pack.name,
                author: pack.authorName,
                stickerCount: pack.resourceFiles?.length || 0,
                viewCount: pack.viewCount || 0,
                exportCount: pack.exportCount || 0,
                isPaid: pack.isPaid || false,
                isAnimated: pack.isAnimated || false,
                thumbnailUrl: pack.resourceUrlPrefix && pack.resourceFiles && pack.trayIndex >= 0 ? 
                    `${pack.resourceUrlPrefix}${pack.resourceFiles[pack.trayIndex]}` : '',
                url: pack.shareUrl || ''
            }));
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }
    
    async detail(url) {
        try {
            const match = url.match(/\/s\/([^\/\?#]+)/);
            if (!match) throw new Error('Invalid sticker pack URL format');
            
            const { data } = await axios.get(`https://api.sticker.ly/v4/stickerPack/${match[1]}?needRelation=true`, {
                headers: {
                    'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                    'content-type': 'application/json',
                    'accept-encoding': 'gzip'
                },
                timeout: 10000
            });
            
            if (!data.result) {
                throw new Error('Sticker pack not found');
            }
            
            const result = data.result;
            const stickers = result.stickers || [];
            
            return {
                name: result.name,
                author: {
                    name: result.user?.displayName || 'Unknown',
                    username: result.user?.userName || '',
                    bio: result.user?.bio || '',
                    followers: result.user?.followerCount || 0,
                    following: result.user?.followingCount || 0,
                    isPrivate: result.user?.isPrivate || false,
                    avatar: result.user?.profileUrl || '',
                    website: result.user?.website || '',
                    url: result.user?.shareUrl || ''
                },
                stickers: stickers.map(stick => ({
                    fileName: stick.fileName,
                    isAnimated: stick.isAnimated || false,
                    imageUrl: result.resourceUrlPrefix ? 
                        `${result.resourceUrlPrefix}${stick.fileName}` : ''
                })),
                stickerCount: stickers.length,
                viewCount: result.viewCount || 0,
                exportCount: result.exportCount || 0,
                isPaid: result.isPaid || false,
                isAnimated: result.isAnimated || false,
                thumbnailUrl: result.resourceUrlPrefix && stickers.length > 0 && result.trayIndex >= 0 ? 
                    `${result.resourceUrlPrefix}${stickers[result.trayIndex].fileName}` : '',
                url: result.shareUrl || '',
                resourceUrlPrefix: result.resourceUrlPrefix || ''
            };
        } catch (error) {
            throw new Error(`Detail fetch failed: ${error.message}`);
        }
    }
}

export default function (app) {
    const stickerly = new StickerLy();

    // ============ SEARCH STICKER PACKS ============
    app.get('/v1/stickerly/search', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { q, limit } = req.query;
            
            if (!q) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Search query is required',
                    error: 'Missing "q" parameter in query string'
                });
            }
            
            const results = await stickerly.search(q);
            const finalLimit = limit ? Math.min(parseInt(limit), 50) : results.length;
            const limitedResults = results.slice(0, finalLimit);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Sticker packs search completed successfully',
                query: q,
                count: limitedResults.length,
                total_found: results.length,
                result: limitedResults,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[StickerLy Search Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to search sticker packs',
                error: error.message
            });
        }
    });

    app.post('/v1/stickerly/search', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { q, limit } = req.body;
            
            if (!q) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Search query is required',
                    error: 'Missing "q" field in request body'
                });
            }
            
            const results = await stickerly.search(q);
            const finalLimit = limit ? Math.min(parseInt(limit), 50) : results.length;
            const limitedResults = results.slice(0, finalLimit);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Sticker packs search completed successfully',
                query: q,
                count: limitedResults.length,
                total_found: results.length,
                result: limitedResults,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[StickerLy Search Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to search sticker packs',
                error: error.message
            });
        }
    });

    // ============ GET STICKER PACK DETAIL ============
    app.get('/v1/stickerly/detail', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.query;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Sticker pack URL is required',
                    error: 'Missing "url" parameter in query string'
                });
            }
            
            const detail = await stickerly.detail(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Sticker pack details fetched successfully',
                result: detail,
                requested_url: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[StickerLy Detail Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch sticker pack details',
                error: error.message
            });
        }
    });

    app.post('/v1/stickerly/detail', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    message: 'Sticker pack URL is required',
                    error: 'Missing "url" field in request body'
                });
            }
            
            const detail = await stickerly.detail(url);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Sticker pack details fetched successfully',
                result: detail,
                requested_url: url,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[StickerLy Detail Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                message: 'Failed to fetch sticker pack details',
                error: error.message
            });
        }
    });

    // ============ API INFO ENDPOINT ============
    app.get('/v1/stickerly/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'StickerLy API information',
            endpoints: {
                search: {
                    path: '/v1/stickerly/search',
                    methods: ['GET', 'POST'],
                    parameters: {
                        q: 'Search query (required)',
                        limit: 'Limit results (optional, max 50)'
                    }
                },
                detail: {
                    path: '/v1/stickerly/detail',
                    methods: ['GET', 'POST'],
                    parameters: {
                        url: 'Sticker pack URL (required)'
                    }
                }
            },
            url_formats: {
                search: 'Example: "anime", "cute", "funny"',
                detail: 'Example: "https://sticker.ly/s/ABCD1234" or "https://sticker.ly/stickerpack/ABCD1234"'
            },
            supported_methods: ['GET', 'POST'],
            timestamp: new Date().toISOString()
        });
    });
                  }
