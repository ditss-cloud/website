// src/api/tiktok/tiktok.js
import axios from "axios";
import * as cheerio from 'cheerio'
import { getRandomUA } from "../../../src/utils/userAgen.js";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

// ============ TT SEARCH ============
const ttSearch = async (query) => {
  try {
    const d = new URLSearchParams();
    d.append("keywords", query);
    d.append("count", "15");
    d.append("cursor", "0");
    d.append("web", "1");
    d.append("hd", "1");

    const { data } = await axios.post("https://tikwm.com/api/feed/search", d, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const baseURL = "https://tikwm.com";
    const videos = data.data.videos.map(video => ({
      ...video,
      play: baseURL + video.play,
      wmplay: baseURL + video.wmplay,
      music: baseURL + video.music,
      cover: baseURL + video.cover,
      avatar: baseURL + video.avatar
    }));

    return videos;
  } catch (e) {
    throw e; // lempar error asli
  }
};

// ============ TIKTOK DL (ttsave.app) ============
const headers = {
  "authority": "ttsave.app",
  "accept": "application/json, text/plain, */*",
  "origin": "https://ttsave.app",
  "referer": "https://ttsave.app/en",
  "user-agent": "Postify/1.0.0",
};

const tiktokdl = {
  submit: async function(url, referer) {
    const headerx = { ...headers, referer };
    const data = { "query": url, "language_id": "1" };
    return axios.post('https://ttsave.app/download', data, { headers: headerx });
  },

  parse: function($) {
    const description = $('p.text-gray-600').text().trim();
    const dlink = {
      nowm: $('a.w-full.text-white.font-bold').first().attr('href'),
      audio: $('a[type="audio"]').attr('href'),
    };

    const slides = $('a[type="slide"]').map((i, el) => ({
      number: i + 1,
      url: $(el).attr('href')
    })).get();

    return { description, dlink, slides };
  },

  fetchData: async function(link) {
    try {
      const response = await this.submit(link, 'https://ttsave.app/en');
      const $ = cheerio.load(response.data);
      const result = this.parse($);
      return {
        video_nowm: result.dlink.nowm,
        audio_url: result.dlink.audio,
        slides: result.slides,
        description: result.description
      };
    } catch (error) {
      throw error;
    }
  }
};

// ============ TIKTOK DL V2 (tikwm.com) ============
const tiktok = async (query) => {
  const encodedParams = new URLSearchParams();
  encodedParams.set("url", query);
  encodedParams.set("hd", "1");

  const response = await axios({
    method: "POST",
    url: "https://tikwm.com/api/",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Cookie": "current_language=en",
      "User-Agent": getRandomUA()
    },
    data: encodedParams,
  });
  return response.data;
};

// ============ EXPRESS HANDLER ============
export default (app) => {
  // 🔍 Search
  app.get("/v1/search/tiktok", createApiKeyMiddleware(), async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ status: false, error: 'Query is required' });
    try {
      const results = await ttSearch(q);
      res.status(200).json({ status: true, result: results });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  // 📥 Download V1 (ttsave)
  app.get("/v2/download/tiktok", createApiKeyMiddleware(), async (req, res) => {
    const { url } = req.query;
    if (!url) return res.json({ status: false, error: 'Url is required' });
    try {
      const results = await tiktokdl.fetchData(url);
      res.status(200).json({ status: true, result: results });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });

  // 📥 Download V2 (tikwm)
  app.get("/v1/downloader/tiktok", createApiKeyMiddleware(), async (req, res) => {
    const { url } = req.query;
    if (!url) return res.json({ status: false, error: 'Url is required' });
    try {
      const results = await tiktok(url);
      res.status(200).json({ status: true, result: results });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });
};



/*import axios from "axios"
import * as cheerio from "cheerio"
import FormData from "form-data"
import * as tough from "tough-cookie"
import { createApiKeyMiddleware } from "../../middleware/apikey.js"

export default (app) => {
  class SnapTikClient {
    constructor(config = {}) {
      this.config = {
        baseURL: "https://snaptik.app",
        ...config,
      }

      const cookieJar = new tough.CookieJar()
      this.axios = axios.create({
        ...this.config,
        withCredentials: true,
        jar: cookieJar,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua": '"Not A(Brand";v="8", "Chromium";v="132"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 30000,
      })
    }

    async get_token() {
      const { data } = await this.axios.get("/en2", {
        headers: {
          "Referer": "https://snaptik.app/en2",
        },
      })
      const $ = cheerio.load(data)
      return $("input[name=\"token\"]").val()
    }

    async get_script(url) {
      const form = new FormData()
      const token = await this.get_token()

      if (!token) {
        throw new Error("Failed to get token")
      }

      form.append("url", url)
      form.append("lang", "en2")
      form.append("token", token)

      const { data } = await this.axios.post("/abc2.php", form, {
        headers: {
          ...form.getHeaders(),
          "authority": "snaptik.app",
          "accept": "/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "origin": "https://snaptik.app",
          "referer": "https://snaptik.app/en2",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
      })
      return data
    }

    async eval_script(script1) {
      const script2 = await new Promise((resolve) =>
        Function("eval", script1)(resolve)
      )

      return new Promise((resolve, reject) => {
        let html = ""
        const mockObjects = {
          $: () => ({
            remove() {},
            style: { display: "" },
            get innerHTML() {
              return html
            },
            set innerHTML(t) {
              html = t
            },
          }),
          app: { showAlert: reject },
          document: { getElementById: () => ({ src: "" }) },
          fetch: (a) => {
            resolve({ html, oembed_url: a })
            return { json: () => ({ thumbnail_url: "" }) }
          },
          gtag: () => 0,
          Math: { round: () => 0 },
          XMLHttpRequest: function () {
            return { open() {}, send() {} }
          },
          window: { location: { hostname: "snaptik.app" } },
        }

        try {
          Function(
            ...Object.keys(mockObjects),
            script2
          )(...Object.values(mockObjects))
        } catch (error) {
          console.log("Eval error saved to eval.txt:", error.message)
          reject(error)
        }
      })
    }

    async get_hd_video(hdUrl, backupUrl) {
      try {
        const { data } = await this.axios.get(hdUrl)
        if (data && data.url) {
          return data.url
        }
      } catch (error) {
        console.log("HD URL failed, using backup:", error.message)
      }
      return backupUrl
    }

    async parse_html(html) {
      const $ = cheerio.load(html)
      const isVideo = !$("div.render-wrapper").length

      const thumbnail = $(".avatar").attr("src") || $("#thumbnail").attr("src")
      const title = $(".video-title").text().trim()
      const creator = $(".info span").text().trim()

      if (isVideo) {
        const hdButton = $("div.video-links > button[data-tokenhd]")
        const hdTokenUrl = hdButton.data("tokenhd")
        const backupUrl = hdButton.data("backup")

        let hdUrl = null
        if (hdTokenUrl) {
          hdUrl = await this.get_hd_video(hdTokenUrl, backupUrl)
        }

        const videoUrls = [
          hdUrl || backupUrl,
          ...$("div.video-links > a:not(a[href=\"/\"])")
            .map((_, elem) => $(elem).attr("href"))
            .get()
            .filter((url) => url && !url.includes("play.google.com"))
            .map((x) => (x.startsWith("/") ? this.config.baseURL + x : x)),
        ].filter(Boolean)

        return {
          type: "video",
          urls: videoUrls,
          metadata: {
            title: title || null,
            description: title || null,
            thumbnail: thumbnail || null,
            creator: creator || null,
          },
        }
      } else {
        const photos = $("div.columns > div.column > div.photo")
          .map((_, elem) => ({
            urls: [
              $(elem).find("img[alt=\"Photo\"]").attr("src"),
              $(elem)
                .find("a[data-event=\"download_albumPhoto_photo\"]")
                .attr("href"),
            ],
          }))
          .get()

        return {
          type: photos.length === 1 ? "photo" : "slideshow",
          urls:
            photos.length === 1
              ? photos[0].urls
              : photos.map((photo) => photo.urls),
          metadata: {
            title: title || null,
            description: title || null,
            thumbnail: thumbnail || null,
            creator: creator || null,
          },
        }
      }
    }

    async process(url) {
      try {
        const script = await this.get_script(url)
        const { html, oembed_url } = await this.eval_script(script)
        const result = await this.parse_html(html)

        return {
          original_url: url,
          oembed_url,
          type: result.type,
          urls: result.urls,
          metadata: result.metadata,
        }
      } catch (error) {
        console.error("Process error:", error.message)
        return {
          original_url: url,
          error: error.message,
        }
      }
    }
  }

  async function scrapeTiktok(url) {
    try {
      const client = new SnapTikClient()
      return await client.process(url)
    } catch (error) {
      console.error("Tiktok scrape error:", error)
      return null
    }
  }

  app.get("/downloader/tiktok", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.query

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "URL parameter is required",
        })
      }

      if (typeof url !== "string" || url.trim().length === 0) {
        return res.status(400).json({
          status: false,
          error: "URL must be a non-empty string",
        })
      }

      const result = await scrapeTiktok(url.trim())
      if (!result) {
        return res.status(500).json({
          status: false,
          error: result?.error || "Failed to process TikTok URL",
        })
      }
      res.status(200).json({
        status: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message || "Internal Server Error",
      })
    }
  })

  app.post("/downloader/tiktok", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { url } = req.body

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "URL parameter is required",
        })
      }

      if (typeof url !== "string" || url.trim().length === 0) {
        return res.status(400).json({
          status: false,
          error: "URL must be a non-empty string",
        })
      }

      const result = await scrapeTiktok(url.trim())
      if (!result) {
        return res.status(500).json({
          status: false,
          error: result?.error || "Failed to process TikTok URL",
        })
      }
      res.status(200).json({
        status: true,
        data: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message || "Internal Server Error",
      })
    }
  })
}*/
