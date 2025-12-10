import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Load fonts sekali saja
let fontsLoaded = false;

async function loadFonts() {
  if (fontsLoaded) return;
  
  try {
    const [font1, font2, font3] = await Promise.all([
      axios.get('https://cdn.asuma.my.id/upload/tbzu.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://cdn.asuma.my.id/upload/3kamag6t.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://cdn.asuma.my.id/upload/slgwacq.otf', { responseType: 'arraybuffer' })
    ]);

    // Register fonts
    registerFont(Buffer.from(font1.data), { family: 'TitleFont' });
    registerFont(Buffer.from(font2.data), { family: 'TextFont' });
    registerFont(Buffer.from(font3.data), { family: 'DecoFont' });
    
    fontsLoaded = true;
    console.log('Fonts loaded successfully');
  } catch (error) {
    console.error('Failed to load fonts:', error.message);
    // Fallback ke Arial jika gagal
  }
}

async function createLevelUpImage(username, level, xp, avatarUrl) {
  // Pastikan fonts sudah di-load
  await loadFonts();
  
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Background dengan efek
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(0.5, '#764ba2');
  gradient.addColorStop(1, '#4c51bf');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  
  // Border dengan efek glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 6;
  ctx.strokeRect(15, 15, 770, 270);
  
  // Avatar
  let avatarImg;
  try {
    const response = await axios.get(avatarUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const buffer = Buffer.from(response.data);
    if (buffer.length > 0) {
      avatarImg = await loadImage(buffer);
    } else {
      throw new Error('Empty image');
    }
  } catch (error) {
    // Fallback avatar
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}&size=200`;
    const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
    avatarImg = await loadImage(Buffer.from(fallbackResponse.data));
  }
  
  // Avatar dengan efek
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  
  // Shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  ctx.drawImage(avatarImg, 65, 65, 170, 170);
  ctx.restore();
  
  // Avatar border
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Username dengan custom font
  ctx.font = 'bold 40px TitleFont, Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(username, 260, 120);
  
  // Level dengan custom font
  ctx.font = '30px TextFont, Arial';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`📊 Level: ${level}`, 260, 170);
  
  // XP dengan custom font
  ctx.fillStyle = '#a7f3d0';
  ctx.fillText(`✨ XP: ${xp}`, 260, 210);
  
  // Progress bar container
  ctx.fillStyle = 'rgba(55, 65, 81, 0.8)';
  ctx.fillRect(260, 240, 500, 30);
  
  // Progress bar fill
  const progress = Math.min(100, (xp % 100) || Math.floor(Math.random() * 100) + 1);
  const progressWidth = (500 * progress) / 100;
  
  const barGradient = ctx.createLinearGradient(260, 240, 260 + progressWidth, 270);
  barGradient.addColorStop(0, '#10b981');
  barGradient.addColorStop(1, '#059669');
  ctx.fillStyle = barGradient;
  ctx.fillRect(260, 240, progressWidth, 30);
  
  // Progress bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.strokeRect(260, 240, 500, 30);
  
  // Progress percentage
  ctx.font = 'bold 22px DecoFont, Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${progress}%`, 760, 262);
  
  // Title dengan custom font
  ctx.font = 'bold 45px TitleFont, Arial';
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.fillText('🎉 LEVEL UP! 🎉', 400, 70);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  
  return canvas.toBuffer('image/png');
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    
    console.log('LevelUp Request:', { 
      username: data.username, 
      level: data.level, 
      xp: data.xp,
      hasAvatar: !!data.avatar 
    });
    
    if (!data.username || !data.level || !data.xp) {
      return res.status(400).json({
        status: false,
        error: "Required: username, level, xp"
      });
    }
    
    const username = String(data.username);
    const level = parseInt(data.level) || 1;
    const xp = parseInt(data.xp) || 0;
    const avatar = data.avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${username}&size=200`;
    
    const imageBuffer = await createLevelUpImage(username, level, xp, avatar);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=86400' // 1 day
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error("LevelUp Error:", error);
    res.status(500).json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/canvas/levelup", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/levelup", createApiKeyMiddleware(), handleRequest);
};
