import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function generateCarbon(code, theme = 'One Dark') {
  const response = await axios.post('https://carbon-api.vercel.app/api', {
    code: code,
    theme: theme
  }, {
    responseType: 'arraybuffer'
  });
  
  return Buffer.from(response.data);
}

export default (app) => {
  app.get("/v1/maker/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code, theme = 'One Dark' } = req.query;
      
      if (!code) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "code" is required'
        });
      }
      
      const buffer = await generateCarbon(code, theme);
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="carbon_${Date.now()}.png"`
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  });

  app.post("/v2/maker/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code, theme = 'One Dark' } = req.body;
      
      if (!code) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "code" is required'
        });
      }
      
      const buffer = await generateCarbon(code, theme);
      
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="carbon_${Date.now()}.png"`
      });
      
      res.send(buffer);
      
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  });
};
