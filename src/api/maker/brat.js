import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default (app) => {
  async function getBratImage(text, background = "#FFFFFF", color = "#000000") {
    try {
      const encodedText = encodeURIComponent(text);
      const encodedBackground = encodeURIComponent(background);
      const encodedColor = encodeURIComponent(color);
      
      const url = `https://adittpler-bratt.hf.space/api/brat?text=${encodedText}&background=${encodedBackground}&color=${encodedColor}`;
      
      console.log(`[INFO] Mencoba URL: ${url}`);
      
      // Pertama, panggil API untuk mendapatkan URL gambar
      const apiResponse = await axios.get(url, {
        headers: {
          'accept': 'application/json'
        },
        timeout: 10000
      });
      
      // Ambil URL gambar dari respons API
      const imageUrl = apiResponse.data.URL;
      
      if (!imageUrl) {
        throw new Error("URL gambar tidak ditemukan dalam respons API");
      }
      
      console.log(`[INFO] Mengambil gambar dari: ${imageUrl}`);
      
      // Unduh gambar dari URL yang diberikan
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Gambar kosong atau gagal diunduh");
      }
      
      console.log("[SUCCESS] Gambar berhasil diambil.");
      return imageBuffer;
      
    } catch (error) {
      console.error(`[ERROR] Gagal mengambil gambar: ${error.message}`);
      throw error;
    }
  }

  async function getBratVideo(text, background = "#FFFFFF", color = "#FFFFFF", format = "mp4") {
    try {
      const encodedText = encodeURIComponent(text);
      const encodedBackground = encodeURIComponent(background);
      const encodedColor = encodeURIComponent(color);
      
      const url = `https://adittpler-bratt.hf.space/api/bratvid?text=${encodedText}&background=${encodedBackground}&color=${encodedColor}`;
      
      console.log("[Brat Video Request]", url);

      // Pertama, panggil API untuk mendapatkan URL video
      const apiResponse = await axios.get(url, {
        headers: {
          'accept': 'application/json'
        },
        timeout: 20000
      });
      
      // Ambil URL video dari respons API
      const videoUrl = apiResponse.data.URL;
      
      if (!videoUrl) {
        throw new Error("URL video tidak ditemukan dalam respons API");
      }
      
      console.log(`[INFO] Mengambil video dari: ${videoUrl}`);
      
      // Unduh video dari URL yang diberikan
      const videoResponse = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 30000
      });

      return Buffer.from(videoResponse.data);
    } catch (error) {
      throw new Error(`Gagal generate video Brat: ${error.message}`);
    }
  }

  // Fungsi helper untuk memvalidasi format warna HEX
  function isValidHexColor(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  // Fungsi helper untuk mengekstrak parameter dari request
  function extractParams(req) {
    const text = req.query.text || req.body?.text;
    const background = req.query.background || req.body?.background || "#FFFFFF";
    const color = req.query.color || req.body?.color;
    
    // Validasi warna HEX jika diberikan
    if (background && !isValidHexColor(background)) {
      throw new Error("Format background harus HEX (contoh: #FFFFFF)");
    }
    
    if (color && !isValidHexColor(color)) {
      throw new Error("Format color harus HEX (contoh: #000000)");
    }
    
    return { text, background, color };
  }

  app.get("/v1/maker/brat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text, background, color } = extractParams(req);
      
      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }
      
      const imageBuffer = await getBratImage(
        text, 
        background, 
        color || "#000000" // Default untuk gambar
      );
      
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

  app.post("/v2/maker/brat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text, background, color } = extractParams(req);

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const imageBuffer = await getBratImage(
        text, 
        background, 
        color || "#000000" // Default untuk gambar
      );

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

  app.get("/v1/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text, background, color } = extractParams(req);

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const videoBuffer = await getBratVideo(
        text,
        background,
        color || "#FFFFFF", // Default untuk video
        "mp4"
      );

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

  app.post("/v2/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text, background, color } = extractParams(req);

      if (!text) {
        return res.status(400).json({ status: false, error: "Text is required" });
      }

      const videoBuffer = await getBratVideo(
        text,
        background,
        color || "#FFFFFF", // Default untuk video
        "mp4"
      );

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
};

/*import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default (app) => {
  async function getBratImage(text) {
    try {
      const encodedText = encodeURIComponent(text);
      const urls = [
        `https://aqul-brat.hf.space/?text=${encodedText}`,
        `https://api-faa.my.id/faa/brathd?text=${encodedText}`,
        `https://izukumii-brat.hf.space/api?text=${encodedText}`,
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
async function getBratVideo(text, format = "mp4") {
  try {
    const background = "#ffffff";   
    const color = "#000000";        
    const emojiStyle = "apple";
    const delay = Math.floor(Math.random() * (2000 - 100 + 1)) + 100;        // 100–2000
    const endDelay = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;     // 500–5000
    const width = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;        // 100–1000
    const height = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;       // 100–1000

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
  app.get("/v1/maker/brat", createApiKeyMiddleware(), async (req, res) => {
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

  app.post("/v2/maker/brat", createApiKeyMiddleware(), async (req, res) => {
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

  app.get("/v1/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
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

  app.post("/v2/maker/bratvid", createApiKeyMiddleware(), async (req, res) => {
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
};*/
