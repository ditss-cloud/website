import axios from 'axios';
import FormData from 'form-data';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

class NSFWChecker {
  constructor() {
    this.apiEndpoint = 'https://www.nyckel.com/v1/functions/o2f0jzcdyut2qxhu/invoke';
  }

  async check(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Image must be a buffer');
      }

      const form = new FormData();
      form.append('file', buffer, `${Date.now()}.jpg`);
      
      const { data } = await axios.post(this.apiEndpoint, form, {
        headers: form.getHeaders(),
        timeout: 30000
      });
      
      return data;
    } catch (error) {
      console.error('NSFW Check Error:', error.message);
      throw new Error(`NSFW Check failed: ${error.message}`);
    }
  }

  async checkFromUrl(imageUrl) {
    try {
      const response = await axios({
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 5 * 1024 * 1024 // 5MB max
      });
      
      const buffer = Buffer.from(response.data);
      return await this.check(buffer);
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }
}

export default function (app) {
  const nsfwChecker = new NSFWChecker();

  // Endpoint untuk check dari URL
  app.get('/ai/nsfwchecker', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ 
          status: false, 
          creator: 'DitssGanteng', 
          error: 'Image URL is required' 
        });
      }

      const result = await nsfwChecker.checkFromUrl(url);
      
      res.json({
        status: true,
        creator: 'DitssGanteng',
        result: {
          isSafe: !result.some(item => 
            item.labelName.toLowerCase().includes('nsfw') || 
            item.labelName.toLowerCase().includes('explicit')
          ),
          scores: result,
          summary: result.reduce((acc, curr) => {
            acc[curr.labelName] = curr.confidence;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('API Error:', error.message);
      res.status(400).json({
        status: false,
        creator: 'DitssGanteng',
        error: error.message || 'Failed to check image'
      });
    }
  });

  // Endpoint untuk upload file langsung (multipart/form-data)
  app.post('/ai/nsfwchecker/upload', createApiKeyMiddleware(), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          status: false, 
          creator: 'DitssGanteng', 
          error: 'No file uploaded' 
        });
      }

      const buffer = req.file.buffer;
      const result = await nsfwChecker.check(buffer);
      
      res.json({
        status: true,
        creator: 'DitssGanteng',
        result: {
          isSafe: !result.some(item => 
            item.labelName.toLowerCase().includes('nsfw') || 
            item.labelName.toLowerCase().includes('explicit')
          ),
          scores: result,
          summary: result.reduce((acc, curr) => {
            acc[curr.labelName] = curr.confidence;
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Upload API Error:', error.message);
      res.status(400).json({
        status: false,
        creator: 'DitssGanteng',
        error: error.message || 'Failed to check uploaded image'
      });
    }
  });
          }
