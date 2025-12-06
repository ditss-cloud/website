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

async function getBuffer(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

function encodeEmoji(emoji) {
  return [...emoji]
    .map(char => char.codePointAt(0).toString(16))
    .join('-');
}

const SUPPORTED_STYLES = ["apple", "google", "facebook", "twitter"];

async function handleSingleEmoji(req, res, version = 'v1') {
  const { emoji, style = "apple" } = req.query;

  if (!emoji) {
    return sendResponse(req, res, 400, {
      error: "Parameter 'emoji' wajib diisi"
    }, version);
  }

  if (!SUPPORTED_STYLES.includes(style)) {
    return sendResponse(req, res, 400, {
      error: `Style tidak didukung. Pilih: ${SUPPORTED_STYLES.join(", ")}`
    }, version);
  }

  try {
    const url = `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=${style}`;
    const buffer = await getBuffer(url);

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(buffer);
  } catch (err) {
    return sendResponse(req, res, 500, {
      error: "Gagal mengambil emoji"
    }, version);
  }
}

async function handleEmojiMix(req, res, version = 'v1') {
  const { emoji1, emoji2 } = req.query;

  if (!emoji1 || !emoji2) {
    return sendResponse(req, res, 400, {
      error: "Parameter 'emoji1' dan 'emoji2' wajib diisi"
    }, version);
  }

  try {
    const searchQuery = `${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
    const tenorUrl = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${searchQuery}`;

    const tenorRes = await axios.get(tenorUrl);
    const results = tenorRes.data?.results;

    if (!results || results.length === 0) {
      return sendResponse(req, res, 404, {
        error: "Tidak ada kombinasi emoji ditemukan"
      }, version);
    }

    const imageUrl = results[0].media_formats?.png?.url || results[0].url;
    if (!imageUrl) {
      throw new Error("URL gambar tidak ditemukan");
    }

    const buffer = await getBuffer(imageUrl);

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  } catch (err) {
    return sendResponse(req, res, 500, {
      error: "Gagal membuat emoji mix"
    }, version);
  }
}

async function handleEmojiToGif(req, res, version = 'v1') {
  const { emoji } = req.query;

  if (!emoji) {
    return sendResponse(req, res, 400, {
      error: "Parameter 'emoji' wajib diisi"
    }, version);
  }

  try {
    const encoded = encodeEmoji(emoji);
    const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${encoded}/512.webp`;

    const buffer = await getBuffer(url);

    res.writeHead(200, {
      "Content-Type": "image/webp",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(buffer);
  } catch (err) {
    return sendResponse(req, res, 500, {
      error: "Gagal mengambil animasi emoji"
    }, version);
  }
}

export default (app) => {
  app.use("/v1/tools/emoji", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/emoji", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v1/tools/emojimix", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/emojimix", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v1/tools/emojitogif", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/emojitogif", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.get("/v1/tools/emoji", createApiKeyMiddleware(), (req, res) => handleSingleEmoji(req, res, 'v1'));
  app.post("/v1/tools/emoji", createApiKeyMiddleware(), (req, res) => handleSingleEmoji(req, res, 'v1'));
  app.get("/v2/tools/emoji", createApiKeyMiddleware(), (req, res) => handleSingleEmoji(req, res, 'v2'));
  app.post("/v2/tools/emoji", createApiKeyMiddleware(), (req, res) => handleSingleEmoji(req, res, 'v2'));

  app.get("/v1/tools/emojimix", createApiKeyMiddleware(), (req, res) => handleEmojiMix(req, res, 'v1'));
  app.post("/v1/tools/emojimix", createApiKeyMiddleware(), (req, res) => handleEmojiMix(req, res, 'v1'));
  app.get("/v2/tools/emojimix", createApiKeyMiddleware(), (req, res) => handleEmojiMix(req, res, 'v2'));
  app.post("/v2/tools/emojimix", createApiKeyMiddleware(), (req, res) => handleEmojiMix(req, res, 'v2'));

  app.get("/v1/tools/emojitogif", createApiKeyMiddleware(), (req, res) => handleEmojiToGif(req, res, 'v1'));
  app.post("/v1/tools/emojitogif", createApiKeyMiddleware(), (req, res) => handleEmojiToGif(req, res, 'v1'));
  app.get("/v2/tools/emojitogif", createApiKeyMiddleware(), (req, res) => handleEmojiToGif(req, res, 'v2'));
  app.post("/v2/tools/emojitogif", createApiKeyMiddleware(), (req, res) => handleEmojiToGif(req, res, 'v2'));
};
