import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Helper: ambil buffer dari URL
async function getBuffer(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data);
}

export default (app) => {
  async function handleHitamkanV2(req, res) {
    const { url, filter } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter url tidak ditemukan",
      });
    }

    try {
      // Ambil gambar sebagai buffer
      const buffer = await getBuffer(url);

      // Kirim ke API negro.consulting
      const result = await axios.post(
        "https://negro.consulting/api/process-image",
        JSON.stringify({
          imageData: Buffer.from(buffer).toString("base64"),
          filter: filter || "coklat",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      if (result.data?.status === "success") {
        const base64Image = result.data.processedImageUrl.split(",")[1];
        const finalBuffer = Buffer.from(base64Image, "base64");

        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": finalBuffer.length,
        });
        res.end(finalBuffer);
      } else {
        return res.status(500).json({
          status: false,
          message: "Gagal memproses gambar",
        });
      }
    } catch (err) {
      console.error("[Hitamkan V2 Error]:", err?.response?.data || err.message);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat memproses gambar",
        error: err?.response?.data || err.message,
      });
    }
  }

  // Daftarkan endpoint
  app.get("/api/maker/hitamkan-v2", createApiKeyMiddleware(), handleHitamkanV2);
  app.post("/api/maker/hitamkan-v2", createApiKeyMiddleware(), handleHitamkanV2);
};
