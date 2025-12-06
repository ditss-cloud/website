//import { ApiLog, UsageStats } from '../database/models/ApiLog.js';
import { ApiLog } from '../database/models/ApiLog.js';
import { UsageStats } from '../database/models/UsageStats.js';
export function createLogger() {
  return async (req, res, next) => {
    req.startTime = Date.now();
    
    const originalSend = res.send;
    
    res.send = function(body) {
      res.send = originalSend;
      
      // Log setelah response dikirim
      setTimeout(async () => {
        try {
          const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}`;
          const responseTime = Date.now() - req.startTime;
          const statusCode = res.statusCode;
          const success = statusCode >= 200 && statusCode < 300;
          
          // Log API request
          const apiLog = new ApiLog({
            requestId,
            endpoint: req.path,
            method: req.method,
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            query: req.query,
            body: req.body,
            headers: {
              'content-type': req.headers['content-type'],
              'x-api-key': req.headers['x-api-key'] ? '***' : undefined,
              'authorization': req.headers['authorization'] ? '***' : undefined
            },
            statusCode,
            responseTime,
            version: req.version || 'v1',
            apiKey: req.apiKeyId || null,
            creator: 'DitssGanteng',
            success,
            error: !success && typeof body === 'string' ? body : (body?.error || null),
            errorStack: !success && body?.stack ? body.stack : null
          });
          
          await apiLog.save();
          
          // Update usage stats
          const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          await UsageStats.findOneAndUpdate(
            {
              date,
              endpoint: req.path,
              method: req.method,
              version: req.version || 'v1'
            },
            {
              $inc: {
                totalRequests: 1,
                successRequests: success ? 1 : 0,
                failedRequests: success ? 0 : 1,
                totalResponseTime: responseTime
              },
              $set: { updatedAt: new Date() }
            },
            { upsert: true, new: true }
          );
          
        } catch (error) {
          console.error('Logging Error:', error.message);
        }
      }, 0);
      
      return originalSend.call(this, body);
    };
    
    next();
  };
}
