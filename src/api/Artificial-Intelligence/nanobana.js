import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

async function scrapeImgEditor(imageBuffer, prompt) {
  const info = await fetch("https://imgeditor.co/api/get-upload-url", {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      fileSize: imageBuffer.length
    })
  }).then(r => r.json());

  await fetch(info.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: imageBuffer
  });

  const gen = await fetch("https://imgeditor.co/api/generate-image", {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      styleId: "realistic",
      mode: "image",
      imageUrl: info.publicUrl,
      imageUrls: [info.publicUrl],
      numImages: 1,
      outputFormat: "png",
      model: "nano-banana"
    })
  }).then(r => r.json());

  let status;
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    status = await fetch(`https://imgeditor.co/api/generate-image/status?taskId=${gen.taskId}`, {
      headers: { "accept": "*/*" }
    }).then(r => r.json());

    if (status.status === "completed") break;
  }

  return status.imageUrl;
}

export default (app) => {
  app.get("/v1/tools/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "URL image is required"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const imageBuffer = await downloadImage(url);
      const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          imageUrl: resultUrl,
          downloadUrl: resultUrl,
          prompt: prompt,
          originalImage: url,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  app.post("/v2/tools/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.body;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "URL image is required"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const imageBuffer = await downloadImage(url);
      const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          imageUrl: resultUrl,
          downloadUrl: resultUrl,
          prompt: prompt,
          originalImage: url,
          timestamp: new Date().toISOString(),
          version: "v2"
        }
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });
};
