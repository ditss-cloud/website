import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";
import multer from 'multer';

// Setup multer untuk file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF)'), false);
    }
  }
});

const uploadSingleImage = upload.single('image');

class PixelArt {
    async img2pixel(imageSource, ratio = '1:1', sourceType = 'buffer') {
        try {
            if (!imageSource) throw new Error('Image source is required');
            if (!['1:1', '3:2', '2:3'].includes(ratio)) throw new Error('Available ratios: 1:1, 3:2, 2:3');
            
            let imageBuffer;
            
            // Handle different source types
            if (sourceType === 'buffer') {
                // Direct buffer
                if (!Buffer.isBuffer(imageSource)) throw new Error('Image buffer is required');
                imageBuffer = imageSource;
            } else if (sourceType === 'url') {
                // URL - download image first
                const response = await axios.get(imageSource, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                    }
                });
                imageBuffer = Buffer.from(response.data);
            } else if (sourceType === 'base64') {
                // Base64 string
                const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                throw new Error('Invalid source type');
            }
            
            // Step 1: Get upload URL
            const { data: a } = await axios.post('https://pixelartgenerator.app/api/upload/presigned-url', {
                filename: `${Date.now()}_pixelart.jpg`,
                contentType: 'image/jpeg',
                type: 'pixel-art-source'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                },
                timeout: 10000
            });
            
            // Step 2: Upload image
            await axios.put(a.data.uploadUrl, imageBuffer, {
                headers: {
                    'content-type': 'image/jpeg',
                    'content-length': imageBuffer.length
                },
                timeout: 15000
            });
            
            // Step 3: Start pixel art generation
            const { data: b } = await axios.post('https://pixelartgenerator.app/api/pixel/generate', {
                imageKey: a.data.key,
                prompt: '',
                size: ratio,
                type: 'image'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                },
                timeout: 10000
            });
            
            // Step 4: Poll for result
            const startTime = Date.now();
            const maxWaitTime = 60000;
            
            while (Date.now() - startTime < maxWaitTime) {
                const { data } = await axios.get(`https://pixelartgenerator.app/api/pixel/status?taskId=${b.data.taskId}`, {
                    headers: {
                        'content-type': 'application/json',
                        referer: 'https://pixelartgenerator.app/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                    },
                    timeout: 5000
                });
                
                if (data.data.status === 'SUCCESS') return data.data.images[0];
                if (data.data.status === 'FAILED') throw new Error('Pixel art generation failed');
                
                await new Promise(res => setTimeout(res, 2000));
            }
            
            throw new Error('Pixel art generation timeout');
            
        } catch (error) {
            throw new Error(`Image to pixel failed: ${error.message}`);
        }
    }
    
    async txt2pixel(prompt, ratio = '1:1') {
        try {
            if (!prompt) throw new Error('Prompt is required');
            if (!['1:1', '3:2', '2:3'].includes(ratio)) throw new Error('Available ratios: 1:1, 3:2, 2:3');
            
            const { data: a } = await axios.post('https://pixelartgenerator.app/api/pixel/generate', {
                prompt: prompt,
                size: ratio,
                type: 'text'
            }, {
                headers: {
                    'content-type': 'application/json',
                    referer: 'https://pixelartgenerator.app/',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                },
                timeout: 10000
            });
            
            const startTime = Date.now();
            const maxWaitTime = 60000;
            
            while (Date.now() - startTime < maxWaitTime) {
                const { data } = await axios.get(`https://pixelartgenerator.app/api/pixel/status?taskId=${a.data.taskId}`, {
                    headers: {
                        'content-type': 'application/json',
                        referer: 'https://pixelartgenerator.app/',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                    },
                    timeout: 5000
                });
                
                if (data.data.status === 'SUCCESS') return data.data.images[0];
                if (data.data.status === 'FAILED') throw new Error('Pixel art generation failed');
                
                await new Promise(res => setTimeout(res, 2000));
            }
            
            throw new Error('Pixel art generation timeout');
            
        } catch (error) {
            throw new Error(`Text to pixel failed: ${error.message}`);
        }
    }
}

export default function (app) {
    const pixelArt = new PixelArt();

    // ============ IMAGE TO PIXEL ART (FLEXIBLE) ============
    app.post('/v1/ai/pixelart/img2pixel', 
        createApiKeyMiddleware(),
        uploadSingleImage,
        async (req, res) => {
            try {
                let imageBuffer;
                let sourceType = 'buffer';
                let sourceInfo = {};
                
                // Priority: 1. File upload, 2. URL, 3. Base64
                if (req.file) {
                    // File upload
                    imageBuffer = req.file.buffer;
                    sourceInfo = {
                        type: 'file_upload',
                        fileName: req.file.originalname,
                        mimeType: req.file.mimetype,
                        size: req.file.size
                    };
                } else if (req.body.url) {
                    // URL
                    const url = req.body.url;
                    const response = await axios.get(url, {
                        responseType: 'arraybuffer',
                        timeout: 15000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
                        }
                    });
                    imageBuffer = Buffer.from(response.data);
                    sourceType = 'url';
                    sourceInfo = {
                        type: 'url',
                        url: url,
                        size: response.data.length
                    };
                } else if (req.body.base64) {
                    // Base64
                    const base64Data = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
                    imageBuffer = Buffer.from(base64Data, 'base64');
                    sourceType = 'base64';
                    sourceInfo = {
                        type: 'base64',
                        size: base64Data.length
                    };
                } else {
                    return res.status(400).json({
                        status: false,
                        creator: "DitssCloud",
                        error: 'Provide image file, URL, or base64 string'
                    });
                }
                
                const ratio = req.body.ratio || '1:1';
                const result = await pixelArt.img2pixel(imageBuffer, ratio, sourceType);
                
                res.status(200).json({
                    status: true,
                    creator: "DitssCloud",
                    message: 'Image converted to pixel art successfully',
                    result: {
                        pixelArtUrl: result,
                        source: sourceInfo,
                        ratio: ratio
                    },
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error('[PixelArt img2pixel Error]:', error.message);
                res.status(500).json({
                    status: false,
                    creator: "DitssCloud",
                    error: error.message
                });
            }
        }
    );

    // ============ TEXT TO PIXEL ART ============
    app.get('/v1/ai/pixelart/txt2pixel', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { prompt, ratio = '1:1' } = req.query;
            
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Prompt is required'
                });
            }
            
            const result = await pixelArt.txt2pixel(prompt, ratio);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Pixel art generated from text successfully',
                result: {
                    pixelArtUrl: result,
                    prompt: prompt,
                    ratio: ratio
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[PixelArt txt2pixel Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });

    app.post('/v1/ai/pixelart/txt2pixel', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { prompt, ratio = '1:1' } = req.body;
            
            if (!prompt) {
                return res.status(400).json({
                    status: false,
                    creator: "DitssCloud",
                    error: 'Prompt is required'
                });
            }
            
            const result = await pixelArt.txt2pixel(prompt, ratio);
            
            res.status(200).json({
                status: true,
                creator: "DitssCloud",
                message: 'Pixel art generated from text successfully',
                result: {
                    pixelArtUrl: result,
                    prompt: prompt,
                    ratio: ratio
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('[PixelArt txt2pixel Error]:', error.message);
            res.status(500).json({
                status: false,
                creator: "DitssCloud",
                error: error.message
            });
        }
    });

    // ============ API INFO ============
    app.get('/v1/ai/pixelart/info', createApiKeyMiddleware(), (req, res) => {
        res.status(200).json({
            status: true,
            creator: "DitssCloud",
            message: 'Pixel Art Generator API',
            endpoints: {
                img2pixel: {
                    path: '/v1/ai/pixelart/img2pixel',
                    method: 'POST',
                    input_methods: [
                        {
                            type: 'file_upload',
                            field_name: 'image',
                            content_type: 'multipart/form-data'
                        },
                        {
                            type: 'url',
                            field_name: 'url',
                            content_type: 'application/json',
                            example: '{"url": "https://example.com/image.jpg", "ratio": "1:1"}'
                        },
                        {
                            type: 'base64',
                            field_name: 'base64',
                            content_type: 'application/json',
                            example: '{"base64": "data:image/jpeg;base64,...", "ratio": "1:1"}'
                        }
                    ],
                    parameters: {
                        ratio: '1:1 (default), 3:2, or 2:3'
                    }
                },
                txt2pixel: {
                    path: '/v1/ai/pixelart/txt2pixel',
                    methods: ['GET', 'POST'],
                    parameters: {
                        prompt: 'Text description (required)',
                        ratio: '1:1 (default), 3:2, or 2:3'
                    }
                }
            },
            supported_ratios: ['1:1', '3:2', '2:3'],
            max_file_size: '5MB',
            timestamp: new Date().toISOString()
        });
    });
}
