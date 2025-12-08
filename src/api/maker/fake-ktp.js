import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

let fontsLoaded = false;

async function setupFonts() {
  if (fontsLoaded) return;
  
  try {
    const [arrialResponse, ocrResponse, signResponse] = await Promise.all([
      axios.get('https://cdn.asuma.my.id/upload/tbzu.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://cdn.asuma.my.id/upload/3kamag6t.ttf', { responseType: 'arraybuffer' }),
      axios.get('https://cdn.asuma.my.id/upload/slgwacq.otf', { responseType: 'arraybuffer' })
    ]);
    
    GlobalFonts.register(Buffer.from(arrialResponse.data), 'ArrialKTP');
    GlobalFonts.register(Buffer.from(ocrResponse.data), 'OcrKTP');
    GlobalFonts.register(Buffer.from(signResponse.data), 'SignKTP');
    
    fontsLoaded = true;
  } catch (error) {
    throw new Error(`Font setup failed: ${error.message}`);
  }
}

async function ktpgen(params) {
  try {
    await setupFonts();
    
    const canvas = createCanvas(720, 463);
    const ctx = canvas.getContext('2d');
    
    const [templateImg, pasPhotoImg] = await Promise.all([
      loadImage('https://cdn.asuma.my.id/upload/bh6ax.png'),
      loadImage(params.pas_photo)
    ]);
    
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
    const scale = baseScale * 0.78;
    
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const drawX = PHOTO_X + (PHOTO_W - drawW) / 2 - 15;
    const drawY = PHOTO_Y + (PHOTO_H - drawH) / 2;
    
    ctx.drawImage(pasPhotoImg, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);
    
    const upper = (s) => s.toUpperCase();
    
    ctx.font = '25px ArrialKTP';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`PROVINSI ${upper(params.provinsi)}`, 380, 45);
    ctx.fillText(`KOTA ${upper(params.kota)}`, 380, 70);
    
    ctx.font = '32px OcrKTP';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(params.nik, 170, 105);
    
    ctx.font = '16px ArrialKTP';
    ctx.fillText(upper(params.nama), 190, 147); //145
    ctx.fillText(upper(params.ttl), 190, 168);
    ctx.fillText(upper(params.jenis_kelamin), 190, 191);
    ctx.fillText(upper(params.golongan_darah || '-'), 463, 190);
    ctx.fillText(upper(params.alamat), 190, 212);
    ctx.fillText(upper(params.rtRw), 190, 234);
    ctx.fillText(upper(params.kel_desa), 190, 257);
    ctx.fillText(upper(params.kecamatan), 190, 279);
    ctx.fillText(upper(params.agama), 190, 300);
    ctx.fillText(upper(params.status), 190, 323);
    ctx.fillText(upper(params.pekerjaan), 190, 346);
    ctx.fillText(upper(params.kewarganegaraan), 190, 369);
    ctx.fillText(upper(params.masa_berlaku), 190, 390);
    
    ctx.font = '12px ArrialKTP';
    ctx.fillText(`KOTA ${upper(params.kota)}`, 553, 345);
    ctx.fillText(params.terbuat, 570, 365);
    
    const sign = (params.nama.split(' ')[0] || params.nama).toUpperCase();
    ctx.font = '40px SignKTP';
    ctx.fillText(sign, 540, 395);
    
    return canvas.toBuffer('image/png');
  } catch (error) {
    throw new Error(`KTP generation failed: ${error.message}`);
  }
}

function validateKTPInput(data) {
  const required = ['nama', 'provinsi', 'kota', 'nik', 'ttl', 'jenis_kelamin', 'alamat', 'rtRw', 'kel_desa', 'kecamatan', 'agama', 'status', 'pekerjaan', 'kewarganegaraan', 'masa_berlaku', 'terbuat', 'pas_photo'];
  const missing = required.filter(field => !data[field]);
  if (missing.length) throw new Error(`Missing fields: ${missing.join(', ')}`);
  if (!/^\d{16}$/.test(data.nik)) throw new Error('NIK must be 16 digits');
  if (!/^(http|https):\/\//.test(data.pas_photo)) throw new Error('pas_photo must be valid URL');
}

function sendError(res, error, status = 400) {
  res.status(status).json({
    status: false,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
}

function setImageHeaders(res, nik) {
  const filename = `KTP_${nik}_${Date.now()}.png`;
  res.set({
    'Content-Type': 'image/png',
    'Content-Disposition': `inline; filename="${filename}"`,
    'Cache-Control': 'public, max-age=3600',
    'X-Powered-By': 'DitssGanteng API'
  });
}

async function handleRequest(req, res, data) {
  try {
    validateKTPInput(data);
    
    const buffer = await ktpgen({
      nama: data.nama,
      provinsi: data.provinsi,
      kota: data.kota,
      nik: data.nik,
      ttl: data.ttl,
      jenis_kelamin: data.jenis_kelamin,
      golongan_darah: data.golongan_darah,
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
    
    setImageHeaders(res, data.nik);
    res.send(buffer);
  } catch (error) {
    sendError(res, error, 500);
  }
}

export default (app) => {
  app.get("/v1/maker/fake-ktp", createApiKeyMiddleware(), (req, res) => {
    handleRequest(req, res, req.query);
  }); 

  app.post("/v2/maker/fake-ktp", createApiKeyMiddleware(), (req, res) => {
    handleRequest(req, res, req.body);
  });

  app.get("/v1/maker/fake-ktp/help", (req, res) => {
    res.json({
      status: true,
      endpoints: {
        "GET /v1/tools/ktpgen": "Generate KTP via query params",
        "POST /v2/tools/ktpgen": "Generate KTP via JSON body"
      },
      parameters: {
        required: ['nama', 'provinsi', 'kota', 'nik', 'ttl', 'jenis_kelamin', 'alamat', 'rtRw', 'kel_desa', 'kecamatan', 'agama', 'status', 'pekerjaan', 'kewarganegaraan', 'masa_berlaku', 'terbuat', 'pas_photo'],
        optional: ['golongan_darah'],
        notes: ['NIK must be 16 digits', 'All text auto-uppercase']
      }
    });
  });
};
/*import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

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
    console.log('Loading KTP fonts...');
    
    const [arrialResponse, ocrResponse, signResponse] = await Promise.all([
      axios.get('https://api.nekolabs.web.id/f/arrial.ttf', { 
        responseType: 'arraybuffer',
        timeout: 10000 
      }),
      axios.get('https://api.nekolabs.web.id/f/ocr.ttf', { 
        responseType: 'arraybuffer',
        timeout: 10000 
      }),
      axios.get('https://api.nekolabs.web.id/f/sign.otf', { 
        responseType: 'arraybuffer',
        timeout: 10000 
      })
    ]);
    
    fontCache.arrial = Buffer.from(arrialResponse.data);
    fontCache.ocr = Buffer.from(ocrResponse.data);
    fontCache.sign = Buffer.from(signResponse.data);
    
    GlobalFonts.register(fontCache.arrial, 'ArrialKTP');
    GlobalFonts.register(fontCache.ocr, 'OcrKTP');
    GlobalFonts.register(fontCache.sign, 'SignKTP');
    
    fontsLoaded = true;
    console.log('KTP fonts loaded successfully');
    
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
      loadImage('https://api.nekolabs.web.id/f/template.png', {
        timeout: 15000
      }).catch(() => {
        throw new Error('Failed to load template image');
      }),
      loadImage(pas_photo, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 20000
      }).catch((error) => {
        throw new Error(`Failed to load photo: ${error.message}`);
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
    
    // Draw template
    ctx.drawImage(templateImg, 0, 0, 720, 463);
    
    // Process and draw photo
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
    
    // Draw text fields
    drawTextCenter(380, 45, `PROVINSI ${upper(provinsi)}`, 'ArrialKTP', 25);
    drawTextCenter(380, 70, `KOTA ${upper(kota)}`, 'ArrialKTP', 25);
    
    // NIK
    ctx.font = '32px OcrKTP';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(nik, 170, 105);
    
    // Personal data
    drawTextLeft(190, 145, upper(nama), 'ArrialKTP', 16);
    drawTextLeft(190, 168, upper(ttl), 'ArrialKTP', 16);
    drawTextLeft(190, 191, upper(jenis_kelamin), 'ArrialKTP', 16);
    drawTextLeft(463, 190, upper(golongan_darah || '-'), 'ArrialKTP', 16);
    drawTextLeft(190, 212, upper(alamat), 'ArrialKTP', 16);
    drawTextLeft(190, 234, upper(rtRw), 'ArrialKTP', 16);
    drawTextLeft(190, 257, upper(kel_desa), 'ArrialKTP', 16);
    drawTextLeft(190, 279, upper(kecamatan), 'ArrialKTP', 16);
    drawTextLeft(190, 300, upper(agama), 'ArrialKTP', 16);
    drawTextLeft(190, 323, upper(status), 'ArrialKTP', 16);
    drawTextLeft(190, 346, upper(pekerjaan), 'ArrialKTP', 16);
    drawTextLeft(190, 369, upper(kewarganegaraan), 'ArrialKTP', 16);
    drawTextLeft(190, 390, upper(masa_berlaku), 'ArrialKTP', 16);
    
    // Footer
    drawTextLeft(553, 345, `KOTA ${upper(kota)}`, 'ArrialKTP', 12);
    drawTextLeft(570, 365, terbuat, 'ArrialKTP', 12);
    
    // Signature
    const sign = (nama.split(' ')[0] || nama).toUpperCase();
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

// Helper untuk error response sebagai JSON
function sendErrorResponse(res, errorMessage, statusCode = 400) {
  res.status(statusCode).json({
    status: false,
    version: 'v1',
    creator: "DitssGanteng",
    error: errorMessage,
    timestamp: new Date().toISOString()
  });
}

export default (app) => {
  // Endpoint utama dengan API Key middleware
  app.get("/v1/tools/ktpgen", createApiKeyMiddleware(), async (req, res) => {
    try {
      const data = req.query;
      
      // Validasi input
      try {
        validateKTPInput(data);
      } catch (validationError) {
        return sendErrorResponse(res, validationError.message, 400);
      }
      
      // Generate KTP image
      const buffer = await ktpgen({
        nama: data.nama,
        provinsi: data.provinsi,
        kota: data.kota,
        nik: data.nik,
        ttl: data.ttl,
        jenis_kelamin: data.jenis_kelamin,
        golongan_darah: data.golongan_darah,
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
      
      // Set headers untuk image response
      const filename = `KTP_${data.nik}_${Date.now()}.png`;
      const cacheTime = 3600; // 1 hour cache
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Cache-Control': `public, max-age=${cacheTime}, immutable`,
        'X-Powered-By': 'DitssGanteng API',
        'X-KTP-Info': JSON.stringify({
          nama: data.nama,
          nik: data.nik,
          kota: data.kota,
          timestamp: new Date().toISOString()
        })
      });
      
      // Send image buffer
      res.send(buffer);
      
    } catch (error) {
      console.error('KTP generation error:', error);
      sendErrorResponse(res, error.message, 500);
    }
  });

  // POST endpoint
  app.post("/v1/tools/ktpgen", createApiKeyMiddleware(), async (req, res) => {
    try {
      const data = req.body;
      
      // Validasi input
      try {
        validateKTPInput(data);
      } catch (validationError) {
        return sendErrorResponse(res, validationError.message, 400);
      }
      
      // Generate KTP image
      const buffer = await ktpgen({
        nama: data.nama,
        provinsi: data.provinsi,
        kota: data.kota,
        nik: data.nik,
        ttl: data.ttl,
        jenis_kelamin: data.jenis_kelamin,
        golongan_darah: data.golongan_darah,
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
      
      // Set headers untuk image response
      const filename = `KTP_${data.nik}_${Date.now()}.png`;
      const cacheTime = 3600;
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Cache-Control': `public, max-age=${cacheTime}, immutable`,
        'X-Powered-By': 'DitssGanteng API',
        'X-KTP-Info': JSON.stringify({
          nama: data.nama,
          nik: data.nik,
          kota: data.kota,
          timestamp: new Date().toISOString()
        })
      });
      
      // Send image buffer
      res.send(buffer);
      
    } catch (error) {
      console.error('KTP generation error:', error);
      sendErrorResponse(res, error.message, 500);
    }
  });

  // V2 endpoints (sama dengan v1, tapi dengan versi di header)
  app.get("/v2/tools/ktpgen", createApiKeyMiddleware(), async (req, res) => {
    try {
      const data = req.query;
      
      try {
        validateKTPInput(data);
      } catch (validationError) {
        return sendErrorResponse(res, validationError.message, 400);
      }
      
      const buffer = await ktpgen({
        nama: data.nama,
        provinsi: data.provinsi,
        kota: data.kota,
        nik: data.nik,
        ttl: data.ttl,
        jenis_kelamin: data.jenis_kelamin,
        golongan_darah: data.golongan_darah,
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
      
      const filename = `KTP_${data.nik}_${Date.now()}.png`;
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=3600',
        'X-Powered-By': 'DitssGanteng API v2',
        'X-KTP-Info': JSON.stringify({
          nama: data.nama,
          nik: data.nik,
          kota: data.kota,
          timestamp: new Date().toISOString(),
          version: 'v2'
        })
      });
      
      res.send(buffer);
      
    } catch (error) {
      console.error('KTP generation error:', error);
      sendErrorResponse(res, error.message, 500);
    }
  });

  app.post("/v2/tools/ktpgen", createApiKeyMiddleware(), async (req, res) => {
    try {
      const data = req.body;
      
      try {
        validateKTPInput(data);
      } catch (validationError) {
        return sendErrorResponse(res, validationError.message, 400);
      }
      
      const buffer = await ktpgen({
        nama: data.nama,
        provinsi: data.provinsi,
        kota: data.kota,
        nik: data.nik,
        ttl: data.ttl,
        jenis_kelamin: data.jenis_kelamin,
        golongan_darah: data.golongan_darah,
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
      
      const filename = `KTP_${data.nik}_${Date.now()}.png`;
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=3600',
        'X-Powered-By': 'DitssGanteng API v2',
        'X-KTP-Info': JSON.stringify({
          nama: data.nama,
          nik: data.nik,
          kota: data.kota,
          timestamp: new Date().toISOString(),
          version: 'v2'
        })
      });
      
      res.send(buffer);
      
    } catch (error) {
      console.error('KTP generation error:', error);
      sendErrorResponse(res, error.message, 500);
    }
  });

  // Help endpoint untuk dokumentasi
  app.get("/v1/tools/ktpgen/help", (req, res) => {
    res.json({
      status: true,
      version: 'v1',
      creator: "DitssGanteng",
      endpoints: {
        "GET /v1/tools/ktpgen": "Generate KTP from query parameters",
        "POST /v1/tools/ktpgen": "Generate KTP from JSON body",
        "GET /v2/tools/ktpgen": "v2 endpoint (same as v1)",
        "POST /v2/tools/ktpgen": "v2 endpoint (same as v1)"
      },
      parameters: {
        required: [
          "nama", "provinsi", "kota", "nik", "ttl", "jenis_kelamin",
          "alamat", "rtRw", "kel_desa", "kecamatan", "agama", "status",
          "pekerjaan", "kewarganegaraan", "masa_berlaku", "terbuat", "pas_photo"
        ],
        optional: ["golongan_darah"],
        notes: [
          "NIK must be 16 digits",
          "pas_photo must be a valid image URL",
          "All text will be converted to uppercase automatically"
        ]
      },
      example: {
        "curl": "curl -X GET 'https://api.example.com/v1/tools/ktpgen?nama=JOHN%20DOE&provinsi=DKI%20JAKARTA&kota=JAKARTA%20SELATAN&nik=3174012345678901&ttl=JAKARTA,01-01-1990&jenis_kelamin=LAKI-LAKI&alamat=JL.%20SUDIRMAN%20NO.%20123&rtRw=001/002&kel_desa=KEBAYORAN%20BARU&kecamatan=KEBAYORAN%20BARU&agama=ISLAM&status=BELUM%20KAWIN&pekerjaan=KARYAWAN%20SWASTA&kewarganegaraan=WNI&masa_berlaku=SEUMUR%20HIDUP&terbuat=01-01-2020&pas_photo=https://example.com/photo.jpg' -H 'x-api-key: YOUR_API_KEY' --output ktp.png",
        "javascript_fetch": `fetch('https://api.example.com/v1/tools/ktpgen', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    nama: "JOHN DOE",
    provinsi: "DKI JAKARTA",
    // ... other parameters
  })
})
.then(response => response.blob())
.then(blob => {
  const url = URL.createObjectURL(blob);
  const img = document.createElement('img');
  img.src = url;
  document.body.appendChild(img);
})`
      }
    });
  });
};

*/
