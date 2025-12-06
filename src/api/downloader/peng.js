import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

export default (app) => {
  async function handleHitamkan(req, res) {
    const { url, filter } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter url tidak ditemukan",
      });
    }

    try {
      // Ambil gambar dari URL sebagai buffer
      const imgRes = await axios.get(url, { responseType: "arraybuffer" });
      const base64Input = Buffer.from(imgRes.data).toString("base64");

      // Kirim ke API wpw.my.id
      const result = await axios.post(
        "https://wpw.my.id/api/process-image",
        {
          imageData: base64Input,
          filter: (filter || "hitam").toLowerCase(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Origin: "https://wpw.my.id",
            Referer: "https://wpw.my.id/",
          },
          timeout: 90000,
        }
      );

      const dataUrl = result.data?.processedImageUrl;
      if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        return res.status(500).json({
          status: false,
          message: "Gagal memproses gambar (data kosong)",
        });
      }

      const base64Output = dataUrl.split(",")[1];
      const finalBuffer = Buffer.from(base64Output, "base64");

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": finalBuffer.length,
      });
      res.end(finalBuffer);
    } catch (err) {
      console.error("[Hitamkan Error]:", err?.response?.data || err.message);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat memproses gambar",
        error: err?.response?.data || err.message,
      });
    }
  }

  // Daftarkan endpoint dengan prefix /api/maker/
  app.get("/api/maker/hitamkan", createApiKeyMiddleware(), handleHitamkan);
  app.post("/api/maker/hitamkan", createApiKeyMiddleware(), handleHitamkan);
};
