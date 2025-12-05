import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

// Setup multer untuk handle file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP are allowed'));
    }
  }
});

// Format responseTime menjadi "123ms"
function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`;
}

// ⭐ helper untuk standardized JSON response
function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime;
  
  // Pakai request ID dari Vercel (x-vercel-id)
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

async function checkNSFW(buffer) {
  const form = new FormData();
  form.append('file', buffer, `${Date.now()}.jpg`);
  
  const { data } = await axios.post(
    'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke',
    form,
    { headers: form.getHeaders() }
  );
  
  return data;
}

// Format result dari API Nyckel
function formatResult(originalResult) {
  // Jika result sudah dalam format yang diinginkan, return langsung
  if (originalResult.label && originalResult.confidence !== undefined) {
    return {
      label: originalResult.label,
      confidence: parseFloat(originalResult.confidence.toFixed(4))
    };
  }
  
  // Jika format dari Nyckel (labelName, confidence)
  if (originalResult.labelName && originalResult.confidence !== undefined) {
    return {
      label: originalResult.labelName,
      confidence: parseFloat(originalResult.confidence.toFixed(4))
    };
  }
  
  // Jika array dari Nyckel, ambil yang pertama
  if (Array.isArray(originalResult) && originalResult.length > 0) {
    const firstItem = originalResult[0];
    return {
      label: firstItem.labelName || firstItem.label || 'Unknown',
      confidence: firstItem.confidence ? parseFloat(firstItem.confidence.toFixed(4)) : 0
    };
  }
  
  // Fallback
  return originalResult;
}

export default function (app) {
  // Middleware untuk catat waktu start
  app.use('/v1/ai/nsfwchecker', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use('/v2/ai/nsfwchecker', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use('/ai/nsfwchecker/info', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  // V1: GET method (check dari URL)
  app.get('/v1/ai/nsfwchecker', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Image URL is required'
        }, 'v1');
      }

      const imgRes = await axios({
        url,
        responseType: 'arraybuffer',
        timeout: 10000
      });

      const buffer = Buffer.from(imgRes.data);
      const originalResult = await checkNSFW(buffer);
      const formattedResult = formatResult(originalResult);

      return sendResponse(req, res, 200, {
        result: formattedResult
      }, 'v1');

    } catch (error) {
      console.error('V1 Error:', error.message);
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to check image'
      }, 'v1');
    }
  });

  // V2: POST method (upload file)
  app.post(
    '/v2/ai/nsfwchecker',
    createApiKeyMiddleware(),
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return sendResponse(req, res, 400, { 
            error: 'No file uploaded. Use multipart/form-data with field "file"'
          }, 'v2');
        }

        const buffer = req.file.buffer;
        const originalResult = await checkNSFW(buffer);
        const formattedResult = formatResult(originalResult);

        return sendResponse(req, res, 200, {
          result: formattedResult,
          fileInfo: {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: `${Math.round(req.file.size / 1024)}KB`
          }
        }, 'v2');

      } catch (error) {
        console.error('V2 Error:', error.message);
        return sendResponse(req, res, 400, {
          error: error.message || 'Failed to check uploaded image'
        }, 'v2');
      }
    }
  );

  // Bonus: Endpoint Info
  app.get('/ai/nsfwchecker/info', (req, res) => {
    return sendResponse(req, res, 200, {
      endpoints: {
        v1_get: 'GET /v1/ai/nsfwchecker?url=IMAGE_URL',
        v2_post: 'POST /v2/ai/nsfwchecker (multipart/form-data)',
        note: 'V1 = URL scan, V2 = file upload'
      },
      description: 'NSFW Content Checker API',
      limits: {
        maxFileSize: '5MB',
        allowedFormats: ['JPEG', 'PNG', 'GIF', 'WebP'],
        rateLimit: 'Depends on your API key'
      }
    });
  });

  // Health check
  app.get('/ai/nsfwchecker/health', (req, res) => {
    req.startTime = Date.now();
    
    return sendResponse(req, res, 200, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      vercelId: req.headers['x-vercel-id'] || 'Not available'
    });
  });
}
/*import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

// Setup multer untuk handle file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP are allowed'));
    }
  }
});

async function checkNSFW(buffer) {
  const form = new FormData();
  form.append('file', buffer, `${Date.now()}.jpg`);
  
  const { data } = await axios.post(
    'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke',
    form,
    { headers: form.getHeaders() }
  );
  
  return data;
}

export default function (app) {
  
  // V1: GET method (check dari URL) - untuk kompatibilitas
  app.get('/v1/ai/nsfwchecker', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return res.status(400).json({ 
          status: false, 
          creator: 'DitssGanteng', 
          error: 'Image URL is required' 
        });
      }

      const imgRes = await axios({
        url,
        responseType: 'arraybuffer',
        timeout: 10000
      });

      const buffer = Buffer.from(imgRes.data);
      const result = await checkNSFW(buffer);

      res.json({
        status: true,
        creator: 'DitssGanteng',
        result
      });

    } catch (error) {
      res.status(400).json({
        status: false,
        creator: 'DitssGanteng',
        error: error.message || 'Failed to check image'
      });
    }
  });

  // V2: POST method dengan file upload
  app.post('/v2/ai/nsfwchecker', 
    createApiKeyMiddleware(), 
    upload.single('file'), // Middleware untuk handle file upload
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ 
            status: false, 
            creator: 'DitssGanteng', 
            error: 'No file uploaded. Send as multipart/form-data with "file" field' 
          });
        }

        const buffer = req.file.buffer;
        const result = await checkNSFW(buffer);

        res.json({
          status: true,
          creator: 'DitssGanteng',
          result,
          fileInfo: {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          }
        });

      } catch (error) {
        console.error('Upload Error:', error.message);
        res.status(400).json({
          status: false,
          creator: 'DitssGanteng',
          error: error.message || 'Failed to check uploaded image'
        });
      }
    }
  );

  // Bonus: Endpoint info
  app.get('/ai/nsfwchecker/info', (req, res) => {
    res.json({
      status: true,
      creator: 'DitssGanteng',
      endpoints: {
        v1_get: 'GET /v1/ai/nsfwchecker?url=IMAGE_URL',
        v2_post: 'POST /v2/ai/nsfwchecker (multipart/form-data)',
        note: 'V1 untuk URL, V2 untuk upload file langsung'
      }
    });
  });

}*/
