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

}
