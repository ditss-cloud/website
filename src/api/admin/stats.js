//import { ApiLog, UsageStats } from '../../database/models/ApiLog.js';
import { ApiLog } from '../../database/models/ApiLog.js';
import { UsageStats } from '../../database/models/UsageStats.js';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

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
      const { days = 30 } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      const stats = await UsageStats.find({
        date: { $gte: startDate.toISOString().split('T')[0] }
      });
      
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const totalResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0);
      const avgResponseTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
      
      const dailyStats = {};
      stats.forEach(stat => {
        if (!dailyStats[stat.date]) {
          dailyStats[stat.date] = {
            date: stat.date,
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0
          };
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
          endpointStats[key] = {
            endpoint: stat.endpoint,
            method: stat.method,
            version: stat.version,
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0
          };
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
        requestsPerDay: Math.round(endpoint.totalRequests / days)
      })).sort((a, b) => b.totalRequests - a.totalRequests);
      
      const versionStats = {};
      stats.forEach(stat => {
        if (!versionStats[stat.version]) versionStats[stat.version] = 0;
        versionStats[stat.version] += stat.totalRequests;
      });
      
      const methodStats = {};
      stats.forEach(stat => {
        if (!methodStats[stat.method]) methodStats[stat.method] = 0;
        methodStats[stat.method] += stat.totalRequests;
      });
      
      const lastDayLogs = await ApiLog.find({
        createdAt: { $gte: startDate }
      }).select('createdAt');
      
      const hourlyStats = Array(24).fill(0);
      lastDayLogs.forEach(log => {
        const hour = new Date(log.createdAt).getHours();
        hourlyStats[hour]++;
      });
      
      const peakHour = hourlyStats.reduce((maxIndex, count, index) => 
        count > hourlyStats[maxIndex] ? index : maxIndex, 0
      );
      
      sendResponse(req, res, 200, {
        result: {
          period: {
            days: parseInt(days),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalRequests,
            successRequests,
            failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: avgResponseTime + 'ms',
            requestsPerDay: Math.round(totalRequests / days),
            requestsPerHour: Math.round(totalRequests / (days * 24))
          },
          topEndpoints: endpointArray.slice(0, 10),
          dailyActivity: dailyArray,
          distribution: {
            versions: versionStats,
            methods: methodStats
          },
          peakTimes: {
            peakHour: `${String(peakHour).padStart(2, '0')}:00`,
            requestsAtPeak: hourlyStats[peakHour],
            hourlyDistribution: hourlyStats.map((count, hour) => ({
              hour: `${String(hour).padStart(2, '0')}:00`,
              requests: count
            }))
          },
          performance: {
            fastestEndpoint: endpointArray.reduce((fastest, current) => 
              parseInt(current.avgResponseTime) < parseInt(fastest.avgResponseTime) ? current : fastest
            ),
            slowestEndpoint: endpointArray.reduce((slowest, current) => 
              parseInt(current.avgResponseTime) > parseInt(slowest.avgResponseTime) ? current : slowest
            ),
            mostReliableEndpoint: endpointArray.reduce((reliable, current) => 
              parseFloat(current.successRate) > parseFloat(reliable.successRate) ? current : reliable
            ),
            leastReliableEndpoint: endpointArray.reduce((unreliable, current) => 
              parseFloat(current.successRate) < parseFloat(unreliable.successRate) ? current : unreliable
            )
          },
          insights: {
            totalEndpoints: endpointArray.length,
            busiestDay: dailyArray.reduce((busiest, current) => 
              current.totalRequests > busiest.totalRequests ? current : dailyArray[0]
            ),
            trendingEndpoint: endpointArray.slice(0, 3).map(e => e.endpoint),
            errorRate: totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) + '%' : '0%'
          }
        }
      });
      
    } catch (error) {
      sendResponse(req, res, 500, {
        error: error.message
      });
    }
  });

  app.get('/admin/stats/today', createApiKeyMiddleware(), async (req, res) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      const stats = await UsageStats.find({ date });
      
      const total = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const success = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failed = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const avgResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0) / total || 0;
      
      const hourlyStats = Array(24).fill(0);
      const todayLogs = await ApiLog.find({
        createdAt: { $gte: new Date(date) }
      }).select('createdAt');
      
      todayLogs.forEach(log => {
        const hour = new Date(log.createdAt).getHours();
        hourlyStats[hour]++;
      });
      
      const peakHour = hourlyStats.reduce((maxIndex, count, index) => 
        count > hourlyStats[maxIndex] ? index : maxIndex, 0
      );
      
      const endpointDetails = stats.map(stat => ({
        endpoint: stat.endpoint,
        method: stat.method,
        version: stat.version,
        requests: stat.totalRequests,
        success: stat.successRequests,
        failed: stat.failedRequests,
        successRate: stat.totalRequests > 0 ? ((stat.successRequests / stat.totalRequests) * 100).toFixed(2) + '%' : '0%',
        avgResponseTime: stat.totalRequests > 0 ? Math.round(stat.totalResponseTime / stat.totalRequests) + 'ms' : '0ms'
      })).sort((a, b) => b.requests - a.requests);
      
      sendResponse(req, res, 200, {
        result: {
          date,
          summary: {
            totalRequests: total,
            successRequests: success,
            failedRequests: failed,
            successRate: total > 0 ? ((success / total) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: Math.round(avgResponseTime) + 'ms'
          },
          hourlyActivity: hourlyStats.map((count, hour) => ({
            hour: `${String(hour).padStart(2, '0')}:00`,
            requests: count
          })),
          topEndpoints: endpointDetails.slice(0, 10),
          peakHour: `${String(peakHour).padStart(2, '0')}:00`,
          requestsAtPeak: hourlyStats[peakHour],
          endpointDistribution: endpointDetails,
          statusCodes: {
            '200': success,
            '400': failed - (await ApiLog.countDocuments({ date: { $gte: new Date(date) }, statusCode: 500 }) || 0),
            '500': await ApiLog.countDocuments({ date: { $gte: new Date(date) }, statusCode: 500 }) || 0
          }
        }
      });
    } catch (error) {
      sendResponse(req, res, 500, {
        error: error.message
      });
    }
  });

  app.get('/admin/stats/range', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { startDate, endDate = new Date().toISOString().split('T')[0] } = req.query;
      
      if (!startDate) {
        return sendResponse(req, res, 400, {
          error: "startDate parameter is required"
        });
      }
      
      const stats = await UsageStats.find({
        date: { $gte: startDate, $lte: endDate }
      });
      
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      
      const dailyBreakdown = {};
      stats.forEach(stat => {
        if (!dailyBreakdown[stat.date]) {
          dailyBreakdown[stat.date] = {
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0
          };
        }
        dailyBreakdown[stat.date].totalRequests += stat.totalRequests;
        dailyBreakdown[stat.date].successRequests += stat.successRequests;
        dailyBreakdown[stat.date].failedRequests += stat.failedRequests;
      });
      
      sendResponse(req, res, 200, {
        result: {
          period: { startDate, endDate },
          summary: {
            totalRequests,
            successRequests,
            failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%'
          },
          dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
            date,
            totalRequests: data.totalRequests,
            successRate: data.totalRequests > 0 ? ((data.successRequests / data.totalRequests) * 100).toFixed(2) + '%' : '0%'
          })).sort((a, b) => a.date.localeCompare(b.date)),
          mostActiveDay: Object.entries(dailyBreakdown).reduce((max, [date, data]) => 
            data.totalRequests > max.totalRequests ? { date, totalRequests: data.totalRequests } : max
          , { date: startDate, totalRequests: 0 })
        }
      });
      
    } catch (error) {
      sendResponse(req, res, 500, {
        error: error.message
      });
    }
  });

  app.get('/admin/stats/endpoint/:endpoint', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { endpoint } = req.params;
      const { days = 30 } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      
      const stats = await UsageStats.find({
        endpoint: endpoint,
        date: { $gte: startDate.toISOString().split('T')[0] }
      });
      
      const logs = await ApiLog.find({
        endpoint: endpoint,
        createdAt: { $gte: startDate }
      }).sort({ createdAt: -1 }).limit(100);
      
      const totalRequests = stats.reduce((sum, stat) => sum + stat.totalRequests, 0);
      const successRequests = stats.reduce((sum, stat) => sum + stat.successRequests, 0);
      const failedRequests = stats.reduce((sum, stat) => sum + stat.failedRequests, 0);
      const totalResponseTime = stats.reduce((sum, stat) => sum + stat.totalResponseTime, 0);
      
      const methodBreakdown = {};
      stats.forEach(stat => {
        if (!methodBreakdown[stat.method]) {
          methodBreakdown[stat.method] = {
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0
          };
        }
        methodBreakdown[stat.method].totalRequests += stat.totalRequests;
        methodBreakdown[stat.method].successRequests += stat.successRequests;
        methodBreakdown[stat.method].failedRequests += stat.failedRequests;
      });
      
      const versionBreakdown = {};
      stats.forEach(stat => {
        if (!versionBreakdown[stat.version]) {
          versionBreakdown[stat.version] = {
            totalRequests: 0,
            successRequests: 0,
            failedRequests: 0
          };
        }
        versionBreakdown[stat.version].totalRequests += stat.totalRequests;
        versionBreakdown[stat.version].successRequests += stat.successRequests;
        versionBreakdown[stat.version].failedRequests += stat.failedRequests;
      });
      
      sendResponse(req, res, 200, {
        result: {
          endpoint,
          period: {
            days,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalRequests,
            successRequests,
            failedRequests,
            successRate: totalRequests > 0 ? ((successRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
            avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) + 'ms' : '0ms',
            requestsPerDay: Math.round(totalRequests / days)
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
            timestamp: log.createdAt,
            method: log.method,
            statusCode: log.statusCode,
            responseTime: log.responseTime + 'ms',
            success: log.success,
            apiKey: log.apiKey ? '***' + log.apiKey.slice(-4) : null
          }))
        }
      });
      
    } catch (error) {
      sendResponse(req, res, 500, {
        error: error.message
      });
    }
  });
};
