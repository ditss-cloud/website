// src/api/nsfw/index.js
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// --- BUILT-IN getBuffer (tanpa perlu file lain) ---
async function getBuffer(url) {
  try {
    const data = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    return Buffer.from(data.data);
  } catch (err) {
    console.error("[getBuffer Error]:", err.message);
    throw new Error("Gagal mengambil buffer gambar");
  }
}

// --- Semua kategori NSFW dari waifu.pics ---
const NSFW_CATEGORIES = {
  waifu: ["waifu"],
  neko: ["neko"],
  trap: ["trap"],
  blowjob: ["blowjob"],
};

// --- Ambil gambar NSFW ---
async function getNsfwImage(list) {
  try {
    const pick = list[Math.floor(Math.random() * list.length)];
    const resp = await axios.get(`https://api.waifu.pics/nsfw/${pick}`, {
      timeout: 10000
    });

    return await getBuffer(resp.data.url);
  } catch (err) {
    console.error("[NSFW Error]:", err.message);
    throw new Error("Gagal mengambil gambar NSFW");
  }
}

export default (app) => {
  Object.keys(NSFW_CATEGORIES).forEach((category) => {
    
    async function handleNsfw(req, res) {
      try {
        const buffer = await getNsfwImage(NSFW_CATEGORIES[category]);

        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": buffer.length,
        });

        return res.end(buffer);
      } catch (error) {
        return res.status(500).json({
          status: false,
          error: error.message,
        });
      }
    }

    // GET & POST konsisten
    app.get(`/api/nsfw/${category}`, createApiKeyMiddleware(), handleNsfw);
    app.post(`/api/nsfw/${category}`, createApiKeyMiddleware(), handleNsfw);

  });
};
