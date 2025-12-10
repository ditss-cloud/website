import axios from "axios";
import * as cheerio from "cheerio";
import { getRandomUA } from "../../../src/utils/userAgen.js";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function searchGroups(keywords) {
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Referer": "https://groupda1.link/add/group/search",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html, */*; q=0.01",
    "Host": "groupda1.link",
    "Origin": "https://groupda1.link",
    "User-Agent": getRandomUA(),
  };

  const results = [];
  const keywordList = keywords.split(",");

  for (const name of keywordList) {
    const keyword = name.trim();
    let loop_count = 0;

    while (loop_count < 5) {
      const data = {
        group_no: `${loop_count}`,
        search: true,
        keyword: keyword,
      };

      try {
        const response = await axios.post(
          "https://groupda1.link/add/group/loadresult",
          new URLSearchParams(data),
          { headers, timeout: 10000 }
        );

        if (response.status !== 200 || !response.data || response.data.length === 0) break;

        const $ = cheerio.load(response.data);
        let found = false;

        for (const maindiv of $(".maindiv").toArray()) {
          const tag = $(maindiv).find("a[href]");
          if (!tag.length) continue;

          const link = tag.attr("href");
          const title =
            tag.attr("title")?.replace("Whatsapp group invite link: ", "") || "Unnamed Group";
          const description_tag = $(maindiv).find("p.descri");
          const description = description_tag.text().trim() || "No description available";
          const group_id = link.split("/").pop();
          const group_link = `https://chat.whatsapp.com/${group_id}`;

          if (!results.some((g) => g.Code === group_id)) {
            results.push({
              Name: title,
              Code: group_id,
              Link: group_link,
              Description: description,
              Keyword: keyword,
            });
            found = true;
          }
        }

        if (!found) break;
        loop_count++;
        await new Promise((r) => setTimeout(r, 1000));
      } catch (error) {
        break;
      }
    }
  }

  return results;
}

export default function (app) {
  app.get("/v1/search/group", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ 
          status: false, 
          message: "Search query is required",
          error: "Missing 'q' parameter in query string"
        });
      }

      const results = await searchGroups(q);

      res.status(200).json({
        status: true,
        message: "Groups search completed successfully",
        query: q,
        count: results.length,
        result: results,
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        message: "Failed to search for groups",
        error: error.message 
      });
    }
  });

  app.post("/v1/search/group", createApiKeyMiddleware(), async (req, res) => {
    try {
      const { q } = req.body;
      if (!q) {
        return res.status(400).json({ 
          status: false, 
          message: "Search query is required",
          error: "Missing 'q' field in request body"
        });
      }

      const results = await searchGroups(q);

      res.status(200).json({
        status: true,
        message: "Groups search completed successfully",
        query: q,
        count: results.length,
        result: results,
      });
    } catch (error) {
      res.status(500).json({ 
        status: false, 
        message: "Failed to search for groups",
        error: error.message 
      });
    }
  });
    }
