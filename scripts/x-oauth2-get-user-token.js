#!/usr/bin/env node
/**
 * OAuth 2.0 PKCE で X のユーザーアクセストークンを 1 回取得する。
 * 取得した access_token を Vercel の X_API_OAUTH2_USER_ACCESS_TOKEN に貼る。
 *
 * 前提:
 * - .env に X_API_CLIENT_SECRET_ID（Client ID）と X_API_CLIENT_SECRET（Client Secret）があること
 * 使い方: node scripts/x-oauth2-get-user-token.js
 * ポート 3001〜3010 の空きを利用。X Developer Portal に以下をまとめて追加しておくこと:
 *   http://127.0.0.1:3001/ 〜 http://127.0.0.1:3010/
 */
const path = require("path");
const crypto = require("crypto");
const http = require("http");
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch (_) {}

const CLIENT_ID = process.env.X_API_CLIENT_SECRET_ID || process.env.X_API_CLIENT_ID;
const CLIENT_SECRET = process.env.X_API_CLIENT_SECRET;
const SCOPES = "tweet.read users.read bookmark.read bookmark.write offline.access";
const PORTS = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

function base64UrlEncode(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getPkce() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  return { codeVerifier, codeChallenge };
}

function run() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ .env に X_API_CLIENT_SECRET_ID と X_API_CLIENT_SECRET を設定してください。");
    process.exit(1);
  }

  const { codeVerifier, codeChallenge } = getPkce();
  const state = base64UrlEncode(crypto.randomBytes(16));
  let redirectUri;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1/");
    const isCallback = url.pathname === "/" || url.pathname === "/callback";
    if (!isCallback) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    const resState = url.searchParams.get("state");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (err) {
      res.writeHead(200);
      res.end(`<h1>エラー</h1><p>${err}</p><p>${url.searchParams.get("error_description") || ""}</p>`);
      server.close();
      return;
    }
    if (resState !== state) {
      res.writeHead(200);
      res.end("<h1>state 不一致</h1>");
      server.close();
      return;
    }
    if (!code) {
      res.writeHead(200);
      res.end("<h1>code がありません</h1>");
      server.close();
      return;
    }

    const tokenUrl = "https://api.x.com/2/oauth2/token";
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const body = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    }).toString();

    try {
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`
        },
        body
      });
      const data = await tokenRes.json();
      if (!tokenRes.ok) {
        res.writeHead(200);
        res.end(`<h1>トークン取得失敗</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
        server.close();
        return;
      }
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      res.writeHead(200);
      res.end(
        "<h1>OK</h1><p>このウィンドウを閉じてください。ターミナルに access_token を表示しています。</p>"
      );
      console.log("\n========== 以下を Vercel の X_API_OAUTH2_USER_ACCESS_TOKEN に貼ってください ==========\n");
      console.log(accessToken);
      console.log("\n========== 以上 ==========\n");
      if (refreshToken) {
        console.log("(refresh_token も返っています。access_token は約2時間で期限切れのため、必要なら refresh 用スクリプトを用意できます)\n");
      }
      server.close();
      process.exit(0);
    } catch (e) {
      res.writeHead(500);
      res.end(`<h1>エラー</h1><pre>${e.message}</pre>`);
      server.close();
      process.exit(1);
    }
  });

  let portIndex = 0;
  function tryListen() {
    if (portIndex >= PORTS.length) {
      console.error("❌ ポート 3001〜3010 がすべて使用中です。他のアプリを終了してから再実行してください。");
      process.exit(1);
    }
    const port = PORTS[portIndex];
    server.listen(port, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${port}/`;
      const authUrl = new URL("https://x.com/i/oauth2/authorize");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      const urlStr = authUrl.toString();
      console.log("\n※ まだなら X Developer Portal のコールバックURI に http://127.0.0.1:3001/ 〜 3010/ を追加してください。");
      console.log("※ このスクリプトは1回だけ実行し、下のURLで「許可」まで完了すること。途中で再実行すると state 不一致になる。\n");
      console.log("========== このURLをブラウザで開いてください ==========");
      console.log(urlStr);
      console.log("========== 上をコピー → アドレスバーに貼り付け → Enter ==========\n");
      const { exec } = require("child_process");
      if (process.platform === "win32") {
        exec(`cmd /c start "" "${urlStr.replace(/"/g, '""')}"`, () => {});
      } else {
        const open = process.platform === "darwin" ? "open" : "xdg-open";
        exec(`${open} "${urlStr}"`, () => {});
      }
    });
  }
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      portIndex++;
      tryListen();
    } else {
      throw err;
    }
  });
  tryListen();
}

run();
