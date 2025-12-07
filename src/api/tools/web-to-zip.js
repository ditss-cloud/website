import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

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
    creator: "DitssGanteng",
    requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  };

  res.status(statusCode).json(response);
}

async function saveweb2zip(url, options = {}) {
  try {
    if (!url) throw new Error('Url is required');
    
    // Ensure URL has protocol
    url = url.startsWith('http') ? url : `https://${url}`;
    
    const {
      renameAssets = false,
      saveStructure = false,
      alternativeAlgorithm = false,
      mobileVersion = false
    } = options;
    
    // Initiate scraping
    const { data } = await axios.post('https://copier.saveweb2zip.com/api/copySite', {
      url,
      renameAssets,
      saveStructure,
      alternativeAlgorithm,
      mobileVersion
    }, {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
        origin: 'https://saveweb2zip.com',
        referer: 'https://saveweb2zip.com/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      },
      timeout: 30000
    });
    
    const jobId = data.md5;
    
    // Polling for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 detik timeout
    
    while (attempts < maxAttempts) {
      const { data: process } = await axios.get(`https://copier.saveweb2zip.com/api/getStatus/${jobId}`, {
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          origin: 'https://saveweb2zip.com',
          referer: 'https://saveweb2zip.com/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        },
        timeout: 10000
      });
      
      if (process.isFinished) {
        return {
          url,
          jobId,
          error: process.errorText ? {
            text: process.errorText,
            code: process.errorCode,
          } : null,
          copiedFilesAmount: process.copiedFilesAmount,
          downloadUrl: `https://copier.saveweb2zip.com/api/downloadArchive/${process.md5}`,
          directDownloadUrl: `https://copier.saveweb2zip.com/api/downloadArchive/${process.md5}`,
          timestamp: new Date().toISOString()
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error('Scraping timeout after 60 seconds');
    
  } catch (error) {
    throw new Error(`SaveWeb2Zip Error: ${error.message}`);
  }
}

export default (app) => {
  // Setup response time tracking
  app.use("/v1/tools/web2zip", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/web2zip", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  async function handleWeb2Zip(req, res, version = 'v1') {
    try {
      const { url, renameAssets, saveStructure, alternativeAlgorithm, mobileVersion } = req.method === 'GET' ? req.query : req.body;
      
      if (!url) {
        return sendResponse(req, res, 400, {
          error: "URL is required",
          usage: {
            example: "?url=https://example.com&renameAssets=true",
            parameters: {
              url: "Website URL (required)",
              renameAssets: "boolean (optional)",
              saveStructure: "boolean (optional)",
              alternativeAlgorithm: "boolean (optional)",
              mobileVersion: "boolean (optional)"
            }
          }
        }, version);
      }
      
      const options = {
        renameAssets: renameAssets === 'true',
        saveStructure: saveStructure === 'true',
        alternativeAlgorithm: alternativeAlgorithm === 'true',
        mobileVersion: mobileVersion === 'true'
      };
      
      const result = await saveweb2zip(url, options);
      
      return sendResponse(req, res, 200, {
        result
      }, version);

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message
      }, version);
    }
  }

  // API Endpoints dengan API Key Middleware
  app.get("/v1/tools/web2zip", createApiKeyMiddleware(), (req, res) => handleWeb2Zip(req, res, 'v1'));
  app.post("/v1/tools/web2zip", createApiKeyMiddleware(), (req, res) => handleWeb2Zip(req, res, 'v1'));
  
  app.get("/v2/tools/web2zip", createApiKeyMiddleware(), (req, res) => handleWeb2Zip(req, res, 'v2'));
  app.post("/v2/tools/web2zip", createApiKeyMiddleware(), (req, res) => handleWeb2Zip(req, res, 'v2'));

  // Additional endpoint untuk status checking
  app.get("/v1/tools/web2zip/status", createApiKeyMiddleware(), async (req, res) => {
    try {
      req.startTime = Date.now();
      
      const { jobId } = req.query;
      
      if (!jobId) {
        return sendResponse(req, res, 400, {
          error: "jobId is required"
        }, 'v1');
      }
      
      const { data: process } = await axios.get(`https://copier.saveweb2zip.com/api/getStatus/${jobId}`, {
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          origin: 'https://saveweb2zip.com',
          referer: 'https://saveweb2zip.com/',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
        },
        timeout: 10000
      });
      
      return sendResponse(req, res, 200, {
        result: {
          isFinished: process.isFinished,
          copiedFilesAmount: process.copiedFilesAmount,
          error: process.errorText ? {
            text: process.errorText,
            code: process.errorCode
          } : null,
          downloadUrl: process.isFinished ? 
            `https://copier.saveweb2zip.com/api/downloadArchive/${process.md5}` : null
        }
      }, 'v1');

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message
      }, 'v1');
    }
  });
};
