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

const tools = ["removebg", "enhance", "upscale", "restore", "colorize"]
const versions = ["v1", "v2"]

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

  create: async (buffer, toolName) => {
    if (!tools.includes(toolName)) {
      throw new Error(`Pilih salah satu: ${tools.join(", ")}`)
    }

    const url = await pxpic.upload(buffer)

    const data = qs.stringify({
      imageUrl: url,
      targetFormat: "png",
      needCompress: "no",
      imageQuality: "100",
      compressLevel: "6",
      fileOriginalExtension: "png",
      aiFunction: toolName,
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

// Handler function
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

export default function (app) {
  // ===== ENDPOINT BARU (Rekomendasi) =====
  // Menggunakan /v1/image/{tool} bukan /v1/imagecreator/{tool}
  
  versions.forEach(version => {
    tools.forEach(tool => {
      if (tool === 'restore') return; // skip restore kalau belum ada
      
      const path = `/${version}/image/${tool}`
      
      // Middleware untuk timing
      app.use(path, (req, res, next) => {
        req.startTime = Date.now()
        next()
      })
      
      // GET & POST endpoint
      app.get(path, createApiKeyMiddleware(), (req, res) => 
        handleImageTool(req, res, version, tool)
      )
      
      app.post(path, createApiKeyMiddleware(), (req, res) => 
        handleImageTool(req, res, version, tool)
      )
    })
  })
  
  // ===== BACKWARD COMPATIBILITY =====
  // Pertahankan endpoint lama untuk kompatibilitas
  const oldTools = ["removebg", "enhance", "upscale", "colorize"]
  
  oldTools.forEach(tool => {
    versions.forEach(version => {
      const oldPath = `/${version}/imagecreator/${tool}`
      
      app.use(oldPath, (req, res, next) => {
        req.startTime = Date.now()
        next()
      })
      
      app.get(oldPath, createApiKeyMiddleware(), (req, res) => 
        handleImageTool(req, res, version, tool)
      )
      
      app.post(oldPath, createApiKeyMiddleware(), (req, res) => 
        handleImageTool(req, res, version, tool)
      )
    })
  })
  }
