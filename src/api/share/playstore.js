import axios from "axios";
import * as cheerio from 'cheerio'
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function PlayStore(search) {
    try {
        const { data } = await axios.get(`https://play.google.com/store/search?q=${encodeURIComponent(search)}&c=apps`);
        const $ = cheerio.load(data);
        const hasil = [];

        $('.VfPpkd-EScbFb-JIbuQc').each((i, el) => {
            if (hasil.length >= 50) return;

            const linkEl = $(el).find('a').attr('href');
            const nama = $(el).find('.DdYX5').text();
            const developer = $(el).find('.wMUdtb').text();
            const ratingText = $(el).find('[role="img"]').attr('aria-label') || '';
            const ratingValue = $(el).find('.w2kbF').text();
            const img = $(el).find('img.T75of.sHb2Xb').attr('src') || $(el).find('img.T75of.sHb2Xb').attr('data-src');

            if (linkEl && nama) {
                hasil.push({
                    nama,
                    developer: developer || 'Unknown',
                    rate: ratingText || 'No rating',
                    rate_number: ratingValue || '-',
                    icon: img || 'https://files.catbox.moe/dklg5y.jpg',
                    link: `https://play.google.com${linkEl}`,
                    link_dev: developer ? `https://play.google.com/store/apps/developer?id=${encodeURIComponent(developer)}` : null
                });
            }
        });

        return hasil;
    } catch (err) {
        throw err;
    }
}

export default function (app) {
    app.get('/v1/search/playstore', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { q } = req.query;
            if (!q) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Search query is required',
                    error: 'Missing "q" parameter in query string'
                });
            }

            const result = await PlayStore(q);

            if (result.length === 0) {
                return res.status(404).json({ 
                    status: false, 
                    message: 'No results found for the search query'
                });
            }

            res.status(200).json({
                status: true,
                message: 'Play Store search completed successfully',
                query: q,
                count: result.length,
                result: result
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to search Play Store',
                error: err.message 
            });
        }
    });

    app.post('/v1/search/playstore', createApiKeyMiddleware(), async (req, res) => {
        try {
            const { q } = req.body;
            if (!q) {
                return res.status(400).json({ 
                    status: false, 
                    message: 'Search query is required',
                    error: 'Missing "q" field in request body'
                });
            }

            const result = await PlayStore(q);

            if (result.length === 0) {
                return res.status(404).json({ 
                    status: false, 
                    message: 'No results found for the search query'
                });
            }

            res.status(200).json({
                status: true,
                message: 'Play Store search completed successfully',
                query: q,
                count: result.length,
                result: result
            });
        } catch (err) {
            res.status(500).json({ 
                status: false, 
                message: 'Failed to search Play Store',
                error: err.message 
            });
        }
    });
    }
