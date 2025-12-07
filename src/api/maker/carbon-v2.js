import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function CarbonifyAxios(code, theme = "Monokai") {
  const res = await axios({
    url: "https://carbon-api.vercel.app/api",
    method: "POST",
    data: { code, theme },
    responseType: "arraybuffer",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return Buffer.from(res.data);
}

export default (app) => {

  // =========================
  //   V1 (GET)
  // =========================
  app.get("/v1/playground/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code, theme = "Monokai" } = req.query;

      if (!code) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: 'Parameter "code" is required'
        });
      }

      const buffer = await CarbonifyAxios(code, theme);

      res.set({
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="carbon_${Date.now()}.png"`
      });

      res.send(buffer);

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

  // =========================
  //      V2 (POST)
  // =========================
  app.post("/v2/playground/carbon", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { code, theme = "Monokai" } = req.body;

      if (!code) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: 'Parameter "code" is required'
        });
      }

      const buffer = await CarbonifyAxios(code, theme);

      res.set({
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="carbon_${Date.now()}.png"`
      });

      res.send(buffer);

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "DitssCloud",
        error: error.message
      });
    }
  });

};
