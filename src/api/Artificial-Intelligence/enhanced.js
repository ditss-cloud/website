import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import multer from "multer";
import { createApiKeyMiddleware } from '../../middleware/apikey.js';
import { getRandomUA } from '../../../src/utils/userAgen.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`;
}

function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime;
  const requestId = req.headers['x-vercel-id'] || 
                   req.headers['x-request-id'] || 
                   `asuma-${Date.now()}`;

  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: version,
    creator: 'DitssGanteng',
    requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  };

  res.status(statusCode).json(response);
}

async function bypassCloudflare() {
  const { data } = await axios.post('https://api.nekolabs.web.id/tools/bypass/cf-turnstile', {
    url: 'https://photoenhancer.pro/upload?tool=enhance&mode=fast',
    siteKey: '0x4AAAAAAB8ClzQTJhVDd_pU' // Note: Ganti dengan sitekey yang sesuai jika berbeda
  });
  
  return data?.result;
}

async function uploadToCDN(imageUrl) {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    return imageUrl;
  }
}

async function enhanceImage(buffer, enableQualityCheck = true, outputFormat = 'jpg') {
  try {
    const form = new FormData();
    form.append("image", buffer, {
      filename: `${Date.now()}_enhanced.${outputFormat}`,
      contentType: `image/${outputFormat === 'png' ? 'png' : 'jpeg'}`
    });
    form.append("enable_quality_check", enableQualityCheck.toString());
    form.append("output_format", outputFormat);

    // Coba bypass Cloudflare jika diperlukan
    let cfToken;
    try {
      cfToken = await bypassCloudflare();
    } catch (error) {
      console.log('Cloudflare bypass failed, proceeding without token');
    }

    const headers = {
      ...form.getHeaders(),
      "origin": "https://photoenhancer.pro",
      "referer": "https://photoenhancer.pro/upload?tool=enhance&mode=fast",
      "user-agent": getRandomUA()
    };

    // Tambahkan token Cloudflare jika berhasil didapat
    if (cfToken) {
      headers['cf-turnstile-token'] = cfToken;
    }

    const res = await axios.post(
      "https://photoenhancer.pro/api/fast-enhancer",
      form,
      {
        headers: headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000
      }
    );

    if (!res.data || !res.data.success) {
      throw new Error("Failed to enhance image");
    }

    return `https://photoenhancer.pro${res.data.url}`;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      throw new Error('Cloudflare protection triggered. Please try again later.');
    }
    throw new Error(`Enhancement failed: ${error.message}`);
  }
}

export default function (app) {
  // Middleware untuk mengatur startTime
  app.use('/v1/ai/photo-enhancer', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use('/v2/ai/photo-enhancer', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  // V1: URL-based enhancement
  app.get('/v1/ai/photo-enhancer', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, quality_check = 'true', output_format = 'jpg' } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Image URL is required'
        }, 'v1');
      }

      // Download image from URL
      const imgRes = await axios({
        url,
        responseType: 'arraybuffer',
        timeout: 15000,
        maxBodyLength: 10 * 1024 * 1024
      });

      const buffer = Buffer.from(imgRes.data);
      
      // Validate image size
      if (buffer.length > 10 * 1024 * 1024) {
        return sendResponse(req, res, 400, {
          error: 'Image size exceeds 10MB limit'
        }, 'v1');
      }

      // Process enhancement
      const enhancedUrl = await enhanceImage(
        buffer, 
        quality_check === 'true',
        output_format
      );
      
      // Upload to CDN
      const finalUrl = await uploadToCDN(enhancedUrl);

      return sendResponse(req, res, 200, {
        result: {
          enhancedUrl: finalUrl,
          originalUrl: url,
          qualityCheck: quality_check === 'true',
          outputFormat: output_format,
          metadata: {
            originalSize: `${Math.round(buffer.length / 1024)}KB`
          }
        }
      }, 'v1');

    } catch (error) {
      console.error('Photo Enhancer Error:', error.message);
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to enhance image'
      }, 'v1');
    }
  });

  // V2: File upload-based enhancement
  app.post('/v2/ai/photo-enhancer', 
    createApiKeyMiddleware(),
    upload.single('file'),
    async (req, res) => {
      try {
        const { 
          quality_check = 'true', 
          output_format = 'jpg' 
        } = req.body;
        
        if (!req.file) {
          return sendResponse(req, res, 400, { 
            error: 'File is required'
          }, 'v2');
        }

        // Process enhancement
        const enhancedUrl = await enhanceImage(
          req.file.buffer,
          quality_check === 'true',
          output_format
        );
        
        // Upload to CDN
        const finalUrl = await uploadToCDN(enhancedUrl);

        return sendResponse(req, res, 200, {
          result: {
            enhancedUrl: finalUrl,
            qualityCheck: quality_check === 'true',
            outputFormat: output_format,
            fileInfo: {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: `${Math.round(req.file.size / 1024)}KB`
            }
          }
        }, 'v2');

      } catch (error) {
        console.error('Photo Enhancer Error:', error.message);
        return sendResponse(req, res, 400, {
          error: error.message || 'Failed to enhance image'
        }, 'v2');
      }
    }
  );

  // Info endpoint
  app.get('/ai/photo-enhancer/info', (req, res) => {
    req.startTime = Date.now();
    
    return sendResponse(req, res, 200, {
      endpoints: {
        v1_get: 'GET /v1/ai/photo-enhancer?url=IMAGE_URL&quality_check=true&output_format=jpg',
        v2_post: 'POST /v2/ai/photo-enhancer (multipart/form-data)',
        parameters: {
          quality_check: 'boolean (default: true) - Enable quality checking',
          output_format: 'string (jpg/png, default: jpg) - Output format'
        }
      },
      description: 'Photo Enhancer API - Enhance and improve image quality',
      limits: {
        maxFileSize: '10MB',
        allowedFormats: ['JPEG', 'PNG'],
        timeout: '60 seconds'
      },
      features: [
        'Automatic quality enhancement',
        'Noise reduction',
        'Sharpness improvement',
        'Color correction',
        'Upscaling capabilities'
      ],
      examples: {
        v1: 'https://api.ditss.biz.id/v1/ai/photo-enhancer?url=https://example.com/image.jpg&quality_check=true',
        v2: 'curl -X POST -F "file=@image.jpg" -F "quality_check=true" https://api.ditss.biz.id/v2/ai/photo-enhancer'
      }
    });
  });
          }
