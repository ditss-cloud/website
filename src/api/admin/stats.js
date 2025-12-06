/*import { ApiLog } from '../../database/models/ApiLog.js';
import { UsageStats } from '../../database/models/UsageStats.js';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

const NodeCache = require('node-cache');
let cache;
if (!global.statsCache) {
  global.statsCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
}
cache = global.statsCache;
*/
import { ApiLog } from '../../database/models/ApiLog.js';
import { UsageStats } from '../../database/models/UsageStats.js';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

import NodeCache from 'node-cache';

let cache;
if (!global.statsCache) {
  global.statsCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120
  });
}

cache = global.statsCache;
function sendResponse(req, res, statusCode, data) {
  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: 'v1',
    creator: 'DitssGanteng',
    ...data
  };
  res.status(statusCode).json(response);
}

export default (app) => {
  app.get('/admin/stats/overall', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { days = 30, nocache = false } = req.query;
      const daysNum = parseInt(days);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return sendResponse(req, res, 400, { error: "days must be between 1 and 365" });
      }
      const cacheKey = `overall:${daysNum}`;
      if (!nocache) {
        const cached = cache.get(cacheKey);
        if (cached) return sendResponse(req, res, 200, cached);
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      const stats = await UsageStats.find({ date: { $gte: startDate.toISOString().split('T')[0] } });
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const totalResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0);
      const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
      const dailyStats = {};
      stats.forEach(stat => {
        if (!dailyStats[stat.date]) {
          dailyStats[stat.date] = { date: stat.date, totalRequests: 0, successRequests: 0, failedRequests: 0, totalResponseTime: 0 };
        }
        dailyStats[stat.date].totalRequests += stat.totalRequests;
        dailyStats[stat.date].successRequests += stat.successRequests;
        dailyStats[stat.date].failedRequests += stat.failedRequests;
        dailyStats[stat.date].totalResponseTime += stat.totalResponseTime;
      });
      const endpointStats = {};
      stats.forEach(stat => {
        const key = `${stat.endpoint} (${stat.method})`;
        if (!endpointStats[key]) {
          endpointStats[key] = { endpoint: stat.endpoint, method: stat.method, version: stat.version, totalRequests: 0, successRequests: 0, failedRequests: 0, totalResponseTime: 0 };
        }
        endpointStats[key].totalRequests += stat.totalRequests;
        endpointStats[key].successRequests += stat.successRequests;
        endpointStats[key].failedRequests += stat.failedRequests;
        endpointStats[key].totalResponseTime += stat.totalResponseTime;
      });
      const dailyArray = Object.values(dailyStats).map(day => ({
        ...day,
        successRate: day.totalRequests > 0 ? ((day.successRequests / day.totalRequests) * 100).toFixed(2) + '%' : '0%',
        avgResponseTime: day.totalRequests > 0 ? Math.round(day.totalResponseTime / day.totalRequests) + 'ms' : '0ms'
      })).sort((a, b) => a.date.localeCompare(b.date));
      const endpointArray = Object.values(endpointStats).map(endpoint => ({
        ...endpoint,
        successRate: endpoint.totalRequests > 0 ? ((endpoint.successRequests / endpoint.totalRequests) * 100).toFixed(2) + '%' : '0%',
        avgResponseTime: endpoint.totalRequests > 0 ? Math.round(endpoint.totalResponseTime / endpoint.totalRequests) + 'ms' : '0ms',
        requestsPerDay: Math.round(endpoint.totalRequests / daysNum)
      })).sort((a, b) => b.totalRequests - a.totalRequests);
      const versionStats = {};
      stats.forEach(stat => { if (!versionStats[stat.version]) versionStats[stat.version] = 0; versionStats[stat.version] += stat.totalRequests; });
      const methodStats = {};
      stats.forEach(stat => { if (!methodStats[stat.method]) methodStats[stat.method] = 0; methodStats[stat.method] += stat.totalRequests; });
      const lastDayLogs = await ApiLog.find({ createdAt: { $gte: startDate } }).select('createdAt');
      const hourlyStats = Array(24).fill(0);
      lastDayLogs.forEach(log => { const hour = new Date(log.createdAt).getHours(); hourlyStats[hour]++; });
      const peakHour = hourlyStats.reduce((maxIndex, count, index) => count > hourlyStats[maxIndex] ? index : maxIndex, 0);
      const responseData = {
        result: {
          period: { days: daysNum, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
          summary: {
            totalRequests, successRequests, failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: avgResponseTime + 'ms',
            requestsPerDay: Math.round(totalRequests / daysNum),
            requestsPerHour: Math.round(totalRequests / (daysNum * 24))
          },
          topEndpoints: endpointArray.slice(0, 10),
          dailyActivity: dailyArray,
          distribution: { versions: versionStats, methods: methodStats },
          peakTimes: {
            peakHour: `${String(peakHour).padStart(2, '0')}:00`,
            requestsAtPeak: hourlyStats[peakHour],
            hourlyDistribution: hourlyStats.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, requests: count }))
          },
          performance: {
            fastestEndpoint: endpointArray.reduce((fastest, current) => parseInt(current.avgResponseTime) < parseInt(fastest.avgResponseTime) ? current : fastest),
            slowestEndpoint: endpointArray.reduce((slowest, current) => parseInt(current.avgResponseTime) > parseInt(slowest.avgResponseTime) ? current : slowest),
            mostReliableEndpoint: endpointArray.reduce((reliable, current) => parseFloat(current.successRate) > parseFloat(reliable.successRate) ? current : reliable),
            leastReliableEndpoint: endpointArray.reduce((unreliable, current) => parseFloat(current.successRate) < parseFloat(unreliable.successRate) ? current : unreliable)
          },
          insights: {
            totalEndpoints: endpointArray.length,
            busiestDay: dailyArray.reduce((busiest, current) => current.totalRequests > busiest.totalRequests ? current : dailyArray[0]),
            trendingEndpoint: endpointArray.slice(0, 3).map(e => e.endpoint),
            errorRate: totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) + '%' : '0%'
          },
          cacheInfo: { cached: false, timestamp: new Date().toISOString() }
        }
      };
      cache.set(cacheKey, responseData);
      responseData.result.cacheInfo.cached = true;
      sendResponse(req, res, 200, responseData);
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/today', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { nocache = false } = req.query;
      const cacheKey = 'today';
      if (!nocache) {
        const cached = cache.get(cacheKey);
        if (cached) return sendResponse(req, res, 200, cached);
      }
      const date = new Date().toISOString().split('T')[0];
      const stats = await UsageStats.find({ date });
      const total = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const success = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failed = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const avgResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0) / total || 0;
      const hourlyStats = Array(24).fill(0);
      const todayLogs = await ApiLog.find({ createdAt: { $gte: new Date(date) } }).select('createdAt');
      todayLogs.forEach(log => { const hour = new Date(log.createdAt).getHours(); hourlyStats[hour]++; });
      const peakHour = hourlyStats.reduce((maxIndex, count, index) => count > hourlyStats[maxIndex] ? index : maxIndex, 0);
      const endpointDetails = stats.map(stat => ({
        endpoint: stat.endpoint, method: stat.method, version: stat.version,
        requests: stat.totalRequests, success: stat.successRequests, failed: stat.failedRequests,
        successRate: stat.totalRequests > 0 ? ((stat.successRequests / stat.totalRequests) * 100).toFixed(2) + '%' : '0%',
        avgResponseTime: stat.totalRequests > 0 ? Math.round(stat.totalResponseTime / stat.totalRequests) + 'ms' : '0ms'
      })).sort((a, b) => b.requests - a.requests);
      const responseData = {
        result: {
          date,
          summary: {
            totalRequests: total, successRequests: success, failedRequests: failed,
            successRate: total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: Math.round(avgResponseTime) + 'ms'
          },
          hourlyActivity: hourlyStats.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, requests: count })),
          topEndpoints: endpointDetails.slice(0, 10),
          peakHour: `${String(peakHour).padStart(2, '0')}:00`,
          requestsAtPeak: hourlyStats[peakHour],
          endpointDistribution: endpointDetails,
          statusCodes: {
            '200': success,
            '400': failed - (await ApiLog.countDocuments({ date: { $gte: new Date(date) }, statusCode: 500 }) || 0),
            '500': await ApiLog.countDocuments({ date: { $gte: new Date(date) }, statusCode: 500 }) || 0
          },
          cacheInfo: { cached: false, timestamp: new Date().toISOString() }
        }
      };
      cache.set(cacheKey, responseData, 30);
      responseData.result.cacheInfo.cached = true;
      sendResponse(req, res, 200, responseData);
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/range', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { startDate, endDate = new Date().toISOString().split('T')[0], nocache = false } = req.query;
      if (!startDate) return sendResponse(req, res, 400, { error: "startDate parameter is required" });
      const cacheKey = `range:${startDate}:${endDate}`;
      if (!nocache) {
        const cached = cache.get(cacheKey);
        if (cached) return sendResponse(req, res, 200, cached);
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return sendResponse(req, res, 400, { error: "Invalid date format. Use YYYY-MM-DD" });
      const stats = await UsageStats.find({ date: { $gte: startDate, $lte: endDate } });
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const dailyBreakdown = {};
      stats.forEach(stat => {
        if (!dailyBreakdown[stat.date]) {
          dailyBreakdown[stat.date] = { totalRequests: 0, successRequests: 0, failedRequests: 0 };
        }
        dailyBreakdown[stat.date].totalRequests += stat.totalRequests;
        dailyBreakdown[stat.date].successRequests += stat.successRequests;
        dailyBreakdown[stat.date].failedRequests += stat.failedRequests;
      });
      const responseData = {
        result: {
          period: { startDate, endDate },
          summary: {
            totalRequests, successRequests, failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%'
          },
          dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
            date,
            totalRequests: data.totalRequests,
            successRate: data.totalRequests > 0 ? ((data.successRequests / data.totalRequests) * 100).toFixed(2) + '%' : '0%'
          })).sort((a, b) => a.date.localeCompare(b.date)),
          mostActiveDay: Object.entries(dailyBreakdown).reduce((max, [date, data]) => 
            data.totalRequests > max.totalRequests ? { date, totalRequests: data.totalRequests } : max
          , { date: startDate, totalRequests: 0 }),
          cacheInfo: { cached: false, timestamp: new Date().toISOString() }
        }
      };
      cache.set(cacheKey, responseData);
      responseData.result.cacheInfo.cached = true;
      sendResponse(req, res, 200, responseData);
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/endpoint/:endpoint', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { endpoint } = req.params;
      const { days = 30, nocache = false } = req.query;
      const daysNum = parseInt(days);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
        return sendResponse(req, res, 400, { error: "days must be between 1 and 365" });
      }
      const cacheKey = `endpoint:${endpoint}:${daysNum}`;
      if (!nocache) {
        const cached = cache.get(cacheKey);
        if (cached) return sendResponse(req, res, 200, cached);
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      const stats = await UsageStats.find({ endpoint: endpoint, date: { $gte: startDate.toISOString().split('T')[0] } });
      if (stats.length === 0) return sendResponse(req, res, 404, { error: "No data found for this endpoint" });
      const logs = await ApiLog.find({ endpoint: endpoint, createdAt: { $gte: startDate } }).sort({ createdAt: -1 }).limit(100);
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const totalResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0);
      const methodBreakdown = {};
      stats.forEach(stat => {
        if (!methodBreakdown[stat.method]) {
          methodBreakdown[stat.method] = { totalRequests: 0, successRequests: 0, failedRequests: 0 };
        }
        methodBreakdown[stat.method].totalRequests += stat.totalRequests;
        methodBreakdown[stat.method].successRequests += stat.successRequests;
        methodBreakdown[stat.method].failedRequests += stat.failedRequests;
      });
      const versionBreakdown = {};
      stats.forEach(stat => {
        if (!versionBreakdown[stat.version]) {
          versionBreakdown[stat.version] = { totalRequests: 0, successRequests: 0, failedRequests: 0 };
        }
        versionBreakdown[stat.version].totalRequests += stat.totalRequests;
        versionBreakdown[stat.version].successRequests += stat.successRequests;
        versionBreakdown[stat.version].failedRequests += stat.failedRequests;
      });
      const responseData = {
        result: {
          endpoint,
          period: { days: daysNum, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
          summary: {
            totalRequests, successRequests, failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) + 'ms' : '0ms',
            requestsPerDay: Math.round(totalRequests / daysNum)
          },
          methodBreakdown: Object.entries(methodBreakdown).map(([method, data]) => ({
            method,
            totalRequests: data.totalRequests,
            successRate: data.totalRequests > 0 ? ((data.successRequests / data.totalRequests) * 100).toFixed(2) + '%' : '0%'
          })),
          versionBreakdown: Object.entries(versionBreakdown).map(([version, data]) => ({
            version,
            totalRequests: data.totalRequests,
            successRate: data.totalRequests > 0 ? ((data.successRequests / data.totalRequests) * 100).toFixed(2) + '%' : '0%'
          })),
          recentLogs: logs.map(log => ({
            timestamp: log.createdAt, method: log.method, statusCode: log.statusCode,
            responseTime: log.responseTime + 'ms', success: log.success,
            apiKey: log.apiKey ? '***' + log.apiKey.slice(-4) : null
          })),
          cacheInfo: { cached: false, timestamp: new Date().toISOString() }
        }
      };
      cache.set(cacheKey, responseData);
      responseData.result.cacheInfo.cached = true;
      sendResponse(req, res, 200, responseData);
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/live', createApiKeyMiddleware(), async (req, res) => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now - 60 * 60 * 1000);
      const recentRequests = await ApiLog.find({ createdAt: { $gte: oneHourAgo } }).sort({ createdAt: -1 }).limit(50);
      const statsLastHour = await UsageStats.aggregate([
        { $match: { updatedAt: { $gte: oneHourAgo } } },
        { $group: { _id: null, totalRequests: { $sum: "$totalRequests" }, successRequests: { $sum: "$successRequests" }, failedRequests: { $sum: "$failedRequests" }, totalResponseTime: { $sum: "$totalResponseTime" } } }
      ]);
      const activeEndpoints = await UsageStats.find({ updatedAt: { $gte: new Date(now - 5 * 60 * 1000) } }).sort({ updatedAt: -1 }).limit(20);
      const latestRequest = await ApiLog.findOne().sort({ createdAt: -1 }).select('endpoint method statusCode responseTime createdAt');
      sendResponse(req, res, 200, {
        live: {
          timestamp: now.toISOString(),
          lastUpdated: latestRequest?.createdAt || now.toISOString(),
          summaryLastHour: statsLastHour[0] ? {
            totalRequests: statsLastHour[0].totalRequests,
            successRequests: statsLastHour[0].successRequests,
            failedRequests: statsLastHour[0].failedRequests,
            errorRate: statsLastHour[0].totalRequests > 0 ? ((statsLastHour[0].failedRequests / statsLastHour[0].totalRequests) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: statsLastHour[0].totalRequests > 0 ? Math.round(statsLastHour[0].totalResponseTime / statsLastHour[0].totalRequests) + 'ms' : '0ms'
          } : null,
          recentActivity: recentRequests.map(req => ({
            time: req.createdAt, endpoint: req.endpoint, method: req.method, status: req.statusCode,
            responseTime: req.responseTime + 'ms', success: req.success,
            ip: req.ip ? req.ip.substring(0, 15) + '...' : null
          })),
          activeEndpoints: activeEndpoints.map(endpoint => ({
            endpoint: endpoint.endpoint, method: endpoint.method, lastActive: endpoint.updatedAt,
            requestsToday: endpoint.totalRequests,
            successRate: endpoint.totalRequests > 0 ? ((endpoint.successRequests / endpoint.totalRequests) * 100).toFixed(2) + '%' : '0%'
          })),
          systemStatus: {
            totalEndpointsTracked: await UsageStats.distinct('endpoint').countDocuments(),
            requestsToday: await ApiLog.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } }),
            errorsToday: await ApiLog.countDocuments({ createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }, success: false }),
            avgResponseTimeToday: await ApiLog.aggregate([
              { $match: { createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } } },
              { $group: { _id: null, avgResponseTime: { $avg: "$responseTime" } } }
            ]).then(result => result[0]?.avgResponseTime ? Math.round(result[0].avgResponseTime) + 'ms' : '0ms')
          }
        }
      });
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/dashboard', createApiKeyMiddleware(), async (req, res) => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const [todayStats, yesterdayStats, topEndpoints, recentErrors] = await Promise.all([
        ApiLog.aggregate([
          { $match: { createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) } } },
          { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } }, avgResponseTime: { $avg: "$responseTime" } } }
        ]),
        ApiLog.aggregate([
          { $match: { createdAt: { $gte: new Date(yesterday.setHours(0, 0, 0, 0)), $lt: new Date(today.setHours(0, 0, 0, 0)) } } },
          { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } } } }
        ]),
        ApiLog.aggregate([
          { $match: { createdAt: { $gte: new Date(today.setHours(0, 0, 0, 0)) } } },
          { $group: { _id: "$endpoint", count: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } }, avgResponseTime: { $avg: "$responseTime" } } },
          { $sort: { count: -1 } }, { $limit: 10 }
        ]),
        ApiLog.find({ success: false }).sort({ createdAt: -1 }).limit(10).select('endpoint method statusCode error createdAt')
      ]);
      const todayData = todayStats[0] || { total: 0, success: 0, failed: 0, avgResponseTime: 0 };
      const yesterdayData = yesterdayStats[0] || { total: 0, success: 0, failed: 0 };
      const totalChange = yesterdayData.total > 0 ? ((todayData.total - yesterdayData.total) / yesterdayData.total * 100).toFixed(1) : 0;
      const successRateChange = yesterdayData.success > 0 ? (((todayData.success / todayData.total) - (yesterdayData.success / yesterdayData.total)) * 100).toFixed(1) : 0;
      const hourlyStats = await getHourlyStats();
      sendResponse(req, res, 200, {
        dashboard: {
          date: new Date().toISOString().split('T')[0],
          overview: {
            totalRequests: todayData.total,
            successRequests: todayData.success,
            failedRequests: todayData.failed,
            successRate: todayData.total > 0 ? ((todayData.success / todayData.total) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: Math.round(todayData.avgResponseTime) + 'ms'
          },
          comparison: {
            totalChange: parseFloat(totalChange) >= 0 ? `+${totalChange}%` : `${totalChange}%`,
            successRateChange: parseFloat(successRateChange) >= 0 ? `+${successRateChange}%` : `${successRateChange}%`,
            yesterdayTotal: yesterdayData.total
          },
          topEndpoints: topEndpoints.map(ep => ({
            endpoint: ep._id, requests: ep.count,
            successRate: ep.count > 0 ? ((ep.success / ep.count) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: Math.round(ep.avgResponseTime) + 'ms'
          })),
          recentErrors: recentErrors.map(err => ({
            time: err.createdAt, endpoint: err.endpoint, method: err.method,
            status: err.statusCode, error: err.error?.substring(0, 100) || 'Unknown error'
          })),
          hourlyStats: hourlyStats
        }
      });
    } catch (error) {
      sendResponse(req, res, 500, { error: error.message });
    }
  });

  app.get('/admin/stats/stream', createApiKeyMiddleware(), async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sendUpdate = async () => {
      try {
        const latestRequest = await ApiLog.findOne().sort({ createdAt: -1 }).select('endpoint method statusCode responseTime createdAt');
        const last5Min = new Date(Date.now() - 5 * 60 * 1000);
        const requestsLast5Min = await ApiLog.countDocuments({ createdAt: { $gte: last5Min } });
        const errorsLast5Min = await ApiLog.countDocuments({ createdAt: { $gte: last5Min }, success: false });
        res.write(`data: ${JSON.stringify({
          timestamp: new Date().toISOString(),
          latestRequest: latestRequest ? {
            endpoint: latestRequest.endpoint, method: latestRequest.method,
            status: latestRequest.statusCode, time: latestRequest.createdAt,
            responseTime: latestRequest.responseTime + 'ms'
          } : null,
          activityLast5Min: {
            total: requestsLast5Min, errors: errorsLast5Min,
            errorRate: requestsLast5Min > 0 ? ((errorsLast5Min / requestsLast5Min) * 100).toFixed(2) + '%' : '0%'
          },
          system: { uptime: process.uptime(), memory: process.memoryUsage() }
        })}\n\n`);
      } catch (error) {}
    };
    const interval = setInterval(sendUpdate, 5000);
    sendUpdate();
    req.on('close', () => { clearInterval(interval); res.end(); });
  });

  app.get('/admin/stats/cache/clear', createApiKeyMiddleware(), (req, res) => {
    const stats = cache.getStats();
    cache.flushAll();
    sendResponse(req, res, 200, { message: "Cache cleared successfully", previousStats: stats });
  });

  app.get('/admin/stats/cache/info', createApiKeyMiddleware(), (req, res) => {
    const stats = cache.getStats();
    const keys = cache.keys();
    sendResponse(req, res, 200, {
      cacheInfo: { stats, keys, totalKeys: keys.length, timestamp: new Date().toISOString() }
    });
  });
};

async function getHourlyStats() {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const stats = await ApiLog.aggregate([
    { $match: { createdAt: { $gte: startOfDay } } },
    { $group: { _id: { $hour: "$createdAt" }, requests: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } }, avgResponseTime: { $avg: "$responseTime" } } },
    { $sort: { _id: 1 } }
  ]);
  const hourlyArray = Array(24).fill(0).map((_, hour) => {
    const hourStat = stats.find(s => s._id === hour);
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      requests: hourStat?.requests || 0,
      successRate: hourStat?.requests > 0 ? ((hourStat.success / hourStat.requests) * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: hourStat?.avgResponseTime ? Math.round(hourStat.avgResponseTime) + 'ms' : '0ms'
    };
  });
  return hourlyArray;
          }
