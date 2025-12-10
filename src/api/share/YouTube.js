import yt from "yt-search";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function searchYouTube(query) {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }

    if (query.length > 100) {
      throw new Error("Query too long (maximum 100 characters)");
    }

    const results = await yt(query);
    
    if (!results || !results.all || results.all.length === 0) {
      throw new Error("No results found");
    }

    return results.all.slice(0, 200).map(item => ({
      id: item.videoId,
      title: item.title,
      description: item.description || "",
      url: item.url,
      thumbnail: item.thumbnail,
      duration: item.duration?.toString() || "Unknown",
      views: item.views || 0,
      uploadedAt: item.ago || "Unknown",
      author: {
        name: item.author?.name || "Unknown",
        url: item.author?.url || "",
        verified: item.author?.verified || false
      }
    }));
  } catch (error) {
    throw new Error(`Failed to search videos: ${error.message}`);
  }
}

function validateYouTubeUrl(url) {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
}

async function getVideoInfo(url) {
  try {
    if (!validateYouTubeUrl(url)) {
      throw new Error("Invalid YouTube URL");
    }

    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    
    if (!videoId) {
      throw new Error("Cannot extract Video ID from URL");
    }

    const searchResults = await yt(`https://youtube.com/watch?v=${videoId}`);
    
    if (!searchResults.videos || searchResults.videos.length === 0) {
      throw new Error("Video information not available");
    }

    const video = searchResults.videos[0];
    
    return {
      id: videoId,
      title: video.title,
      description: video.description,
      url: `https://youtube.com/watch?v=${videoId}`,
      thumbnail: video.thumbnail,
      duration: video.duration?.toString() || "Unknown",
      views: video.views || 0,
      uploadedAt: video.ago || "Unknown",
      author: {
        name: video.author?.name || "Unknown",
        url: video.author?.url || "",
        verified: video.author?.verified || false
      },
      timestamp: video.timestamp || null
    };
  } catch (error) {
    throw new Error(`Failed to get video information: ${error.message}`);
  }
}

export default (app) => {
  app.get("/v1/search/youtube", createApiKeyMiddleware(), async (req, res) => {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Search query is required",
        error: "Missing 'q' parameter in query string"
      });
    }

    try {
      const results = await searchYouTube(q);
      const limitedResults = results.slice(0, parseInt(limit));
      
      res.status(200).json({
        status: true,
        creator: "Ditss",
        mode: "search",
        message: "YouTube search completed successfully",
        query: q,
        count: limitedResults.length,
        results: limitedResults
      });
    } catch (error) {
      console.error("[YouTube Search Error]:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to search YouTube",
        error: error.message
      });
    }
  });

  app.post("/v1/search/youtube", createApiKeyMiddleware(), async (req, res) => {
    const { q, limit = 20 } = req.body;
    
    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Search query is required",
        error: "Missing 'q' field in request body"
      });
    }

    try {
      const results = await searchYouTube(q);
      const limitedResults = results.slice(0, parseInt(limit));
      
      res.status(200).json({
        status: true,
        creator: "Ditss",
        mode: "search",
        message: "YouTube search completed successfully",
        query: q,
        count: limitedResults.length,
        results: limitedResults
      });
    } catch (error) {
      console.error("[YouTube Search Error]:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to search YouTube",
        error: error.message
      });
    }
  });

  app.get("/v1/youtube/info", createApiKeyMiddleware(), async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "YouTube URL is required",
        error: "Missing 'url' parameter in query string"
      });
    }

    try {
      const info = await getVideoInfo(url);
      res.status(200).json({
        status: true,
        creator: "Ditss",
        mode: "video_info",
        message: "Video information retrieved successfully",
        result: info
      });
    } catch (error) {
      console.error("[Video Info Error]:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to get video information",
        error: error.message
      });
    }
  });

  app.post("/v1/youtube/info", createApiKeyMiddleware(), async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "YouTube URL is required",
        error: "Missing 'url' field in request body"
      });
    }

    try {
      const info = await getVideoInfo(url);
      res.status(200).json({
        status: true,
        creator: "Ditss",
        mode: "video_info",
        message: "Video information retrieved successfully",
        result: info
      });
    } catch (error) {
      console.error("[Video Info Error]:", error.message);
      res.status(500).json({
        status: false,
        message: "Failed to get video information",
        error: error.message
      });
    }
  });

  app.get("/v1/youtube/status", createApiKeyMiddleware(), async (req, res) => {
    res.status(200).json({
      status: true,
      creator: "Ditss",
      mode: "status",
      message: "YouTube API services status",
      services: {
        search: "active",
        video_info: "active"
      },
      supported_methods: ["GET", "POST"],
      timestamp: new Date().toISOString()
    });
  });
};
