import axios from "axios";
import { getRandomUA } from "../../../src/utils/userAgen.js";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

const srv = {
  us: Array.from({ length: 20 }, (_, x) => "https://us" + (x + 1) + ".proxysite.com"),
  eu: Array.from({ length: 20 }, (_, x) => "https://eu" + (x + 1) + ".proxysite.com")
};

function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`;
}

function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime;
  const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}`;

  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: version,
    creator: "DitssGanteng",
    requestId: requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  };

  res.status(statusCode).json(response);
}

function randomRegion() {
  const r = ["us", "eu"];
  return r[Math.floor(Math.random() * r.length)];
}

function randomServer() {
  return Math.floor(Math.random() * 20) + 1;
}

async function fetchViaProxy(url, region = "us", srvNum = 1) {
  const ix = srvNum - 1;
  const host = srv[region][ix];
  const post = host + "/includes/process.php?action=update";

  const body = new URLSearchParams({
    "server-option": region + srvNum,
    d: url,
    allowCookies: "on"
  });

  const r1 = await axios.post(post, body.toString(), {
    maxRedirects: 0,
    validateStatus: s => true,
    headers: {
      "User-Agent": getRandomUA(),
      "Content-Type": "application/x-www-form-urlencoded",
      "Origin": "https://www.proxysite.com",
      "Referer": "https://www.proxysite.com/"
    }
  });

  let loc = r1.headers.location;
  if (!loc) throw new Error("redirect_missing");
  if (!loc.startsWith("http")) loc = host + loc;

  const r2 = await axios.get(loc, {
    headers: {
      "User-Agent": getRandomUA(),
      "Referer": "https://www.proxysite.com/"
    }
  });

  return r2.data;
}

export default (app) => {
  app.use("/v1/tools/proxyfetch", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  app.use("/v2/tools/proxyfetch", (req, res, next) => {
    req.startTime = Date.now();
    next();
  });

  async function handleProxyFetch(req, res, version = 'v1') {
    try {
      let { url, region, server } = req.query;

      if (!url) {
        return sendResponse(req, res, 400, {
          error: "Parameter 'url' wajib diisi"
        }, version);
      }

      if (!region) region = randomRegion();
      if (!server) server = randomServer();

      const data = await fetchViaProxy(url, region, Number(server));

      return sendResponse(req, res, 200, {
        region,
        server,
        result: data
      }, version);

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message
      }, version);
    }
  }

  app.get("/v1/tools/proxyfetch", createApiKeyMiddleware(), (req, res) => handleProxyFetch(req, res, 'v1'));
  app.post("/v1/tools/proxyfetch", createApiKeyMiddleware(), (req, res) => handleProxyFetch(req, res, 'v1'));
  
  app.get("/v2/tools/proxyfetch", createApiKeyMiddleware(), (req, res) => handleProxyFetch(req, res, 'v2'));
  app.post("/v2/tools/proxyfetch", createApiKeyMiddleware(), (req, res) => handleProxyFetch(req, res, 'v2'));
};
