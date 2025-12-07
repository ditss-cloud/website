import axios from "axios"
import fileType from "file-type"
import qs from "qs"
import { getRandomUA } from "../../../src/utils/userAgen.js"
import { createApiKeyMiddleware } from "../../middleware/apikey.js"

function formatResponseTime(ms) {
  return `${Math.round(ms)}ms`
}

function sendResponse(req, res, statusCode, data, version = 'v1') {
  const responseTime = Date.now() - req.startTime
  const requestId = req.headers['x-vercel-id'] || `asuma-${Date.now()}`

  const response = {
    status: statusCode === 200 || statusCode === 201,
    version: version,
    creator: "DitssGanteng",
    requestId: requestId,
    responseTime: formatResponseTime(responseTime),
    ...data
  }

  res.status(statusCode).json(response)
}

async function getBuffer(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" })
  return response.data
}

const tool = ["removebg", "enhance", "upscale", "restore", "colorize"]

const pxpic = {
  upload: async (buffer) => {
    const fileTypeResult = await fileType.fromBuffer(buffer)
    const { ext, mime } = fileTypeResult || {}
    const fileName = Date.now() + "." + ext
    const folder = "uploads"

    const responsej = await axios.post(
      "https://pxpic.com/getSignedUrl",
      { folder, fileName },
      { headers: { "Content-Type": "application/json" } }
    )

    const { presignedUrl } = responsej.data

    await axios.put(presignedUrl, buffer, {
      headers: { "Content-Type": mime },
    })

    const cdnDomain = "https://files.fotoenhancer.com/uploads/"
    return cdnDomain + fileName
  },

  create: async (buffer, tools) => {
    if (!tool.includes(tools)) {
      throw new Error(`Pilih salah satu: ${tool.join(", ")}`)
    }

    const url = await pxpic.upload(buffer)

    const data = qs.stringify({
      imageUrl: url,
      targetFormat: "png",
      needCompress: "no",
      imageQuality: "100",
      compressLevel: "6",
      fileOriginalExtension: "png",
      aiFunction: tools,
      upscalingLevel: "",
    })

    const config = {
      method: "POST",
      url: "https://pxpic.com/callAiFunction",
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
        "accept-language": "id-ID",
      },
      data,
    }

    const api = await axios.request(config)
    return api.data
  },
}

async function uploadToCDN(imageUrl, folder = null) {
  try {
    let apiUrl;
    if (folder) {
      apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}&folder=${folder}`;
    } else {
      apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}`;
    }
    
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    return imageUrl;
  }
}

export default function (app) {
  app.use("/v1/imagecreator/removebg", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v2/imagecreator/removebg", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v1/imagecreator/enhance", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v2/imagecreator/enhance", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v1/imagecreator/upscale", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v2/imagecreator/upscale", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v1/imagecreator/colorize", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  app.use("/v2/imagecreator/colorize", (req, res, next) => {
    req.startTime = Date.now()
    next()
  })

  async function handleImageTool(req, res, version, toolName) {
    const { url } = req.query

    if (!url) {
      return sendResponse(req, res, 400, { 
        error: "Parameter url wajib diisi"
      }, version)
    }

    try {
      const image = await getBuffer(url)
      const result = await pxpic.create(image, toolName)

      if (!result.resultImageUrl) {
        return sendResponse(req, res, 500, { 
          error: "Gagal memproses gambar"
        }, version)
      }

      const folderMap = {
        'removebg': 'removebg',
        'enhance': 'enhance', 
        'upscale': 'upscale',
        'colorize': 'colorize',
        'restore': 'restore'
      };
      
      const folder = folderMap[toolName] || 'pxpic';
      const finalUrl = await uploadToCDN(result.resultImageUrl, folder)

      return sendResponse(req, res, 200, {
        result: {
          imageUrl: finalUrl,
          tool: toolName,
          originalUrl: url,
          folder: folder
        }
      }, version)

    } catch (error) {
      return sendResponse(req, res, 500, {
        error: error.message || "Terjadi kesalahan"
      }, version)
    }
  }

  app.get("/v1/imagecreator/removebg", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'removebg'))
  app.post("/v1/imagecreator/removebg", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'removebg'))
  app.get("/v2/imagecreator/removebg", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'removebg'))
  app.post("/v2/imagecreator/removebg", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'removebg'))

  app.get("/v1/imagecreator/enhance", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'enhance'))
  app.post("/v1/imagecreator/enhance", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'enhance'))
  app.get("/v2/imagecreator/enhance", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'enhance'))
  app.post("/v2/imagecreator/enhance", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'enhance'))

  app.get("/v1/imagecreator/upscale", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'upscale'))
  app.post("/v1/imagecreator/upscale", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'upscale'))
  app.get("/v2/imagecreator/upscale", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'upscale'))
  app.post("/v2/imagecreator/upscale", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'upscale'))

  app.get("/v1/imagecreator/colorize", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'colorize'))
  app.post("/v1/imagecreator/colorize", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v1', 'colorize'))
  app.get("/v2/imagecreator/colorize", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'colorize'))
  app.post("/v2/imagecreator/colorize", createApiKeyMiddleware(), (req, res) => handleImageTool(req, res, 'v2', 'colorize'))
      }
