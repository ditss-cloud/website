import { createCanvas, loadImage, registerFont } from 'canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Cache font data
let fontCache = {
  TitleFont: null,
  TextFont: null,
  DecoFont: null
};

// Load fonts dengan better error handling
async function loadFonts() {
  // Cek jika semua font sudah di-load
  const allLoaded = Object.values(fontCache).every(font => font !== null);
  if (allLoaded) {
    console.log('Fonts already loaded from cache');
    return;
  }

  const fontConfigs = [
    { 
      url: 'https://cdn.asuma.my.id/upload/tbzu.ttf', 
      name: 'TitleFont',
      fallback: 'Impact'
    },
    { 
      url: 'https://cdn.asuma.my.id/upload/3kamag6t.ttf', 
      name: 'TextFont',
      fallback: 'Arial'
    },
    { 
      url: 'https://cdn.asuma.my.id/upload/slgwacq.otf', 
      name: 'DecoFont',
      fallback: 'Georgia'
    }
  ];

  const loadPromises = fontConfigs.map(async (config) => {
    if (fontCache[config.name]) {
      return; // Sudah di-load
    }

    try {
      console.log(`Attempting to load font: ${config.name}`);
      
      const response = await axios.get(config.url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*'
        }
      });
      
      if (response.data && response.data.byteLength > 100) {
        const fontBuffer = Buffer.from(response.data);
        
        // Register font
        registerFont(fontBuffer, { family: config.name });
        fontCache[config.name] = fontBuffer;
        
        console.log(`✅ Successfully loaded ${config.name} (${(fontBuffer.length / 1024).toFixed(1)}KB)`);
      } else {
        console.warn(`⚠️ Font ${config.name} data is too small or empty`);
        fontCache[config.name] = null;
      }
    } catch (error) {
      console.error(`❌ Error loading ${config.name}:`, error.message);
      fontCache[config.name] = null; // Mark as failed
    }
  });

  await Promise.allSettled(loadPromises);
  console.log('Font loading completed:', fontCache);
}

// Helper untuk mendapatkan font family
function getFontFamily(fontName) {
  return fontCache[fontName] ? `"${fontName}"` : getFallbackFont(fontName);
}

function getFallbackFont(fontName) {
  switch(fontName) {
    case 'TitleFont': return '"Impact", "Arial Black", sans-serif';
    case 'TextFont': return '"Arial", "Helvetica", sans-serif';
    case 'DecoFont': return '"Georgia", "Times New Roman", serif';
    default: return 'sans-serif';
  }
}

async function createLevelUpImage(username, level, xp, avatarUrl) {
  console.log('Creating level up image...');
  
  // Pastikan fonts sudah di-load
  await loadFonts();
  
  const canvas = createCanvas(800, 300);
  const ctx = canvas.getContext('2d');
  
  // 1. BACKGROUND
  const gradient = ctx.createLinearGradient(0, 0, 800, 300);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(0.5, '#764ba2');
  gradient.addColorStop(1, '#4c51bf');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 300);
  
  // 2. BORDER
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 780, 280);
  
  // 3. TITLE "LEVEL UP!" - TAMBAHKAN FALLBACK
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  
  // Gunakan font dengan fallback
  const titleFontFamily = getFontFamily('TitleFont');
  ctx.font = `bold 50px ${titleFontFamily}`;
  ctx.fillText('🎉 LEVEL UP! 🎉', 400, 70);
  
  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = 'left';
  
  // 4. AVATAR (sama seperti sebelumnya)
  let avatarImg;
  try {
    const response = await axios.get(avatarUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    avatarImg = await loadImage(Buffer.from(response.data));
  } catch (error) {
    const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/png?seed=${username}&size=200`;
    const fallbackResponse = await axios.get(fallbackUrl, { responseType: 'arraybuffer' });
    avatarImg = await loadImage(Buffer.from(fallbackResponse.data));
  }
  
  // Gambar avatar dengan clip circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 150, 80, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImg, 65, 65, 170, 170);
  ctx.restore();
  
  // 5. USERNAME - DENGAN FONT FALLBACK
  ctx.fillStyle = '#ffffff';
  const textFontFamily = getFontFamily('TextFont');
  ctx.font = `bold 36px ${textFontFamily}`;
  
  // Potong username jika terlalu panjang
  const maxWidth = 480;
  let displayName = username;
  if (ctx.measureText(username).width > maxWidth) {
    while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 1) {
      displayName = displayName.slice(0, -1);
    }
    displayName += '...';
  }
  
  ctx.fillText(displayName, 280, 130);
  
  // 6. LEVEL & XP
  ctx.font = `28px ${textFontFamily}`;
  
  // Level
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`📊 Level: ${level}`, 280, 180);
  
  // XP
  ctx.fillStyle = '#34d399';
  ctx.fillText(`✨ XP: ${xp.toLocaleString()}`, 280, 220);
  
  // 7. PROGRESS BAR
  const progress = Math.min(100, (xp % 100) || 50);
  
  // Bar background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(280, 250, 480, 25);
  
  // Bar fill
  const barWidth = (480 * progress) / 100;
  const barGradient = ctx.createLinearGradient(280, 250, 280 + barWidth, 275);
  barGradient.addColorStop(0, '#10b981');
  barGradient.addColorStop(1, '#059669');
  ctx.fillStyle = barGradient;
  ctx.fillRect(280, 250, barWidth, 25);
  
  // Bar border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(280, 250, 480, 25);
  
  // 8. PERCENTAGE TEXT - DENGAN FONT FALLBACK
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  const decoFontFamily = getFontFamily('DecoFont');
  ctx.font = `bold 18px ${decoFontFamily}`;
  ctx.fillText(`${progress}%`, 750, 270);
  
  // 9. RESET TEXT ALIGN
  ctx.textAlign = 'left';
  
  console.log('Image created successfully with fonts:', {
    TitleFont: fontCache.TitleFont ? 'Loaded' : 'Fallback',
    TextFont: fontCache.TextFont ? 'Loaded' : 'Fallback',
    DecoFont: fontCache.DecoFont ? 'Loaded' : 'Fallback'
  });
  
  return canvas.toBuffer('image/png');
}

// Test endpoint sederhana untuk debugging
export default (app) => {
  app.get("/test-levelup", async (req, res) => {
    try {
      const { username = "TestUser", level = 5, xp = 1250 } = req.query;
      
      console.log('Testing levelup with:', { username, level, xp });
      
      const image = await createLevelUpImage(
        username, 
        parseInt(level), 
        parseInt(xp),
        `https://api.dicebear.com/7.x/avataaars/png?seed=${username}&size=200`
      );
      
      res.set('Content-Type', 'image/png');
      res.send(image);
    } catch (error) {
      console.error('Test error:', error);
      res.status(500).send(`Error: ${error.message}`);
    }
  });
  
  // Endpoint utama (dengan API key)
  app.get("/v1/canvas/levelup", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/canvas/levelup", createApiKeyMiddleware(), handleRequest);
};
