/**
 * Phase 4: Dashboard — serves the static HTML page
 * GET /api/dashboard
 * Redirects to /dashboard/index.html or serves inline HTML for environments without static file serving
 */
const path = require("path");
const fs = require("fs");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const htmlPath = path.join(__dirname, "../../public/dashboard/index.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  }
  res.status(404).send("Dashboard not found");
};
