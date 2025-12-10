import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Cache font data
let fontCache = {
  TitleFont: null,
  TextFont: null,
  DecoFont: null
};

// Load fonts dengan caching
async function loadFonts() {
  // Cek jika semua font sudah di-load
  if (Object.values(fontCache).every(font => font !== null)) {
    return;
  }

  try {
    const fontUrls = [
      { url: 'https://cdn.asuma.my.id/upload/tbzu.ttf', name: 'TitleFont' },
      { url: 'https://cdn.asuma.my.id/upload/3kamag6t.ttf', name: 'TextFont' },
      { url: 'https://cdn.asuma.my.id/upload/slgwacq.otf', name: 'DecoFont' }
    ];

    for (const font of fontUrls) {
      if (!fontCache[font.name]) {
        try {
          const response = await axios.get(font.url, { 
            responseType: 'arraybuffer',
            timeout: 5000 
          });
          fontCache[font.name] = response.data;
          registerFont(Buffer.from(response.data), { family: font.name });
          console.log(`Font ${font.name} loaded successfully`);
        } catch (error) {
          console.warn(`Failed to load ${font.name}: ${error.message}`);
          // Set null untuk fallback
          fontCache[font.name] = null;
        }
      }
    }
  } catch (error) {
    console.error('Error loading fonts:', error.message);
  }
}

async function createLevelUpImage(username, level, xp, avatarUrl) {
  // Pastikan fonts sudah di-load
  await loadFonts();
  
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // Background gradient yang lebih smooth
  const gradient = ctx.createLinearGradient(0, 0, 800, 0);
  gradient.addColorStop(0, '#4f46e5');
  gradient.addColorStop(0.5, '#7c3aed');
  gradient.addColorStop(1, '#db2777');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  
  // Background pattern overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 800; i += 20) {
    for (let j = 0; j < 300; j += 20) {
      if ((i + j) % 40 === 0) {
        ctx.fillRect(i, j, 10, 10);
      }
    }
  }
  
  // Border dengan efek glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 780, 280);
  
  // Load avatar dengan retry mechanism
  let avatarImg;
  let avatarError = false;
  
  try {
    const response = await axios.get(avatarUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*'
      }
    });
    
    if (response.data && response.data.byteLength > 100) {
      avatarImg = await loadImage(Buffer.from(response.data));
    } else {
      throw new Error('Avatar terlalu kecil atau kosong');
    }
  } catch (error) {
    console.warn('Gagal load avatar, menggunakan fallback:', error.message);
    avatarError = true;
    // Fallback ke avatar berdasarkan username
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&size=256&backgroundColor=4f46e5`;
    const fallbackResponse = await axios.get(fallbackUrl, { 
      responseType: 'arraybuffer',
      timeout: 5000 
    });
    avatarImg = await loadImage(Buffer.from(fallbackResponse.data));
  }
  
  // Gambar avatar dengan clip circle
  ctx.save();
  
  // Avatar shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;
  
  // Avatar circle background
  ctx.beginPath();
  ctx.arc(150, 150, 80, 0, Math.PI * 2);
  ctx.fillStyle = avatarError ? '#4f46e5' : 'white';
  ctx.fill();
  
  // Avatar clip
  ctx.beginPath();
  ctx.arc(150, 150, 75, 0, Math.PI * 2);
  ctx.clip();
  
  // Reset shadow untuk gambar avatar
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Gambar avatar
  ctx.drawImage(avatarImg, 75, 75, 150, 150);
  ctx.restore();
  
  // Avatar border glow
  ctx.beginPath();
  ctx.arc(150, 150, 75, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.shadowColor = 'rgba(99, 102, 241, 0.8)';
  ctx.shadowBlur = 15;
  ctx.stroke();
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Panel informasi (right side)
  const infoX = 280;
  
  // Title "LEVEL UP"
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.font = 'bold 48px "TitleFont", Arial, sans-serif';
  ctx.fillText('🎉 LEVEL UP! 🎉', infoX, 80);
  
  // Reset shadow untuk text lainnya
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Username
  ctx.font = 'bold 32px "TextFont", Arial, sans-serif';
  ctx.fillStyle = '#fef3c7';
  const maxUsernameWidth = 480;
  let displayUsername = username;
  
  // Potong username jika terlalu panjang
  if (ctx.measureText(username).width > maxUsernameWidth) {
    while (ctx.measureText(displayUsername + '...').width > maxUsernameWidth && displayUsername.length > 1) {
      displayUsername = displayUsername.slice(0, -1);
    }
    displayUsername += '...';
  }
  ctx.fillText(displayUsername, infoX, 130);
  
  // Level
  ctx.font = '28px "TextFont", Arial, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(`📊 Level: ${level}`, infoX, 175);
  
  // XP
  ctx.fillStyle = '#34d399';
  ctx.fillText(`✨ XP: ${xp.toLocaleString()}`, infoX, 215);
  
  // Progress bar container
  const progressBarY = 240;
  const progressBarWidth = 480;
  const progressBarHeight = 25;
  
  // Background bar
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(infoX, progressBarY, progressBarWidth, progressBarHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(infoX, progressBarY, progressBarWidth, progressBarHeight);
  
  // Progress calculation - lebih baik
  const baseXP = 100; // XP dasar per level
  const xpForCurrentLevel = (level - 1) * baseXP;
  const xpForNextLevel = level * baseXP;
  const currentXP = xp;
  const progress = Math.min(100, Math.max(0, 
    ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
  ));
  
  // Progress bar fill
  const progressWidth = (progressBarWidth * progress) / 100;
  const barGradient = ctx.createLinearGradient(infoX, progressBarY, infoX + progressWidth, progressBarY + progressBarHeight);
  barGradient.addColorStop(0, '#10b981');
  barGradient.addColorStop(0.5, '#3b82f6');
  barGradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = barGradient;
  ctx.fillRect(infoX, progressBarY, progressWidth, progressBarHeight);
  
  // Progress bar border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(infoX, progressBarY, progressWidth, progressBarHeight);
  
  // Progress percentage
  ctx.font = 'bold 20px "DecoFont", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(progress)}%`, infoX + progressBarWidth - 10, progressBarY + 19);
  
  // Reset text align
  ctx.textAlign = 'left';
  
  // Dekorasi tambahan
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.font = '16px "DecoFont", Arial, sans-serif';
  ctx.fillText('• Level Achieved •', 400, 290);
  
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
    
    // Validasi input
    if (!data.username || data.level === undefined || data.xp === undefined) {
      return res.status(400).json({
        success: false,
        error: "Parameter required: username, level, xp"
      });
    }
    
    const username = String(data.username).substring(0, 50); // Batasi panjang username
    const level = Math.max(1, parseInt(data.level) || 1);
    const xp = Math.max(0, parseInt(data.xp) || 0);
    const avatar = data.avatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(username)}&size=256`;
    
    const imageBuffer = await createLevelUpImage(username, level, xp, avatar);
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': imageBuffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Generated-By': 'LevelUp Canvas API'
    });
    
    res.send(imageBuffer);
    
  } catch (error) {
    console.error("LevelUp Error:", error);
    
    // Fallback image jika error
    const errorCanvas = createCanvas(800, 300);
    const errorCtx = errorCanvas.getContext('2d');
    errorCtx.fillStyle = '#1f2937';
    errorCtx.fillRect(0, 0, 800, 300);
    errorCtx.fillStyle = '#ffffff';
    errorCtx.font = '30px Arial';
    errorCtx.textAlign = 'center';
    errorCtx.fillText('Error generating level up image', 400, 150);
    errorCtx.font = '20px Arial';
    errorCtx.fillText(error.message.substring(0, 100), 400, 180);
    
    const errorBuffer = errorCanvas.toBuffer('image/png');
    
    res.status(500).set({
      'Content-Type': 'image/png',
      'Content-Length': errorBuffer.length
    }).send(errorBuffer);
  }
}

export default (app) => {
  app.get("/v1/canvas/levelup", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/levelup", createApiKeyMiddleware(), handleRequest);
};
