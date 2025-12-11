// src/api/sfw/index.js
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Built-in getBuffer (tanpa perlu file terpisah)
async function getBuffer(url) {
  try {
    const { data } = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
    });
    return Buffer.from(data);
  } catch (err) {
    console.error("[getBuffer Error]:", err.message);
    throw new Error("Gagal ambil buffer gambar");
  }
}

// Semua kategori SFW waifu.pics
const SFW_CATEGORIES = {
  waifu: ["waifu"],
  neko: ["neko"],
  shinobu: ["shinobu"],
  megumin: ["megumin"],
  bully: ["bully"],
  cuddle: ["cuddle"],
  cry: ["cry"],
  hug: ["hug"],
  awoo: ["awoo"],
  kiss: ["kiss"],
  lick: ["lick"],
  pat: ["pat"],
  smug: ["smug"],
  bonk: ["bonk"],
  yeet: ["yeet"],
  blush: ["blush"],
  smile: ["smile"],
  wave: ["wave"],
  highfive: ["highfive"],
  handhold: ["handhold"],
  nom: ["nom"],
  bite: ["bite"],
  slap: ["slap"],
  kick: ["kick"],
  happy: ["happy"],
  wink: ["wink"],
  poke: ["poke"],
  dance: ["dance"],
  cringe: ["cringe"],
};

// Fetch gambar SFW
async function getSfwImage(list) {
  try {
    const pick = list[Math.floor(Math.random() * list.length)];
    const { data } = await axios.get(`https://api.waifu.pics/sfw/${pick}`, {
      timeout: 10000,
    });

    return await getBuffer(data.url);
  } catch (err) {
    console.error("[SFW Error]:", err.message);
    throw new Error("Gagal mengambil gambar SFW");
  }
}

export default (app) => {
  Object.keys(SFW_CATEGORIES).forEach((category) => {
    
    async function handle(req, res) {
      try {
        const buffer = await getSfwImage(SFW_CATEGORIES[category]);

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

    // GET & POST (konsisten)
    app.get(`/v1/sfw/${category}`, createApiKeyMiddleware(), handle);
    app.post(`/v1/sfw/${category}`, createApiKeyMiddleware(), handle);

  });
};
