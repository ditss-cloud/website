import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Register font jika perlu (opsional)
// registerFont('path/to/font.ttf', { family: 'FontName' });

async function createLevelUpImage(username, level, xp, avatarUrl) {
  // Ukuran canvas
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
  
  // Download avatar
  let avatarImg;
  try {
    const response = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
    const avatarBuffer = Buffer.from(response.data);
    avatarImg = await loadImage(avatarBuffer);
  } catch {
    // Fallback avatar
    avatarImg = await loadImage('https://cdn.ditss.biz.id/default-avatar.png');
  }
  
  // Avatar circle
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
  
  // Username
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(username, 260, 120);
  
  // Level text
  ctx.font = '28px Arial';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`Level: ${level}`, 260, 170);
  
  // XP text
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText(`XP: ${xp}`, 260, 210);
  
  // XP Progress bar background
  ctx.fillStyle = '#374151';
  ctx.fillRect(260, 240, 500, 25);
  
  // XP Progress bar fill (contoh: 70% progress)
  const progress = xp % 100; // Misal XP untuk next level
  const progressWidth = (500 * progress) / 100;
  ctx.fillStyle = '#10b981';
  ctx.fillRect(260, 240, progressWidth, 25);
  
  // Progress bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(260, 240, 500, 25);
  
  // Progress text
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${progress}%`, 720, 258);
  
  // Celebration text
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL UP! 🎉', 400, 70);
  
  return canvas.toBuffer('image/png');
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    const { username, level, xp, avatar } = data;
    
    if (!username || !level || !xp || !avatar) {
      return res.json({
        status: false,
        error: "Parameters 'username', 'level', 'xp', and 'avatar' are required"
      });
    }
    
    const levelInt = parseInt(level);
    const xpInt = parseInt(xp);
    
    const imageBuffer = await createLevelUpImage(username, levelInt, xpInt, avatar);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=3600'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error("Level Up Error:", error);
    res.json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/canvas/levelup", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/levelup", createApiKeyMiddleware(), handleRequest);
};
