import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';
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
    url: 'https://image-editor.org/editor',
    siteKey: '0x4AAAAAAB8ClzQTJhVDd_pU'
  });
  
  return data?.result;
}

async function uploadImage(buffer, inst) {
  const { data: up } = await inst.post('/upload/presigned', {
    filename: `${Date.now()}_rynn.jpg`,
    contentType: 'image/jpeg'
  });
  
  if (!up?.data?.uploadUrl) {
    throw new Error('Upload URL not found');
  }
  
  await axios.put(up.data.uploadUrl, buffer, {
    headers: { 'Content-Type': 'image/jpeg' }
  });
  
  return up.data;
}

async function nanobanana(prompt, buffer) {
  if (!prompt) throw new Error('Prompt is required');
  if (!Buffer.isBuffer(buffer)) throw new Error('Image must be a buffer');
  
  const inst = axios.create({
    baseURL: 'https://image-editor.org/api',
    headers: {
      origin: 'https://image-editor.org',
      referer: 'https://image-editor.org/editor',
      'user-agent': getRandomUA()
    },
    timeout: 30000
  });
  
  const uploadData = await uploadImage(buffer, inst);
  const cfToken = await bypassCloudflare();
  
  const { data: task } = await inst.post('/edit', {
    prompt: prompt,
    image_urls: [uploadData.fileUrl],
    image_size: 'auto',
    turnstileToken: cfToken,
    uploadIds: [uploadData.uploadId],
    userUUID: crypto.randomUUID(),
    imageHash: crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 64)
  });
  
  if (!task?.data?.taskId) {
    throw new Error('Task ID not received');
  }
  
  const startTime = Date.now();
  const timeout = 60000;
  
  while (Date.now() - startTime < timeout) {
    try {
      const { data } = await inst.get(`/task/${task.data.taskId}`);
      
      if (data?.data?.status === 'completed' && data.data.result) {
        return data.data.result;
      }
      
      if (data?.data?.status === 'failed') {
        throw new Error('Image processing failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Processing timeout after 60 seconds');
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

export default function (app) {
  app.use('/v1/ai/nanobanana', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use('/v2/ai/nanobanana', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.get('/v1/ai/nanobanana', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Image URL is required'
        }, 'v1');
      }
      
      if (!prompt) {
        return sendResponse(req, res, 400, { 
          error: 'Prompt is required'
        }, 'v1');
      }

      const imgRes = await axios({
        url,
        responseType: 'arraybuffer',
        timeout: 10000,
        maxBodyLength: 10 * 1024 * 1024
      });

      const buffer = Buffer.from(imgRes.data);
      const resultUrl = await nanobanana(prompt, buffer);
      const finalUrl = await uploadToCDN(resultUrl);

      return sendResponse(req, res, 200, {
        result: {
          imageUrl: finalUrl,
          prompt: prompt,
          sourceUrl: url
        }
      }, 'v1');

    } catch (error) {
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to process image'
      }, 'v1');
    }
  });

  app.post('/v2/ai/nanobanana', 
    createApiKeyMiddleware(),
    upload.single('file'),
    async (req, res) => {
      try {
        const { prompt } = req.body;
        
        if (!prompt) {
          return sendResponse(req, res, 400, { 
            error: 'Prompt is required'
          }, 'v2');
        }
        
        if (!req.file) {
          return sendResponse(req, res, 400, { 
            error: 'File is required'
          }, 'v2');
        }

        const buffer = req.file.buffer;
        const resultUrl = await nanobanana(prompt, buffer);
        const finalUrl = await uploadToCDN(resultUrl);

        return sendResponse(req, res, 200, {
          result: {
            imageUrl: finalUrl,
            prompt: prompt,
            fileInfo: {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: `${Math.round(req.file.size / 1024)}KB`
            }
          }
        }, 'v2');

      } catch (error) {
        return sendResponse(req, res, 400, {
          error: error.message || 'Failed to process image'
        }, 'v2');
      }
    }
  );

  app.get('/ai/nanobanana/info', (req, res) => {
    req.startTime = Date.now();
    
    return sendResponse(req, res, 200, {
      endpoints: {
        v1_get: 'GET /v1/ai/nanobanana?url=IMAGE_URL&prompt=PROMPT_TEXT',
        v2_post: 'POST /v2/ai/nanobanana (multipart/form-data)',
        note: 'V1 = URL + prompt, V2 = file upload + prompt'
      },
      description: 'NanoBanana AI Image Editor API',
      limits: {
        maxFileSize: '10MB',
        allowedFormats: ['JPEG', 'PNG'],
        timeout: '60 seconds'
      },
      examplePrompts: [
        'change skin color to black',
        'make hair blonde',
        'change background to beach',
        'add sunglasses',
        'make eyes blue',
        'add smile',
        'change clothes color'
      ]
    });
  });
  }
