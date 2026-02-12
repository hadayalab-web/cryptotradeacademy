let _loaded = false;

function loadEnv() {
  if (_loaded) return;
  _loaded = true;
  // Vercel本番は環境変数注入済みのため、dotenvはローカル補助としてのみ使う。
  if (process.env.VERCEL || process.env.NODE_ENV === "production") return;
  try {
    const dotenv = require("dotenv");
    // ユーザー指示に従い .env を優先参照
    dotenv.config({ path: ".env" });
    // ローカル上書きが必要な場合のみ .env.local を追加ロード
    dotenv.config({ path: ".env.local" });
  } catch {
    // dotenv 未導入でも process.env をそのまま利用
  }
}

module.exports = { loadEnv };

