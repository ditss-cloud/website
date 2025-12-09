import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUA } from "../../../src/utils/userAgen.js";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function uploadToCDN(imageUrl, folder = 'unrestricted-ai') {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}&folder=${folder}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    return imageUrl; // Fallback ke URL asli jika gagal
  }
}

async function unrestrictedai(prompt, style = 'anime') {
  const styles = ['photorealistic', 'digital-art', 'impressionist', 'anime', 'fantasy', 'sci-fi', 'vintage'];
  
  if (!prompt) throw new Error('Prompt is required.');
  if (!styles.includes(style)) throw new Error(`Available styles: ${styles.join(', ')}.`);
  
  const { data: html } = await axios.get('https://unrestrictedaiimagegenerator.com/', {
    headers: {
      origin: 'https://unrestrictedaiimagegenerator.com',
      referer: 'https://unrestrictedaiimagegenerator.com/',
      'user-agent': getRandomUA()
    }
  });
  
  const $ = cheerio.load(html);
  const nonce = $('input[name="_wpnonce"]').attr('value');
  if (!nonce) throw new Error('Nonce not found.');
  
  const { data } = await axios.post('https://unrestrictedaiimagegenerator.com/', new URLSearchParams({
    generate_image: true,
    image_description: prompt,
    image_style: style,
    _wpnonce: nonce
  }).toString(), {
    headers: {
      origin: 'https://unrestrictedaiimagegenerator.com',
      referer: 'https://unrestrictedaiimagegenerator.com/',
      'user-agent': getRandomUA()
    }
  });
  
  const $$ = cheerio.load(data);
  const img = $$('img#resultImage').attr('src');
  if (!img) throw new Error('No result found.');
  
  return img;
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    const { prompt, style = 'anime' } = data;
    
    if (!prompt) {
      return res.json({
        status: false,
        error: "Parameter 'prompt' is required"
      });
    }
    const imageUrl = await unrestrictedai(prompt, style);
    const cdnUrl = await uploadToCDN(imageUrl);
    
    res.json({
      status: true,
      url: cdnUrl,
      prompt: prompt,
      style: style
    });
    
  } catch (error) {
    console.error("Unrestricted AI Error:", error);
    res.json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/ai/unrestricted", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/ai/unrestricted", createApiKeyMiddleware(), handleRequest);
};
/*
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function uploadToCDN(imageUrl, folder = 'unrestricted-ai') {
  try {
    const apiUrl = `https://cdn.ditss.biz.id/uploadUrl?url=${encodeURIComponent(imageUrl)}&folder=${folder}`;
    const { data } = await axios.get(apiUrl, { timeout: 60000 });
    return data.url;
  } catch (error) {
    console.error('CDN upload failed:', error.message);
    return imageUrl;
  }
}

async function unrestrictedai(prompt, style = 'anime') {
  const styles = ['photorealistic', 'digital-art', 'impressionist', 'anime', 'fantasy', 'sci-fi', 'vintage'];
  
  if (!prompt) throw new Error('Prompt is required.');
  if (!styles.includes(style)) throw new Error(`Available styles: ${styles.join(', ')}.`);
  
  const { data: html } = await axios.get('https://unrestrictedaiimagegenerator.com/', {
    headers: {
      origin: 'https://unrestrictedaiimagegenerator.com',
      referer: 'https://unrestrictedaiimagegenerator.com/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
    }
  });
  
  const $ = cheerio.load(html);
  const nonce = $('input[name="_wpnonce"]').attr('value');
  if (!nonce) throw new Error('Nonce not found.');
  
  const { data } = await axios.post('https://unrestrictedaiimagegenerator.com/', new URLSearchParams({
    generate_image: true,
    image_description: prompt,
    image_style: style,
    _wpnonce: nonce
  }).toString(), {
    headers: {
      origin: 'https://unrestrictedaiimagegenerator.com',
      referer: 'https://unrestrictedaiimagegenerator.com/',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
    }
  });
  
  const $$ = cheerio.load(data);
  const img = $$('img#resultImage').attr('src');
  if (!img) throw new Error('No result found.');
  
  return img;
}

async function handleRequest(req, res) {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    const { prompt, style = 'anime', cdn = false } = data;
    
    if (!prompt) {
      return res.json({
        status: false,
        error: "Parameter 'prompt' is required"
      });
    }
    
    const imageUrl = await unrestrictedai(prompt, style);
    let finalUrl = imageUrl;
    
    if (cdn === 'true' || cdn === true) {
      finalUrl = await uploadToCDN(imageUrl);
    }
    
    res.json({
      status: true,
      url: finalUrl,
      prompt: prompt,
      style: style
    });
    
  } catch (error) {
    console.error("Unrestricted AI Error:", error);
    res.json({
      status: false,
      error: error.message
    });
  }
}

export default (app) => {
  app.get("/v1/ai/unrestricted", createApiKeyMiddleware(), handleRequest);
  app.post("/v2/ai/unrestricted", createApiKeyMiddleware(), handleRequest);
};*/
