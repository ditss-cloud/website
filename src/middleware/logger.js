/*// logger.js - VERSI YANG DIPERBAIKI
import { ApiLog } from '../database/models/ApiLog.js';
import { UsageStats } from '../database/models/UsageStats.js';
import { connectDB } from '../database/db.js'; // IMPORT INI!

export function createLogger() {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // OVERRIDE res.end BUKAN res.send (lebih reliable)
    const originalEnd = res.end;
    const chunks = [];
    
    // Capture response body
    const originalWrite = res.write;
    res.write = function(chunk, ...args) {
      chunks.push(Buffer.from(chunk));
      return originalWrite.call(this, chunk, ...args);
    };
    
    res.end = async function(chunk, ...args) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      
      // Eksekusi logging SEBELUM response benar-benar dikirim
      try {
        await logRequest(req, res, startTime, Buffer.concat(chunks).toString('utf8'));
      } catch (error) {
        console.error('⚠️ Logging failed, but continuing response:', error.message);
      }
      
      // Kirim response asli
      return originalEnd.call(this, chunk, ...args);
    };
    
    next();
  };
}

// FUNGSI TERPISAH UNTUK LOGGING
async function logRequest(req, res, startTime, responseBody) {
  try {
    // 1. PASTIKAN KONEKSI DATABASE AKTIF
    await connectDB();
    
    const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const success = statusCode >= 200 && statusCode < 300;
    
    console.log(`📝 Attempting to log: ${req.method} ${req.path} (${statusCode})`);
    
    // 2. HINDARI DATA BESAR DI BODY/QUERY
    const cleanBody = req.body && typeof req.body === 'object' 
      ? JSON.parse(JSON.stringify(req.body)) // Deep copy
      : req.body;
    
    const cleanQuery = req.query && typeof req.query === 'object'
      ? JSON.parse(JSON.stringify(req.query))
      : req.query;
    
    // 3. LOG API REQUEST
    const apiLog = new ApiLog({
      requestId,
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      query: cleanQuery,
      body: cleanBody,
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
      error: !success && responseBody ? 
        (typeof responseBody === 'string' ? responseBody.substring(0, 500) : 
         responseBody.error || JSON.stringify(responseBody).substring(0, 500)) : 
        null,
      errorStack: null // Tidak bisa dapatkan di sini
    });
    
    // 4. SAVE DENGAN TIMEOUT
    await Promise.race([
      apiLog.save(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout after 2s')), 2000)
      )
    ]);
    
    console.log(`✅ Log saved: ${apiLog._id}`);
    
    // 5. UPDATE USAGE STATS
    const date = new Date().toISOString().split('T')[0];
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
    
    console.log(`📊 Stats updated for ${date}`);
    
  } catch (error) {
    console.error('❌ CRITICAL Logging Error:', {
      message: error.message,
      stack: error.stack,
      endpoint: req?.path,
      method: req?.method
    });
    throw error; // Re-throw untuk debugging
  }
}*/
// src/middleware/logger.js
import { ApiLog } from '../database/models/ApiLog.js';
import { UsageStats } from '../database/models/UsageStats.js';
import { connectDB } from '../database/db.js';

export function createLogger() {
  return (req, res, next) => {
    // ==================== FILTER: HANYA CATAT API REQUEST ====================
    const apiPatterns = [
      /^\/api\//,           // /api/*
      /^\/ai\//,            // /ai/*
      /^\/random\//,        // /random/*
      /^\/maker\//,         // /maker/*
      /^\/v[1-5]\//,        // /v1/, /v2/, /v3/, /v4/, /v5/
      /^\/admin\//          // /admin/*
    ];
    
    const isApiRequest = apiPatterns.some(pattern => pattern.test(req.path));
    
    // JIKA BUKAN API REQUEST, LEWATI LOGGING
    if (!isApiRequest) {
      return next();
    }
    // ========================================================================
    
    const startTime = Date.now();
    
    const originalEnd = res.end;
    const chunks = [];
    
    const originalWrite = res.write;
    res.write = function(chunk, ...args) {
      chunks.push(Buffer.from(chunk));
      return originalWrite.call(this, chunk, ...args);
    };
    
    res.end = async function(chunk, ...args) {
      if (chunk) {
        chunks.push(Buffer.from(chunk));
      }
      
      try {
        await logRequest(req, res, startTime, Buffer.concat(chunks).toString('utf8'));
      } catch (error) {
        console.error('⚠️ Logging failed:', error.message);
      }
      
      return originalEnd.call(this, chunk, ...args);
    };
    
    next();
  };
}

async function logRequest(req, res, startTime, responseBody) {
  try {
    // Pastikan koneksi database
    await connectDB();
    
    const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const success = statusCode >= 200 && statusCode < 300;
    
    console.log(`📝 Logging API: ${req.method} ${req.path} (${statusCode})`);
    
    // Log API request
    const apiLog = new ApiLog({
      requestId,
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      query: req.query,
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'x-api-key': req.headers['x-api-key'] ? '***' : undefined,
        'authorization': req.headers['authorization'] ? '***' : undefined
      },
      statusCode,
      responseTime,
      version: extractVersion(req.path) || 'v1', // Ambil versi dari path
      apiKey: req.apiKeyId || null,
      creator: 'DitssGanteng',
      success,
      error: !success && responseBody ? 
        (typeof responseBody === 'string' ? responseBody.substring(0, 500) : 
         (responseBody.error || JSON.stringify(responseBody)).substring(0, 500)) : 
        null,
      errorStack: null
    });
    
    await apiLog.save();
    
    // Update usage stats
    const date = new Date().toISOString().split('T')[0];
    const version = extractVersion(req.path) || 'v1';
    
    await UsageStats.findOneAndUpdate(
      {
        date,
        endpoint: req.path,
        method: req.method,
        version: version
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
    
    console.log(`✅ API Log saved: ${apiLog._id}`);
    
  } catch (error) {
    console.error('❌ Logging Error:', error.message);
  }
}

// Helper: Extract version from path (e.g., /v1/maker → v1)
function extractVersion(path) {
  const versionMatch = path.match(/^\/(v[1-5])\//);
  return versionMatch ? versionMatch[1] : null;
}

/*
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
*/
