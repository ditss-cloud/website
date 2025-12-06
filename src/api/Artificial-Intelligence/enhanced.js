import axios from "axios";
import FormData from "form-data";
import multer from 'multer';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

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

async function photoEnhancer(imageBuffer, qualityCheck = true, outputFormat = 'jpg') {
  const form = new FormData();
  form.append("image", imageBuffer, {
    filename: `${Date.now()}_enhanced.jpg`,
    contentType: 'image/jpeg'
  });
  form.append("enable_quality_check", qualityCheck.toString());
  form.append("output_format", outputFormat);

  const res = await axios.post(
    "https://photoenhancer.pro/api/fast-enhancer",
    form,
    {
      headers: {
        ...form.getHeaders(),
        "origin": "https://photoenhancer.pro",
        "referer": "https://photoenhancer.pro/upload?tool=enhance&mode=fast",
        "user-agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000
    }
  );

  if (!res.data || !res.data.success) {
    throw new Error("Failed to enhance image");
  }

  return `https://photoenhancer.pro${res.data.url}`;
}

async function uploadToCDN(imageUrl) {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}`;
    const { data } = await axios.get(apiUrl, { timeout: 30000 });
    return data.url;
  } catch (error) {
    return imageUrl;
  }
}

export default function (app) {
  // Simple endpoint tanpa bypass Cloudflare yang ribet
  app.get('/v1/ai/photo-enhancer', createApiKeyMiddleware(), async (req, res) => {
    req.startTime = Date.now();
    
    try {
      const { url } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Image URL is required. Example: ?url=https://example.com/image.jpg'
        }, 'v1');
      }

      // Download image
      const imgRes = await axios({
        url,
        responseType: 'arraybuffer',
        timeout: 15000
      });

      const buffer = Buffer.from(imgRes.data);
      
      // Enhance image
      const enhancedUrl = await photoEnhancer(buffer, true, 'jpg');
      
      // Upload to CDN
      const finalUrl = await uploadToCDN(enhancedUrl);

      return sendResponse(req, res, 200, {
        result: finalUrl
      }, 'v1');

    } catch (error) {
      console.error('Photo Enhancer Error:', error.message);
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to enhance image'
      }, 'v1');
    }
  });

  // Info endpoint
  app.get('/ai/photo-enhancer', (req, res) => {
    req.startTime = Date.now();
    
    return sendResponse(req, res, 200, {
      endpoint: 'GET /v1/ai/photo-enhancer?url=IMAGE_URL',
      example: 'https://api.asuma.my.id/v1/ai/photo-enhancer?url=https://cdn.ditss.biz.id/3Bcv.jpg',
      description: 'Enhance image quality automatically',
      limit: '10MB max file size',
      formats: 'JPEG, PNG',
      creator: 'DitssGanteng'
    });
  });
}
