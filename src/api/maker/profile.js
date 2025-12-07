import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Handler function
async function handleWhatsappProfile(req, res, version = 'v1') {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({
      status: false,
      version,
      creator: "Asuma API",
      error: "Parameter phone wajib diisi"
    });
  }

  // Validasi nomor
  const cleanPhone = phone.toString().replace(/\D/g, '');
  
  if (!cleanPhone || cleanPhone.length < 8) {
    return res.status(400).json({
      status: false,
      version,
      creator: "Asuma API",
      error: "Nomor telepon tidak valid"
    });
  }

  try {
    const startTime = Date.now();
    
    const { data } = await axios.get('https://wa-api.b-cdn.net/wa-dp/', {
      headers: {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'origin': 'https://snaplytics.io',
        'referer': 'https://snaplytics.io/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
      },
      params: {
        phone: cleanPhone
      },
      timeout: 10000
    });

    const responseTime = Date.now() - startTime;

    // Format response
    const response = {
      status: true,
      version,
      creator: "Asuma API",
      requestId: `asuma-${Date.now()}`,
      responseTime: `${responseTime}ms`,
      result: {
        phone: cleanPhone,
        ...data,
        note: data.url ? "Profile picture found" : "No profile picture found"
      }
    };

    return res.json(response);

  } catch (error) {
    return res.status(500).json({
      status: false,
      version,
      creator: "Asuma API",
      error: error.message || "Terjadi kesalahan saat mengambil data",
      note: "Pastikan nomor WhatsApp terdaftar dan publik"
    });
  }
}

// Export sebagai module
export default function (app) {
  // Versi 1
  app.get('/v1/whatsapp/profile', createApiKeyMiddleware(), (req, res) => 
    handleWhatsappProfile(req, res, 'v1')
  );

  app.post('/v1/whatsapp/profile', createApiKeyMiddleware(), (req, res) => 
    handleWhatsappProfile(req, res, 'v1')
  );

  // Versi 2 (kalau mau ada perbedaan)
  app.get('/v2/whatsapp/profile', createApiKeyMiddleware(), (req, res) => 
    handleWhatsappProfile(req, res, 'v2')
  );

  // Alternatif nama endpoint (short version)
  app.get('/v1/wa/profile', createApiKeyMiddleware(), (req, res) => 
    handleWhatsappProfile(req, res, 'v1')
  );

  // Untuk backward compatibility
  app.get('/whatsapp/profile', createApiKeyMiddleware(), (req, res) => 
    handleWhatsappProfile(req, res, 'v1')
  );
}
