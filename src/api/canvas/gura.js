import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  });
  return Buffer.from(response.data);
}

async function gura(imageBuffer) {
  const backgroundImg = await loadImage('https://files.catbox.moe/trfgwb.png');
  const inputImg = await loadImage(imageBuffer);
  
  const canvas = createCanvas(backgroundImg.width, backgroundImg.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(backgroundImg, 0, 0);
  
  const boxX = 395;
  const boxY = 200;
  const boxWidth = 310;
  const boxHeight = 310;
  
  const imgAspectRatio = inputImg.width / inputImg.height;
  
  let sourceX, sourceY, sourceWidth, sourceHeight;
  
  if (imgAspectRatio > 1) {
    sourceHeight = inputImg.height;
    sourceWidth = inputImg.height;
    sourceX = (inputImg.width - sourceWidth) / 2;
    sourceY = 0;
  } else {
    sourceWidth = inputImg.width;
    sourceHeight = inputImg.width;
    sourceX = 0;
    sourceY = (inputImg.height - sourceHeight) / 2;
  }
  
  ctx.drawImage(inputImg, sourceX, sourceY, sourceWidth, sourceHeight, boxX, boxY, boxWidth, boxHeight);
  return canvas.toBuffer('image/png');
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    const { url } = data;
    
    if (!url) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'url' is required"
      });
    }
    
    const imageBuffer = await downloadImage(url);
    const guraBuffer = await gura(imageBuffer);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': guraBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(guraBuffer);
    
  } catch (error) {
    console.error("Gura Error:", error);
    res.json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/canvas/gura", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/gura", createApiKeyMiddleware(), handleRequest);
};
