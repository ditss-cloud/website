import { getRandomUA } from "../../../src/utils/userAgen.js";
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function aidetector(text) {
  if (!text) throw new Error('Text is required.');
  
  const { data: a } = await axios.post('https://undetectable.ai/detector-humanizer', [text, 'l6_v6', false], {
    headers: {
      'next-action': '8b888df218472b367d6709b65423720937e55d44',
      'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22locale%22%2C%22en%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22(pages-with-loader)%22%2C%7B%22children%22%3A%5B%22detector-humanizer%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fdetector-humanizer%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%5D%2Cnull%2Cnull%2Ctrue%5D',
      origin: 'https://undetectable.ai',
      referer: 'https://undetectable.ai/detector-humanizer',
      'user-agent': getRandomUA(),
      'x-deployment-id': 'dpl_5AoF5tkK5GdFjjV23UefgnT3Bd4W'
    }
  });
  
  const id = a.match(/"id":"([^"]+)"/)?.[1];
  if (!id) throw new Error('ID not found.');
  
  const { data } = await axios.post('https://sea-lion-app-3p5x4.ondigitalocean.app/query', {
    id: id
  }, {
    origin: 'https://undetectable.ai',
    referer: 'https://undetectable.ai/',
    'user-agent': getRandomUA()
  });
  
  return data;
}

export default (app) => {
  app.get("/v1/ai/detector", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text } = req.query;
      
      if (!text) {
        return res.json({
          status: false,
          error: "Parameter 'text' is required"
        });
      }
      
      const result = await aidetector(text);
      
      res.json({
        status: true,
        result: result
      });
      
    } catch (error) {
      console.error("AI Detector Error:", error);
      res.json({
        status: false,
        error: error.message
      });
    }
  });

  app.post("/v2/ai/detector", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.json({
          status: false,
          error: "Parameter 'text' is required"
        });
      }
      
      const result = await aidetector(text);
      
      res.json({
        status: true,
        result: result
      });
      
    } catch (error) {
      console.error("AI Detector Error:", error);
      res.json({
        status: false,
        error: error.message
      });
    }
  });
};
