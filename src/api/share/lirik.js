import * as cheerio from 'cheerio'
import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function lirikLagu(query) {
  try {
    const { data } = await axios.get("https://songsear.ch/q/" + encodeURIComponent(query));
    const $ = cheerio.load(data);

    const result = {
      title: $("div.results > div:nth-child(1) > .head > h3 > b").text() + " - " + $("div.results > div:nth-child(1) > .head > h2 > a").text(),
      album: $("div.results > div:nth-child(1) > .head > p").text(),
      number: $("div.results > div:nth-child(1) > .head > a").attr("href").split("/")[4],
      thumb: $("div.results > div:nth-child(1) > .head > a > img").attr("src")
    }

    const { data: lyricData } = await axios.get(`https://songsear.ch/api/song/${result.number}?text_only=true`)
    const lyrics = lyricData.song.text_html
      .replace(/<br\/>/g, "\n")
      .replace(/&#x27;/g, "'")

    return {
      status: true,
      result: {
        title: result.title,
        album: result.album,
        thumb: result.thumb,
        lyrics
      }
    }

  } catch (error) {
    return {
      status: false,
      message: "Song not found or error occurred while fetching data."
    }
  }
}

export default function (app) {
  app.get('/v1/search/lirik', createApiKeyMiddleware(), async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ 
        status: false, 
        message: "Search query is required",
        error: "Missing 'q' parameter in query string" 
      });
    }

    const hasil = await lirikLagu(q);
    if (!hasil.status) {
      return res.status(404).json(hasil);
    }

    res.status(200).json(hasil);
  });

  app.post('/v1/search/lirik', createApiKeyMiddleware(), async (req, res) => {
    const { q } = req.body;
    if (!q) {
      return res.status(400).json({ 
        status: false, 
        message: "Search query is required",
        error: "Missing 'q' field in request body" 
      });
    }

    const hasil = await lirikLagu(q);
    if (!hasil.status) {
      return res.status(404).json(hasil);
    }

    res.status(200).json(hasil);
  });
}
