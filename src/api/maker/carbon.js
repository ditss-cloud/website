import fetch from 'node-fetch';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function CarbonifyV2(code) {
  const response = await fetch("https://carbon-api.vercel.app/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      code: code
    })
  });
  
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
}

export default (app) => {
  app.get("/v1/maker/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: 'Parameter "code" is required'
        });
      }
      
      const buffer = await CarbonifyV2(code);
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="carbon_${Date.now()}.png"`
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

  app.post("/v2/maker/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: 'Parameter "code" is required'
        });
      }
      
      const buffer = await CarbonifyV2(code);
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="carbon_${Date.now()}.png"`
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
