import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`;
}

function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime;
  const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}`;

  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: version,
    creator: "DitssGanteng",
    requestId: requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  };

  res.status(statusCode).json(response);
}

async function generateImessageImage(text) {
  const carriers = ["INDOSAT", "TELKOMSEL", "XL", "TRI", "SMARTFREN", "AXIS"];
  const carrierName = carriers[Math.floor(Math.random() * carriers.length)];

  const networks = ["LTE", "4G", "5G", "Wi-Fi"];
  const networkType = networks[Math.floor(Math.random() * networks.length)];

  const batteryPercentage = Math.floor(Math.random() * 100) + 1;

  const randomHour = Math.floor(Math.random() * 14) + 8;
  const randomMinute = Math.floor(Math.random() * 60);
  const formattedTime = `${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')}`;

  const emojiStyle = "apple";

  const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(formattedTime)}&batteryPercentage=${batteryPercentage}&carrierName=${encodeURIComponent(carrierName)}&messageText=${encodeURIComponent(text.trim())}&emojiStyle=${emojiStyle}`;

  const response = await axios.get(apiUrl, {
    responseType: "arraybuffer",
    timeout: 10000,
  });

  return Buffer.from(response.data);
}

export default (app) => {
  app.use("/v1/maker/imessage", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/maker/imessage", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  async function handleImessage(req, res, version = 'v1') {
    const text = req.query.text || req.body?.text;

    if (!text) {
      return sendResponse(req, res, 400, {
        error: "Text tidak boleh kosong"
      }, version);
    }

    try {
      const imageBuffer = await generateImessageImage(text);

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length,
      });
      res.end(imageBuffer);

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: "Gagal generate gambar",
        detail: error.message
      }, version);
    }
  }

  app.get("/v1/maker/imessage", createApiKeyMiddleware(), (req, res) => handleImessage(req, res, 'v1'));
  app.post("/v1/maker/imessage", createApiKeyMiddleware(), (req, res) => handleImessage(req, res, 'v1'));
  
  app.get("/v2/maker/imessage", createApiKeyMiddleware(), (req, res) => handleImessage(req, res, 'v2'));
  app.post("/v2/maker/imessage", createApiKeyMiddleware(), (req, res) => handleImessage(req, res, 'v2'));
};
