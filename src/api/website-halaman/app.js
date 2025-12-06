import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageDir = path.join(__dirname, "../../..", "page");

app.use(express.static(pageDir));

app.get("/admin/dashboard", createApiKeyMiddleware(), (req, res) => {
  res.sendFile(path.join(pageDir, "dashboard.html"));
});

app.get("/admin/logs", createApiKeyMiddleware(), (req, res) => {
  res.sendFile(path.join(pageDir, "logs.html"));
});

app.get("/", (req, res) => {
  res.send("Website Halaman Online");
});

app.use((req, res) => {
  res.status(404).json({
    status: false,
    error: "Page not found",
    path: req.originalUrl
  });
});

export default app;
