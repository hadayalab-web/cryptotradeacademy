/**
 * ルート (/) 用。ダッシュボードへリダイレクトする。
 */
module.exports = function handler(req, res) {
  res.setHeader("Location", "/dashboard/");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(302).end(
    '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/dashboard/"><title>CryptoTrade Academy</title></head><body><p><a href="/dashboard/">CryptoTrade Academy</a> — redirecting…</p></body></html>'
  );
};
