import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Validasi prompt
function validatePrompt(prompt) {
  const banned = ['telanjang', 'naked', 'nude', 'bugil', 'seks', 'sex', 'porn', 'hentai', 'nsfw', '18+'];
  const lower = prompt.toLowerCase();
  
  for (const word of banned) {
    if (lower.includes(word)) return false;
  }
  
  return true;
}

// Upload ke CDN
async function uploadToCDN(imageUrl) {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}&folder=imgeditor`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    return imageUrl;
  }
}

// Generate image dengan AI
async function scrapeImgEditor(imageBuffer, prompt) {
  const info = await fetch("https://imgeditor.co/api/get-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    status = await fetch(`https://imgeditor.co/api/generate-image/status?taskId=${gen.taskId}`)
      .then(r => r.json());

    if (status.status === "completed") break;
  }

  return status.imageUrl;
}

export default (app) => {
  // GET - ambil dari query params
  app.get("/v1/ai/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.query;
      
      if (!url || !prompt) {
        return res.json({
          status: false,
          error: "url dan prompt diperlukan"
        });
      }
      
      if (!validatePrompt(prompt)) {
        return res.json({
          status: false,
          error: "prompt tidak diperbolehkan"
        });
      }
      
      const imageBuffer = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      }).then(r => Buffer.from(r.data));
      
      const aiImageUrl = await scrapeImgEditor(imageBuffer, prompt);
      const cdnUrl = await uploadToCDN(aiImageUrl);
      
      res.json({
        status: true,
        url: cdnUrl,
        prompt: prompt
      });
      
    } catch (error) {
      console.error(error);
      res.json({
        status: false,
        error: error.message
      });
    }
  });

  // POST - ambil dari body
  app.post("/v2/ai/imgeditor", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url, prompt } = req.body;
      
      if (!url || !prompt) {
        return res.json({
          status: false,
          error: "url dan prompt diperlukan"
        });
      }
      
      if (!validatePrompt(prompt)) {
        return res.json({
          status: false,
          error: "prompt tidak diperbolehkan"
        });
      }
      
      const imageBuffer = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      }).then(r => Buffer.from(r.data));
      
      const aiImageUrl = await scrapeImgEditor(imageBuffer, prompt);
      const cdnUrl = await uploadToCDN(aiImageUrl);
      
      res.json({
        status: true,
        url: cdnUrl,
        prompt: prompt
      });
      
    } catch (error) {
      console.error(error);
      res.json({
        status: false,
        error: error.message
      });
    }
  });
};









/*
import axios from 'axios';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// Validasi prompt sederhana
function validatePrompt(prompt) {
  const banned = ['telanjang', 'naked', 'nude', 'bugil', 'seks', 'sex', 'porn', 'hentai', 'nsfw', '18+'];
  const lower = prompt.toLowerCase();
  
  for (const word of banned) {
    if (lower.includes(word)) {
      return false;
    }
  }
  
  return true;
}

// Upload ke CDN
async function uploadToCDN(imageUrl, folder = 'imgeditor') {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}&folder=${folder}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    return imageUrl;
  }
}

// Generate image dengan AI
async function scrapeImgEditor(imageBuffer, prompt) {
  const info = await fetch("https://imgeditor.co/api/get-upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
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
    status = await fetch(`https://imgeditor.co/api/generate-image/status?taskId=${gen.taskId}`)
      .then(r => r.json());

    if (status.status === "completed") break;
  }

  return status.imageUrl;
}

// Handler utama
async function handleRequest(req, res) {
  try {
    const { url, prompt } = req.method === 'GET' ? req.query : req.body;
    
    if (!url || !prompt) {
      return res.json({
        status: false,
        error: "url dan prompt diperlukan"
      });
    }
    
    if (!validatePrompt(prompt)) {
      return res.json({
        status: false,
        error: "prompt tidak diperbolehkan"
      });
    }
    
    const imageBuffer = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000
    }).then(r => Buffer.from(r.data));
    
    const aiImageUrl = await scrapeImgEditor(imageBuffer, prompt);
    const cdnUrl = await uploadToCDN(aiImageUrl);
    
    res.json({
      status: true,
      url: cdnUrl,
      prompt: prompt
    });
    
  } catch (error) {
    console.error(error);
    res.json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/ai/imgeditor", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/ai/imgeditor", createApiKeyMiddleware(), handleRequest);
};*/
