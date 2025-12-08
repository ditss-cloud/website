import { generateText } from "ai";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default (app) => {
  app.get("/v1/ai/chat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { prompt, model = "anthropic/claude-sonnet-4.5" } = req.query;
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const { text } = await generateText({
        model: model,
        prompt: prompt,
        maxTokens: 1000
      });
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          response: text,
          prompt: prompt,
          model: model,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  app.post("/v2/ai/chat", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { prompt, model = "anthropic/claude-sonnet-4.5" } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const { text } = await generateText({
        model: model,
        prompt: prompt,
        maxTokens: 1000
      });
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          response: text,
          prompt: prompt,
          model: model,
          timestamp: new Date().toISOString(),
          version: "v2"
        }
      });
      
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });
};
