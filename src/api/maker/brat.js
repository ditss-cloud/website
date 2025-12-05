import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default (app) => {
  // ============= HELPER FUNCTION: BRAT IMAGE (PNG) =============

  async function getBratImage(text) {
    try {
      const encodedText = encodeURIComponent(text);
      const urls = [
        `https://aqul-brat.hf.space/?text=${encodedText}`,
        `https://api-faa.my.id/faa/brathd?text=${encodedText}`,
      ];

      const shuffledUrls = urls.sort(() => Math.random() - 0.5);
      let imageBuffer = null;

      for (let url of shuffledUrls) {
        try {
          console.log(`[INFO] Mencoba URL (acak): ${url}`);
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 10000,
          });
          imageBuffer = Buffer.from(response.data);
          if (imageBuffer && imageBuffer.length > 0) {
            console.log("[SUCCESS] Gambar berhasil diambil.");
            break;
          }
        } catch (err) {
          console.warn(`[WARN] Gagal mengambil gambar dari: ${url} - ${err.message}`);
        }
      }

      if (!imageBuffer) {
        throw new Error("Semua API gagal digunakan.");
      }

      return imageBuffer;
    } catch (error) {
      throw error;
    }
  }

// ============= HELPER FUNCTION: BRAT VIDEO (GIF / MP4) =============
async function getBratVideo(text, format = "mp4") {
  try {
    const background = "#ffffff";   
    const color = "#000000";        
    const emojiStyle = "apple";
    const delay = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;        // 100–2000
    const endDelay = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;     // 500–5000
    const width = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;        // 100–1000
    const height = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;       // 100–1000

    // Build URL
    const baseUrl = `https://brat.siputzx.my.id/${format}`;
    const url = `${baseUrl}?text=${encodeURIComponent(text)}&background=${background}&color=${color}&emojiStyle=${emojiStyle}&delay=${delay}&endDelay=${endDelay}&width=${width}&height=${height}`;

    console.log("[Brat Video Request]", url);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
    });

    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Gagal generate video Brat: ${error.message}`);
  }
}

  // ============= HELPER FUNCTION: BRAT AUDIO (MP3) — STUB =============

  async function getBratAudio(text) {
    // ⚠️ Saat ini tidak ada API Brat yang menghasilkan MP3.
    // Tapi kita siapkan struktur jika nanti ada.

    try {
      // Contoh placeholder — ganti dengan API nyata jika ada
      const url = `https://brat.siputzx.my.id/mp3?text=${encodeURIComponent(text)}`; // <-- cek apakah ada!

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      // Jika tidak ada API MP3, beri pesan error
      throw new Error(
        "API MP3 Brat belum tersedia. Coba gunakan GIF/MP4 dulu."
      );
    }
  }

  // ============= ENDPOINT: BRAT IMAGE (PNG) =============

  app.get("/maker/brat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const imageBuffer = await getBratImage(text);

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length,
      });
      res.end(imageBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT image",
      });
    }
  });

  app.post("/maker/brat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const imageBuffer = await getBratImage(text);

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": imageBuffer.length,
      });
      res.end(imageBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT image",
      });
    }
  });

  // ============= ENDPOINT: BRAT VIDEO (MP4) =============

  app.get("/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const videoBuffer = await getBratVideo(text, "mp4");

      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length,
      });
      res.end(videoBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT video",
      });
    }
  });

  app.post("/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const videoBuffer = await getBratVideo(text, "mp4");

      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": videoBuffer.length,
      });
      res.end(videoBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT video",
      });
    }
  });

  // ============= ENDPOINT: BRAT GIF =============

  app.get("/maker/bratgif", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const gifBuffer = await getBratVideo(text, "gif");

      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": gifBuffer.length,
      });
      res.end(gifBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT GIF",
      });
    }
  });

  app.post("/maker/bratgif", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const gifBuffer = await getBratVideo(text, "gif");

      res.writeHead(200, {
        "Content-Type": "image/gif",
        "Content-Length": gifBuffer.length,
      });
      res.end(gifBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT GIF",
      });
    }
  });

  // ============= ENDPOINT: BRAT RANDOM FORMAT (GIF/MP4) =============

  app.get("/maker/bratrandom", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const format = Math.random() > 0.5 ? "gif" : "mp4";
      const mimeType = format === "gif" ? "image/gif" : "video/mp4";

      const buffer = await getBratVideo(text, format);

      res.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT random format",
      });
    }
  });

  app.post("/maker/bratrandom", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const format = Math.random() > 0.5 ? "gif" : "mp4";
      const mimeType = format === "gif" ? "image/gif" : "video/mp4";

      const buffer = await getBratVideo(text, format);

      res.writeHead(200, {
        "Content-Type": mimeType,
        "Content-Length": buffer.length,
      });
      res.end(buffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT random format",
      });
    }
  });

  // ============= ENDPOINT: BRAT AUDIO (MP3) — STUB =============

  app.get("/api/maker/brataudio", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const audioBuffer = await getBratAudio(text);

      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
      });
      res.end(audioBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT audio",
      });
    }
  });

  app.post("/api/maker/brataudio", createApiKeyMiddleware(), async (req, res) => {
    try {
      const text = req.query.text || req.body?.text;

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const audioBuffer = await getBratAudio(text);

      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length,
      });
      res.end(audioBuffer);
    } catch (error) {
      console.error("[ERROR] " + error.message);
      res.status(500).json({
        status: false,
        error: error.message || "Failed to generate BRAT audio",
      });
    }
  });
};
