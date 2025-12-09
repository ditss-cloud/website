import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function generatePakUstadzImage(teks, option) {
  const response = await axios.post(
    "https://lemon-ustad.vercel.app/api/generate-image",
    {
      isi: decodeURIComponent(teks),
      option,
    },
    {
      responseType: "arraybuffer",
      timeout: 60000,
    }
  );

  return Buffer.from(response.data);
}

export default (app) => {
  // V1 GET - type1
  app.get("/v1/maker/pakustadz", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { teks } = req.query;
      
      if (!teks) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Parameter 'teks' is required"
        });
      }
      
      const buffer = await generatePakUstadzImage(teks, "type1");
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  // V1 POST - type1
  app.post("/v1/maker/pakustadz", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { teks } = req.body;
      
      if (!teks) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Parameter 'teks' is required"
        });
      }
      
      const buffer = await generatePakUstadzImage(teks, "type1");
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  // V2 GET - type2
  app.get("/v2/maker/pakustadz", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { teks } = req.query;
      
      if (!teks) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Parameter 'teks' is required"
        });
      }
      
      const buffer = await generatePakUstadzImage(teks, "type2");
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  // V2 POST - type2
  app.post("/v2/maker/pakustadz", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { teks } = req.body;
      
      if (!teks) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Parameter 'teks' is required"
        });
      }
      
      const buffer = await generatePakUstadzImage(teks, "type2");
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Length': buffer.length
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });
};
