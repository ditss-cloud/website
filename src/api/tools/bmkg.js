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

async function getGempa() {
  const response = await axios.get("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json", {
    timeout: 10000,
  });
  return response.data?.Infogempa?.gempa;
}

export default (app) => {
  app.use("/v1/tools/cekgempa", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/cekgempa", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  async function handleCekGempa(req, res, version = 'v1') {
    try {
      const data = await getGempa();

      if (!data) {
        return sendResponse(req, res, 500, {
          error: "Data gempa tidak ditemukan"
        }, version);
      }

      return sendResponse(req, res, 200, {
        result: {
          lokasi: data.Wilayah,
          waktu: `${data.Tanggal} ${data.Jam}`,
          magnitude: data.Magnitude,
          kedalaman: data.Kedalaman,
          koordinat: data.Coordinates,
          potensi: data.Potensi,
          dirasakan: data.Dirasakan || "Tidak ada informasi dirasakan",
          peta: data.Shakemap
            ? `https://data.bmkg.go.id/DataMKG/TEWS/${data.Shakemap}`
            : null,
        }
      }, version);

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message
      }, version);
    }
  }

  app.get("/v1/tools/cekgempa", createApiKeyMiddleware(), (req, res) => handleCekGempa(req, res, 'v1'));
  app.post("/v1/tools/cekgempa", createApiKeyMiddleware(), (req, res) => handleCekGempa(req, res, 'v1'));
  
  app.get("/v2/tools/cekgempa", createApiKeyMiddleware(), (req, res) => handleCekGempa(req, res, 'v2'));
  app.post("/v2/tools/cekgempa", createApiKeyMiddleware(), (req, res) => handleCekGempa(req, res, 'v2'));
};
