import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiKeyMiddleware } from '../../middleware/apikey.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_DIR = path.join(__dirname, '../../database/Json');

const GAME_FILES = {
  asahotak: 'asahotak.json',
  caklontong: 'caklontong.json',
  family100: 'family100.json',
  siapakahaku: 'siapakahaku.json',
  susunkata: 'susunkata.json',
  tebakbendera: 'tebakbendera.json',
  tebakanime: 'tebakanime.json',
  tebakgambar: 'tebakgambar.json',
  tebakgame: 'tebakgame.json',
  tebakkalimat: 'tebakkalimat.json',
  tebakkata: 'tebakkata.json',
  tebakkimia: 'tebakkimia.json',
  tebaklagu: 'tebaklagu.json',
  tebaklirik: 'tebaklirik.json',
  tebaktebakan: 'tebaktebakan.json',
  tekateki: 'tekateki.json'
};

function loadJsonData(filename) {
  try {
    const filePath = path.join(JSON_DIR, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} tidak ditemukan di ${filePath}`);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    throw new Error(`Gagal memuat data dari ${filename}: ${error.message}`);
  }
}

function getRandomGameData(filename, customFormatter = null, count = 1) {
  try {
    const list = loadJsonData(filename);
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('Data tidak valid atau kosong');
    }
    
    if (count === 1) {
      const data = list[Math.floor(Math.random() * list.length)];
      return customFormatter ? customFormatter(data) : data;
    }
    
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, list.length));
    
    return customFormatter ? selected.map(customFormatter) : selected;
  } catch (error) {
    throw error;
  }
}

const gameFormatters = {
  asahotak: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban,
    index: data.index
  }),
  caklontong: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban,
    index: data.index,
    deskripsi: data.deskripsi
  }),
  family100: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban,
    jumlahJawaban: data.jawaban?.length || 0
  }),
  siapakahaku: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban,
    index: data.index
  }),
  susunkata: (data) => ({
    soal: data.soal,
    tipe: data.tipe,
    jawaban: data.jawaban,
    index: data.index
  }),
  tebakbendera: (data) => ({
    flag: data.flag,
    img: data.img,
    name: data.name
  }),
  tebakanime: (data) => ({
    jawaban: data.jawaban,
    image: data.image,
    deskripsi: data.desc,
    link: data.url
  }),
  tebakgambar: (data) => ({
    index: data.index,
    img: data.img,
    jawaban: data.jawaban,
    deskripsi: data.deskripsi
  }),
  tebakgame: (data) => ({
    img: data.img,
    jawaban: data.jawaban
  }),
  tebakkalimat: (data) => ({
    index: data.index,
    soal: data.soal,
    jawaban: data.jawaban?.trim() || ''
  }),
  tebakkata: (data) => ({
    index: data.index,
    soal: data.soal,
    jawaban: data.jawaban
  }),
  tebakkimia: (data) => ({
    unsur: data.unsur,
    lambang: data.lambang
  }),
  tebaklagu: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban,
    artis: data.artis
  }),
  tebaklirik: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban
  }),
  tebaktebakan: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban
  }),
  tekateki: (data) => ({
    soal: data.soal,
    jawaban: data.jawaban
  })
};

const gameMessages = {
  asahotak: 'Soal berhasil diambil',
  caklontong: 'Soal Cak Lontong berhasil diambil',
  family100: 'Soal Family 100 berhasil diambil',
  siapakahaku: 'Soal "Siapakah Aku" berhasil diambil',
  susunkata: 'Soal Susun Kata berhasil diambil',
  tebakbendera: 'Tebak Bendera berhasil diambil',
  tebakanime: 'Tebak Karakter Anime berhasil diambil',
  tebakgambar: 'Soal Tebak Gambar berhasil diambil',
  tebakgame: 'Soal Tebak Game berhasil diambil',
  tebakkalimat: 'Soal Tebak Kalimat berhasil diambil',
  tebakkata: 'Soal Tebak Kata berhasil diambil',
  tebakkimia: 'Soal Tebak Unsur Kimia berhasil diambil',
  tebaklagu: 'Soal Tebak Lagu berhasil diambil',
  tebaklirik: 'Soal Tebak Lirik berhasil diambil',
  tebaktebakan: 'Soal Tebak-Tebakan berhasil diambil',
  tekateki: 'Soal Teka-Teki berhasil diambil'
};

export default function (app) {
  Object.keys(GAME_FILES).forEach(game => {
    app.get(`/v1/game/${game}`, createApiKeyMiddleware(), async (req, res) => {
      try {
        const count = parseInt(req.query.count) || 1;
        const data = await getRandomGameData(GAME_FILES[game], gameFormatters[game], count);
        
        res.json({
          status: true,
          message: gameMessages[game],
          count: Array.isArray(data) ? data.length : 1,
          result: data
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: `Gagal mengambil soal ${gameMessages[game].split(' ').slice(1).join(' ')}`,
          error: error.message
        });
      }
    });

    app.post(`/v1/game/${game}`, createApiKeyMiddleware(), async (req, res) => {
      try {
        const { count = 1 } = req.body;
        const dataCount = parseInt(count) || 1;
        const MAX_COUNT = 50;
        const finalCount = Math.min(dataCount, MAX_COUNT);
        
        const data = await getRandomGameData(GAME_FILES[game], gameFormatters[game], finalCount);
        
        res.json({
          status: true,
          message: gameMessages[game],
          requested: dataCount,
          count: Array.isArray(data) ? data.length : 1,
          result: data
        });
      } catch (error) {
        res.status(500).json({
          status: false,
          message: `Gagal mengambil soal ${gameMessages[game].split(' ').slice(1).join(' ')}`,
          error: error.message
        });
      }
    });
  });

  app.get('/v1/games/list', createApiKeyMiddleware(), (req, res) => {
    try {
      const gamesList = Object.keys(GAME_FILES).map(game => ({
        name: game,
        endpoint: `/v1/game/${game}`,
        methods: ['GET', 'POST'],
        description: gameMessages[game].replace(' berhasil diambil', '')
      }));

      res.json({
        status: true,
        message: 'Daftar game berhasil diambil',
        count: gamesList.length,
        games: gamesList
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal mengambil daftar game',
        error: error.message
      });
    }
  });

  app.post('/v1/games/batch', createApiKeyMiddleware(), async (req, res) => {
    try {
      const { games, count = 1 } = req.body;
      
      if (!games || !Array.isArray(games) || games.length === 0) {
        return res.status(400).json({
          status: false,
          message: 'Parameter games harus berupa array yang tidak kosong'
        });
      }

      const results = {};
      const errors = [];

      for (const game of games) {
        if (GAME_FILES[game]) {
          try {
            const dataCount = parseInt(count) || 1;
            const finalCount = Math.min(dataCount, 10);
            results[game] = await getRandomGameData(
              GAME_FILES[game], 
              gameFormatters[game], 
              finalCount
            );
          } catch (error) {
            errors.push({
              game: game,
              error: error.message
            });
          }
        } else {
          errors.push({
            game: game,
            error: 'Game tidak ditemukan'
          });
        }
      }

      res.json({
        status: true,
        message: 'Batch request berhasil diproses',
        requested: games.length,
        success: Object.keys(results).length,
        failed: errors.length,
        results: results,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal memproses batch request',
        error: error.message
      });
    }
  });
    }
