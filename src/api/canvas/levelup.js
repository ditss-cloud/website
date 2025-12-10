import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function createLevelUpImage(username, level, xp, avatarUrl) {
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  
  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.strokeRect(10, 10, 780, 280);
  
  // Avatar - handle WhatsApp URL khusus
  let avatarImg;
  try {
    // WhatsApp URL sering butuh User-Agent khusus
    const response = await axios.get(avatarUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Validasi bahwa response adalah gambar
    const buffer = Buffer.from(response.data);
    if (buffer.length === 0) {
      throw new Error('Empty image response');
    }
    
    avatarImg = await loadImage(buffer);
    
  } catch (error) {
    console.log('Avatar load failed, using fallback:', error.message);
    // Fallback ke avatar generator
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&size=160`;
    const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
    avatarImg = await loadImage(Buffer.from(fallbackResponse.data));
  }
  
  // Draw avatar circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 80, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, 70, 70, 160, 160);
  ctx.restore();
  
  // Avatar border
  ctx.beginPath();
  ctx.arc(150, 150, 80, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();
  
  // Text
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(username, 260, 120);
  
  ctx.font = '28px Arial';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`Level: ${level}`, 260, 170);
  
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText(`XP: ${xp}`, 260, 210);
  
  // Progress bar
  const progress = Math.min(100, (xp % 100) || 50);
  const progressWidth = (500 * progress) / 100;
  
  ctx.fillStyle = '#374151';
  ctx.fillRect(260, 240, 500, 25);
  
  ctx.fillStyle = '#10b981';
  ctx.fillRect(260, 240, progressWidth, 25);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(260, 240, 500, 25);
  
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${progress}%`, 720, 258);
  
  // Title
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL UP! 🎉', 400, 70);
  
  return canvas.toBuffer('image/png');
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    
    // Debug log
    console.log('Received data:', data);
    
    if (!data.username || !data.level || !data.xp) {
      return res.status(400).json({
        status: false,
        error: "Parameter required: username, level, xp"
      });
    }
    
    const username = String(data.username);
    const level = parseInt(data.level) || 1;
    const xp = parseInt(data.xp) || 0;
    const avatar = data.avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}`;
    
    console.log('Processing:', { username, level, xp, avatar });
    
    const imageBuffer = await createLevelUpImage(username, level, xp, avatar);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error("Level Up Error:", error);
    res.status(500).json({
      status: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export default (app) => {
  app.get("/v1/canvas/levelup", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/levelup", createApiKeyMiddleware(), handleRequest);
};
