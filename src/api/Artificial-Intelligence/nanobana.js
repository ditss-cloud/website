import axios from 'axios';
import multer from 'multer';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Setup multer untuk handle file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maksimal 5MB
    files: 1 // Maksimal 1 file
  },
  fileFilter: (req, file, cb) => {
    // Hanya terima file gambar
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
    }
  }
});

const uploadSingleImage = upload.single('image');

async function scrapeImgEditor(imageBuffer, prompt) {
  const info = await fetch("https://imgeditor.co/api/get-upload-url", {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fileName: "uploaded_image.jpg",
      contentType: "image/jpeg",
      fileSize: imageBuffer.length
    })
  }).then(r => r.json());

  await fetch(info.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: imageBuffer
  });

  const gen = await fetch("https://imgeditor.co/api/generate-image", {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      styleId: "realistic",
      mode: "image",
      imageUrl: info.publicUrl,
      imageUrls: [info.publicUrl],
      numImages: 1,
      outputFormat: "png",
      model: "nano-banana"
    })
  }).then(r => r.json());

  let status;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
    
    status = await fetch(`https://imgeditor.co/api/generate-image/status?taskId=${gen.taskId}`, {
      headers: { "accept": "*/*" }
    }).then(r => r.json());

    if (status.status === "completed") break;
    if (status.status === "failed") {
      throw new Error("Image generation failed on server");
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error("Image generation timeout (60 seconds)");
  }

  return status.imageUrl;
}

export default (app) => {
  // GET endpoint (masih support URL)
  app.get("/v1/tools/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          message: "Image URL is required",
          error: "Missing 'url' parameter"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          message: "Prompt is required",
          error: "Missing 'prompt' parameter"
        });
      }
      
      // Download image dari URL
      const imageResponse = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      }).catch(err => {
        throw new Error(`Failed to download image from URL: ${err.message}`);
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Proses image
      const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
      
      res.json({
        status: true,
        creator: "DitssCloud",
        message: "Image generated successfully from URL",
        result: {
          imageUrl: resultUrl,
          downloadUrl: resultUrl,
          prompt: prompt,
          source: "url",
          originalUrl: url,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error("[GET Image Editor Error]:", error.message);
      const statusCode = error.message.includes('Missing') ? 400 : 500;
      res.status(statusCode).json({
        status: false,
        creator: "DitssCloud",
        message: error.message.includes('Missing') ? "Missing required parameters" : "Failed to generate image",
        error: error.message
      });
    }
  });

  // POST endpoint dengan file upload (menggunakan multer)
  app.post("/v1/tools/imgeditor", 
    createApiKeyMiddleware(),
    (req, res, next) => {
      // Handle multer upload
      uploadSingleImage(req, res, function(err) {
        if (err) {
          // Multer error handling
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              status: false,
              creator: "DitssCloud",
              message: "File too large",
              error: "Maximum file size is 5MB"
            });
          }
          if (err.message.includes('Only image files')) {
            return res.status(400).json({
              status: false,
              creator: "DitssCloud",
              message: "Invalid file type",
              error: err.message
            });
          }
          return res.status(500).json({
            status: false,
            creator: "DitssCloud",
            message: "File upload failed",
            error: err.message
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        // Cek apakah ada file yang di-upload
        if (!req.file) {
          // Jika tidak ada file, coba pakai URL sebagai fallback
          const { url, prompt } = req.body;
          
          if (!url || !prompt) {
            return res.status(400).json({
              status: false,
              creator: "DitssCloud",
              message: "Either upload an image file or provide URL and prompt",
              error: !req.file ? "Missing image file" : "Missing prompt"
            });
          }
          
          // Download image dari URL
          const imageResponse = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000
          }).catch(err => {
            throw new Error(`Failed to download image from URL: ${err.message}`);
          });
          
          const imageBuffer = Buffer.from(imageResponse.data);
          const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
          
          return res.json({
            status: true,
            creator: "DitssCloud",
            message: "Image generated successfully from URL",
            result: {
              imageUrl: resultUrl,
              downloadUrl: resultUrl,
              prompt: prompt,
              source: "url",
              originalUrl: url,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // Jika ada file upload
        if (!req.body.prompt) {
          return res.status(400).json({
            status: false,
            creator: "DitssCloud",
            message: "Prompt is required",
            error: "Missing 'prompt' field in form data"
          });
        }
        
        const imageBuffer = req.file.buffer;
        const prompt = req.body.prompt;
        
        // Proses image
        const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
        
        res.json({
          status: true,
          creator: "DitssCloud",
          message: "Image generated successfully from upload",
          result: {
            imageUrl: resultUrl,
            downloadUrl: resultUrl,
            prompt: prompt,
            source: "file_upload",
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        console.error("[POST Image Editor Error]:", error.message);
        res.status(500).json({
          status: false,
          creator: "DitssCloud",
          message: "Failed to generate image",
          error: error.message
        });
      }
    }
  );

  // Endpoint status
  app.get("/v1/tools/imgeditor/status", createApiKeyMiddleware(), (req, res) => {
    res.json({
      status: true,
      creator: "DitssCloud",
      message: "Image Editor API is active",
      endpoints: {
        get: "/v1/tools/imgeditor?url=IMAGE_URL&prompt=YOUR_PROMPT",
        post: "/v1/tools/imgeditor (multipart/form-data with 'image' file and 'prompt' field)",
        post_fallback: "/v1/tools/imgeditor (JSON with 'url' and 'prompt' fields)"
      },
      limits: {
        max_file_size: "5MB",
        allowed_formats: "JPEG, PNG, GIF, WebP",
        timeout: "60 seconds"
      },
      timestamp: new Date().toISOString()
    });
  });
};
/*import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data);
}

async function scrapeImgEditor(imageBuffer, prompt) {
  const info = await fetch("https://imgeditor.co/api/get-upload-url", {
    method: "POST",
    headers: {
      "accept": "*"/*", // hapus "
      "content-type": "application/json"
    },
    body: JSON.stringify({
      fileName: "foto.jpg",
      contentType: "image/jpeg",
      fileSize: imageBuffer.length
    })
  }).then(r => r.json());

  await fetch(info.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg" },
    body: imageBuffer
  });

  const gen = await fetch("https://imgeditor.co/api/generate-image", {
    method: "POST",
    headers: {
      "accept": "*"/*",// hapus "
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      styleId: "realistic",
      mode: "image",
      imageUrl: info.publicUrl,
      imageUrls: [info.publicUrl],
      numImages: 1,
      outputFormat: "png",
      model: "nano-banana"
    })
  }).then(r => r.json());

  let status;
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    status = await fetch(`https://imgeditor.co/api/generate-image/status?taskId=${gen.taskId}`, {
      headers: { "accept": "*"/*" } //hapus "
    }).then(r => r.json());

    if (status.status === "completed") break;
  }

  return status.imageUrl;
}

export default (app) => {
  app.get("/v1/tools/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.query;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "URL image is required"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const imageBuffer = await downloadImage(url);
      const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          imageUrl: resultUrl,
          downloadUrl: resultUrl,
          prompt: prompt,
          originalImage: url,
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

  app.post("/v2/tools/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.body;
      
      if (!url) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "URL image is required"
        });
      }
      
      if (!prompt) {
        return res.status(400).json({
          status: false,
          creator: "DitssCloud",
          error: "Prompt is required"
        });
      }
      
      const imageBuffer = await downloadImage(url);
      const resultUrl = await scrapeImgEditor(imageBuffer, prompt);
      
      res.json({
        status: true,
        creator: "DitssCloud",
        result: {
          imageUrl: resultUrl,
          downloadUrl: resultUrl,
          prompt: prompt,
          originalImage: url,
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
};*/
