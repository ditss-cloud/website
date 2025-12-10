import { createApiKeyMiddleware } from '../../middleware/apikey.js';

async function videy(url) {
  try {
    let id = url.split("id=")[1];
    let typ = '.mp4';
    if (id.length === 9 && id[8] === '2') {
      typ = '.mov';
    }
    return `https://cdn.videy.co/${id + typ}`;
  } catch (error) {
    throw new Error(`Error processing URL: ${error.message}`);
  }
}

export default function (app) {
  app.get('/v1/download/videy', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.json({ 
          status: false, 
          message: 'URL is required',
          error: 'Missing url parameter in query string' 
        });
      }
      
      const results = await videy(url);
      res.status(200).json({
        status: true,
        message: 'Video URL processed successfully',
        result: results
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        message: 'Failed to process video URL',
        error: error.message 
      });
    }
  });

  app.post('/v1/download/videy', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ 
          status: false, 
          message: 'URL is required',
          error: 'Missing url field in request body' 
        });
      }
      
      const results = await videy(url);
      res.status(200).json({
        status: true,
        message: 'Video URL processed successfully',
        result: results
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        message: 'Failed to process video URL',
        error: error.message 
      });
    }
  });
}
