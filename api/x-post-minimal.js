// api/x-post-minimal.js
// DEPRECATED (2026-03): Minimal briefing X auto-post removed — no Vercel cron.
// Briefing teasers on X: /api/x-post-regular-teaser only. TG Minimal delivery unchanged.

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return res.status(200).json({
    ok: true,
    skipped: true,
    deprecated: true,
    reason:
      "Minimal X posting discontinued. Use /api/x-post-regular-teaser for briefing teasers.",
  });
};
