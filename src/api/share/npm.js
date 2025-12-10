import axios from "axios";
import { createApiKeyMiddleware } from "../../middleware/apikey.js";

async function getPackageDetails(packageName) {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`, {
      timeout: 8000,
    });

    const data = response.data;
    const versions = data.versions || {};
    const allVersions = Object.keys(versions);
    const latestVersion = allVersions[allVersions.length - 1] || "unknown";
    const firstVersion = allVersions[0] || "unknown";

    const latestPkg = versions[latestVersion] || {};
    const firstPkg = versions[firstVersion] || {};

    return {
      name: data.name || packageName,
      description: data.description || "No description",
      keywords: data.keywords || [],
      homepage: data.homepage || null,
      repository: data.repository?.url || null,
      license: data.license || "Unknown",
      author: data.author?.name || data.maintainers?.[0]?.name || "Unknown",
      maintainers: (data.maintainers || []).map(m => m.name),
      
      versionLatest: latestVersion,
      versionPublish: firstVersion,
      totalVersions: allVersions.length,

      latestDependencies: Object.keys(latestPkg.dependencies || {}).length,
      latestDevDependencies: Object.keys(latestPkg.devDependencies || {}).length,
      publishDependencies: Object.keys(firstPkg.dependencies || {}).length,

      publishTime: data.time?.created || "Unknown",
      latestPublishTime: data.time?.[latestVersion] || "Unknown",

      downloadsLastWeek: data.downloads?.[0]?.downloads || 0,
      lastPublisher: data._npmUser?.name || null,
    };
  } catch (error) {
    throw new Error(`Failed to get package details: ${error.message}`);
  }
}

async function searchNpm(query, limit = 20) {
  try {
    const response = await axios.get(
      `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`,
      { timeout: 10000 }
    );

    const results = (response.data.objects || []).map(obj => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || "No description",
      keywords: obj.package.keywords || [],
      author: obj.package.publisher?.username || "Unknown",
      date: obj.package.date || "Unknown",
      links: obj.package.links || {},
      downloads: obj.downloads || 0,
    }));

    return results;
  } catch (error) {
    throw new Error(`Failed to search packages: ${error.message}`);
  }
}

export default (app) => {
  async function handleNpmSearch(req, res) {
    const q = req.query.q || req.body.q;
    const name = req.query.name || req.body.name;

    if (q) {
      try {
        const results = await searchNpm(q, 20);
        res.status(200).json({
          status: true,
          creator: "Ditss",
          mode: "search",
          query: q,
          count: results.length,
          results: results,
        });
      } catch (error) {
        console.error("[NPM Search Error]:", error.message);
        res.status(500).json({
          status: false,
          message: "Failed to search NPM packages",
          error: error.message,
        });
      }
      return;
    }

    if (name) {
      try {
        const details = await getPackageDetails(name);
        res.status(200).json({
          status: true,
          creator: "Ditss",
          mode: "stalk",
          result: details,
        });
      } catch (error) {
        console.error("[NPM Stalk Error]:", error.message);
        res.status(404).json({
          status: false,
          message: "Package not found",
          error: error.message,
        });
      }
      return;
    }

    res.status(400).json({
      status: false,
      message: "Parameter 'q' (search) or 'name' (stalk) is required",
      error: "Missing required parameters",
    });
  }

  app.get("/v1/search/npm", createApiKeyMiddleware(), handleNpmSearch);
  app.post("/v1/search/npm", createApiKeyMiddleware(), handleNpmSearch);
};
