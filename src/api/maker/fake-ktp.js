import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`;
}

function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime;
  const requestId = req.headers['x-vercel-id'] || 
                   req.headers['x-request-id'] || 
                   `asuma-${Date.now()}`;

  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: version,
    creator: "DitssGanteng",
    requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  };

  res.status(statusCode).json(response);
}

// Cache untuk font yang sudah didownload
let fontsLoaded = false;
const fontCache = {
  arrial: null,
  ocr: null,
  sign: null
};

async function setupFonts() {
  if (fontsLoaded) return;
  
  try {
    console.log('Loading fonts...');
    
    const [arrialResponse, ocrResponse, signResponse] = await Promise.all([
      axios.get('https://api.nekolabs.web.id/f/arrial.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://api.nekolabs.web.id/f/ocr.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://api.nekolabs.web.id/f/sign.otf', { responseType: 'arraybuffer' })
    ]);
    
    fontCache.arrial = Buffer.from(arrialResponse.data);
    fontCache.ocr = Buffer.from(ocrResponse.data);
    fontCache.sign = Buffer.from(signResponse.data);
    
    GlobalFonts.register(fontCache.arrial, 'ArrialKTP');
    GlobalFonts.register(fontCache.ocr, 'OcrKTP');
    GlobalFonts.register(fontCache.sign, 'SignKTP');
    
    fontsLoaded = true;
    console.log('Fonts loaded successfully');
    
  } catch (error) {
    console.error('Failed to load fonts:', error.message);
    throw new Error(`Font setup failed: ${error.message}`);
  }
}

async function ktpgen({
  nama,
  provinsi,
  kota,
  nik,
  ttl,
  jenis_kelamin,
  golongan_darah,
  alamat,
  rtRw,
  kel_desa,
  kecamatan,
  agama,
  status,
  pekerjaan,
  kewarganegaraan,
  masa_berlaku,
  terbuat,
  pas_photo
}) {
  try {
    await setupFonts();
    
    const canvas = createCanvas(720, 463);
    const ctx = canvas.getContext('2d');
    
    const [templateImg, pasPhotoImg] = await Promise.all([
      loadImage('https://api.nekolabs.web.id/f/template.png'),
      loadImage(pas_photo, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }).catch(() => {
        throw new Error('Failed to load pas_photo. URL might be invalid or blocked.');
      })
    ]);
    
    const drawTextLeft = (x, y, text, font, size) => {
      ctx.font = `${size}px ${font}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x, y);
    };
    
    const drawTextCenter = (x, y, text, font, size) => {
      ctx.font = `${size}px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x, y);
    };
    
    const upper = (s) => s.toUpperCase();
    
    ctx.drawImage(templateImg, 0, 0, 720, 463);
    
    const PHOTO_X = 520;
    const PHOTO_Y = 80;
    const PHOTO_W = 200;
    const PHOTO_H = 280;
    
    const frameAspect = PHOTO_W / PHOTO_H;
    const imgAspect = pasPhotoImg.width / pasPhotoImg.height;
    
    let srcX, srcY, srcW, srcH;
    
    if (imgAspect > frameAspect) {
      srcH = pasPhotoImg.height;
      srcW = srcH * frameAspect;
      srcX = (pasPhotoImg.width - srcW) / 2;
      srcY = 0;
    } else {
      srcW = pasPhotoImg.width;
      srcH = srcW / frameAspect;
      srcX = 0;
      srcY = (pasPhotoImg.height - srcH) / 2;
    }
    
    const baseScale = Math.min(PHOTO_W / srcW, PHOTO_H / srcH);
    const SHRINK = 0.78;
    const scale = baseScale * SHRINK;
    
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    
    const offsetLeft = -15;
    const drawX = PHOTO_X + (PHOTO_W - drawW) / 2 + offsetLeft;
    const drawY = PHOTO_Y + (PHOTO_H - drawH) / 2;
    
    ctx.drawImage(pasPhotoImg, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);
    
    drawTextCenter(380, 45, `PROVINSI ${upper(provinsi)}`, 'ArrialKTP', 25);
    drawTextCenter(380, 70, `KOTA ${upper(kota)}`, 'ArrialKTP', 25);
    
    ctx.font = '32px OcrKTP';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(nik, 170, 105);
    
    drawTextLeft(190, 145, upper(nama), 'ArrialKTP', 16);
    drawTextLeft(190, 168, upper(ttl), 'ArrialKTP', 16);
    drawTextLeft(190, 191, upper(jenis_kelamin), 'ArrialKTP', 16);
    drawTextLeft(463, 190, upper(golongan_darah), 'ArrialKTP', 16);
    drawTextLeft(190, 212, upper(alamat), 'ArrialKTP', 16);
    drawTextLeft(190, 234, upper(rtRw), 'ArrialKTP', 16);
    drawTextLeft(190, 257, upper(kel_desa), 'ArrialKTP', 16);
    drawTextLeft(190, 279, upper(kecamatan), 'ArrialKTP', 16);
    drawTextLeft(190, 300, upper(agama), 'ArrialKTP', 16);
    drawTextLeft(190, 323, upper(status), 'ArrialKTP', 16);
    drawTextLeft(190, 346, upper(pekerjaan), 'ArrialKTP', 16);
    drawTextLeft(190, 369, upper(kewarganegaraan), 'ArrialKTP', 16);
    drawTextLeft(190, 390, upper(masa_berlaku), 'ArrialKTP', 16);
    
    drawTextLeft(553, 345, `KOTA ${upper(kota)}`, 'ArrialKTP', 12);
    drawTextLeft(570, 365, terbuat, 'ArrialKTP', 12);
    
    const sign = nama.split(' ')[0] || nama;
    ctx.font = '40px SignKTP';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(sign, 540, 395);
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    throw new Error(`KTP generation failed: ${error.message}`);
  }
}

// Validasi input
function validateKTPInput(data) {
  const requiredFields = [
    'nama', 'provinsi', 'kota', 'nik', 'ttl', 'jenis_kelamin',
    'alamat', 'rtRw', 'kel_desa', 'kecamatan', 'agama', 'status',
    'pekerjaan', 'kewarganegaraan', 'masa_berlaku', 'terbuat', 'pas_photo'
  ];
  
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  if (!/^\d{16}$/.test(data.nik)) {
    throw new Error('NIK must be 16 digits');
  }
  
  if (!/^(http|https):\/\//.test(data.pas_photo)) {
    throw new Error('pas_photo must be a valid URL');
  }
}

export default (app) => {
  // Setup response time tracking
  app.use("/v1/tools/ktpgen", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/ktpgen", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  async function handleKTPGen(req, res, version = 'v1') {
    try {
      const data = req.method === 'GET' ? req.query : req.body;
      
      // Validasi input
      try {
        validateKTPInput(data);
      } catch (validationError) {
        return sendResponse(req, res, 400, {
          error: validationError.message,
          usage: {
            example: {
              nama: "JOHN DOE",
              provinsi: "DKI JAKARTA",
              kota: "JAKARTA SELATAN",
              nik: "3174012345678901",
              ttl: "JAKARTA, 01-01-1990",
              jenis_kelamin: "LAKI-LAKI",
              golongan_darah: "O",
              alamat: "JL. SUDIRMAN NO. 123",
              rtRw: "001/002",
              kel_desa: "KEBAYORAN BARU",
              kecamatan: "KEBAYORAN BARU",
              agama: "ISLAM",
              status: "BELUM KAWIN",
              pekerjaan: "KARYAWAN SWASTA",
              kewarganegaraan: "WNI",
              masa_berlaku: "SEUMUR HIDUP",
              terbuat: "01-01-2020",
              pas_photo: "https://example.com/photo.jpg"
            },
            note: "All fields except golongan_darah are required. NIK must be 16 digits."
          }
        }, version);
      }
      
      const buffer = await ktpgen({
        nama: data.nama,
        provinsi: data.provinsi,
        kota: data.kota,
        nik: data.nik,
        ttl: data.ttl,
        jenis_kelamin: data.jenis_kelamin,
        golongan_darah: data.golongan_darah || '-',
        alamat: data.alamat,
        rtRw: data.rtRw,
        kel_desa: data.kel_desa,
        kecamatan: data.kecamatan,
        agama: data.agama,
        status: data.status,
        pekerjaan: data.pekerjaan,
        kewarganegaraan: data.kewarganegaraan,
        masa_berlaku: data.masa_berlaku,
        terbuat: data.terbuat,
        pas_photo: data.pas_photo
      });
      
      // Convert buffer to base64
      const base64Image = buffer.toString('base64');
      
      return sendResponse(req, res, 200, {
        result: {
          message: "KTP generated successfully",
          format: "PNG",
          dimensions: "720x463",
          image: `data:image/png;base64,${base64Image}`,
          downloadUrl: `/api/${version}/tools/ktpgen/download/${Buffer.from(data.nik).toString('base64')}`,
          timestamp: new Date().toISOString(),
          data: {
            nama: data.nama,
            provinsi: data.provinsi,
            kota: data.kota,
            nik: data.nik,
            // Tidak mengembalikan semua data sensitif
          }
        }
      }, version);

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message
      }, version);
    }
  }

  // Download endpoint untuk file langsung
  app.get("/v1/tools/ktpgen/download/:id", createApiKeyMiddleware(), async (req, res) => {
    try {
      // Ini contoh sederhana, implementasi nyata perlu menyimpan buffer
      res.status(404).json({
        status: false,
        message: "Download endpoint requires generation first"
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  });

  // API Endpoints dengan API Key Middleware
  app.get("/v1/tools/ktpgen", createApiKeyMiddleware(), (req, res) => handleKTPGen(req, res, 'v1'));
  app.post("/v1/tools/ktpgen", createApiKeyMiddleware(), (req, res) => handleKTPGen(req, res, 'v1'));
  
  app.get("/v2/tools/ktpgen", createApiKeyMiddleware(), (req, res) => handleKTPGen(req, res, 'v2'));
  app.post("/v2/tools/ktpgen", createApiKeyMiddleware(), (req, res) => handleKTPGen(req, res, 'v2'));
};
