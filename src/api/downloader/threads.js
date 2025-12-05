import axios from 'axios';
import cheerio from 'cheerio';
import FormData from 'form-data';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

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

async function downloadThreads(url) {
  try {
    const form = new FormData();
    form.append('search', url);
    
    const { data } = await axios.post('https://threadsdownload.net/ms?fresh-partial=true', form, {
      headers: {
        accept: '*/*',
        'content-type': 'multipart/form-data',
        origin: 'https://threadsdownload.net',
        referer: 'https://threadsdownload.net/ms',
        'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      }
    });
    
    const $ = cheerio.load(data);
    const jsonString = $(`script[type='application/json']`).text().trim();
    
    let braceCount = 0;
    let endIndex = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      if (jsonString[i] === '{') braceCount++;
      if (jsonString[i] === '}') braceCount--;
      if (braceCount === 0 && jsonString[i] === '}') {
        endIndex = i + 1;
        break;
      }
    }
    
    if (endIndex === -1) {
      throw new Error('Failed to parse JSON from response');
    }
    
    const validJsonString = jsonString.slice(0, endIndex);
    const jsonData = JSON.parse(validJsonString);
    
    if (!jsonData.v || !jsonData.v[0] || !jsonData.v[0][1]) {
      throw new Error('Invalid response structure from source');
    }
    
    const result = jsonData.v[0][1];
    
    // Extract media URLs
    const mediaUrls = [];
    
    // Check for images
    if (result.images) {
      result.images.forEach(img => {
        if (img.url) mediaUrls.push({ type: 'image', url: img.url });
      });
    }
    
    // Check for video
    if (result.video_versions && result.video_versions.length > 0) {
      // Get the highest quality video
      const video = result.video_versions.reduce((prev, current) => 
        (prev.height > current.height) ? prev : current
      );
      mediaUrls.push({ type: 'video', url: video.url, height: video.height, width: video.width });
    }
    
    // Check for carousel (multiple media)
    if (result.carousel_media) {
      result.carousel_media.forEach((media, index) => {
        if (media.image_versions2?.candidates?.[0]?.url) {
          mediaUrls.push({ 
            type: 'image', 
            url: media.image_versions2.candidates[0].url,
            index: index + 1
          });
        }
        if (media.video_versions?.[0]?.url) {
          mediaUrls.push({ 
            type: 'video', 
            url: media.video_versions[0].url,
            index: index + 1
          });
        }
      });
    }
    
    return {
      success: true,
      author: {
        username: result.user?.username || null,
        fullName: result.user?.full_name || null,
        profilePic: result.user?.profile_pic_url || null,
        isVerified: result.user?.is_verified || false,
        pk: result.user?.pk || null
      },
      caption: result.caption?.text || null,
      createdAt: result.taken_at ? new Date(result.taken_at * 1000).toISOString() : null,
      likeCount: result.like_count || 0,
      commentCount: result.comment_count || 0,
      media: mediaUrls,
      postInfo: {
        id: result.pk || result.id || null,
        code: result.code || null,
        isVideo: result.media_type === 2 || result.video_versions?.length > 0,
        isCarousel: result.carousel_media_count > 1,
        mediaCount: result.carousel_media_count || 1,
        thumbnail: result.image_versions2?.candidates?.[0]?.url || null
      }
    };
    
  } catch (error) {
    console.error('Threads Download Error:', error.message);
    throw new Error(`Failed to download threads: ${error.message}`);
  }
}

export default function (app) {
  app.use('/v1/downloader/threads', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use('/v2/downloader/threads', (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  // V1: GET method (basic)
  app.get('/v1/downloader/threads', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Threads URL is required'
        }, 'v1');
      }

      const result = await downloadThreads(url);

      return sendResponse(req, res, 200, {
        result: result.media
      }, 'v1');

    } catch (error) {
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to download threads'
      }, 'v1');
    }
  });

  // V2: GET method (with full info)
  app.get('/v2/downloader/threads', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Threads URL is required'
        }, 'v2');
      }

      const result = await downloadThreads(url);

      return sendResponse(req, res, 200, {
        result: result
      }, 'v2');

    } catch (error) {
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to download threads'
      }, 'v2');
    }
  });

  // V3: POST method (for batch or custom options)
  app.post('/v3/downloader/threads', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, quality = 'highest', includeInfo = true } = req.body;
      
      if (!url) {
        return sendResponse(req, res, 400, { 
          error: 'Threads URL is required in request body'
        }, 'v3');
      }

      const result = await downloadThreads(url);
      
      // Filter by quality preference
      let filteredMedia = result.media;
      
      if (quality === 'highest') {
        // Already have highest quality from parsing
      } else if (quality === 'lowest') {
        filteredMedia = result.media.map(media => {
          if (media.type === 'video') {
            // In real implementation, you'd need to parse all qualities
            // For now, we return as is
            return media;
          }
          return media;
        });
      }
      
      const responseData = includeInfo ? result : { media: filteredMedia };

      return sendResponse(req, res, 200, {
        result: responseData,
        requestOptions: {
          quality,
          includeInfo
        }
      }, 'v3');

    } catch (error) {
      return sendResponse(req, res, 400, {
        error: error.message || 'Failed to download threads'
      }, 'v3');
    }
  });

  // Info endpoint
  app.get('/downloader/threads/info', (req, res) => {
    req.startTime = Date.now();
    
    return sendResponse(req, res, 200, {
      endpoints: {
        v1: 'GET /v1/downloader/threads?url=THREADS_URL',
        v2: 'GET /v2/downloader/threads?url=THREADS_URL',
        v3: 'POST /v3/downloader/threads (JSON body)',
        note: 'V1 = media only, V2 = full info, V3 = customizable'
      },
      description: 'Threads Downloader API',
      limits: {
        rateLimit: 'Depends on your API key',
        supportedFormats: ['Images', 'Videos', 'Carousels']
      },
      example: {
        v1: 'https://api.asuma.my.id/v1/downloader/threads?url=https://www.threads.net/t/CuXFPIeLLod',
        v2: 'https://api.asuma.my.id/v2/downloader/threads?url=https://www.threads.net/t/CuXFPIeLLod'
      }
    });
  });

  // Test endpoint
  app.get('/downloader/threads/test', createApiKeyMiddleware(), async (req, res) => {
    req.startTime = Date.now();
    
    try {
      // Test with a known working URL
      const testUrl = 'https://www.threads.net/t/CuXFPIeLLod';
      const result = await downloadThreads(testUrl);
      
      return sendResponse(req, res, 200, {
        test: 'success',
        url: testUrl,
        mediaCount: result.media.length,
        hasVideo: result.media.some(m => m.type === 'video'),
        hasImage: result.media.some(m => m.type === 'image')
      });
    } catch (error) {
      return sendResponse(req, res, 400, {
        test: 'failed',
        error: error.message
      });
    }
  });
    }
