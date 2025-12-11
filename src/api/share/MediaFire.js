import axios from 'axios';
import cheerio from 'cheerio';

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function mfsearch(query) {
    try {
        if (!query) throw new Error('Query is required.');
        
        const { data: html } = await axios.get(`https://api.nekolabs.web.id/px?url=${encodeURIComponent(`https://mediafiretrend.com/?q=${encodeURIComponent(query)}&search=Search`)}`);
        const $ = cheerio.load(html.result.content);
        
        const links = shuffle(
            $('tbody tr a[href*="/f/"]').map((_, el) => $(el).attr('href')).get()
        ).slice(0, 5);
        
        const result = await Promise.all(links.map(async link => {
            const { data } = await axios.get(`https://api.nekolabs.web.id/px?url=${encodeURIComponent(`https://mediafiretrend.com${link}`)}`);
            const $ = cheerio.load(data.result.content);
            
            const raw = $('div.info tbody tr:nth-child(4) td:nth-child(2) script').text();
            const match = raw.match(/unescape\(['"`]([^'"`]+)['"`]\)/);
            const decoded = cheerio.load(decodeURIComponent(match[1]));
            
            return {
                filename: $('tr:nth-child(2) td:nth-child(2) b').text().trim(),
                filesize: $('tr:nth-child(3) td:nth-child(2)').text().trim(),
                url: decoded('a').attr('href'),
                source_url: $('tr:nth-child(5) td:nth-child(2)').text().trim(),
                source_title: $('tr:nth-child(6) td:nth-child(2)').text().trim()
            };
        }));
        
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

// Tambahkan ke file API kamu (gabungkan dengan export default yang sudah ada)
export default (app) => {
    // ... kode endpoint BRAT yang sudah ada ...
    
    // Endpoint MediaFire Search
    app.get('/v1/search/mediafire', createApiKeyMiddleware(), async (req, res) => {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({ 
                    status: false, 
                    error: 'Search query (q) is required.' 
                });
            }
            const results = await mfsearch(query);
            res.json({
                status: true,
                query: query,
                count: results.length,
                results: results
            });
        } catch (error) {
            console.error('[MediaFire Search Error]', error.message);
            res.status(500).json({ 
                status: false, 
                error: error.message || 'Failed to search MediaFire.' 
            });
        }
    });

    app.post('/v2/search/mediafire', createApiKeyMiddleware(), async (req, res) => {
        try {
            const query = req.body.q;
            if (!query) {
                return res.status(400).json({ 
                    status: false, 
                    error: 'Search query (q) is required.' 
                });
            }
            const results = await mfsearch(query);
            res.json({
                status: true,
                query: query,
                count: results.length,
                results: results
            });
        } catch (error) {
            console.error('[MediaFire Search Error]', error.message);
            res.status(500).json({ 
                status: false, 
                error: error.message || 'Failed to search MediaFire.' 
            });
        }
    });
};
