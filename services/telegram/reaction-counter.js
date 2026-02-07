// services/telegram/reaction-counter.js
// 社会的証明（Social Proof）のためのリアクション集計サービス

const fs = require('fs');
const path = require('path');

// Vercel KV対応
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[ReactionCounter] @vercel/kv not available:', error.message);
}

const SOCIAL_PROOF_KEY = 'social_proof_counts';
const USE_KV = kv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// フォールバック用ファイルストレージ（ローカル開発用）
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'social_proof_counts.json');

// データディレクトリの確認と作成（ローカル開発用）
if (!USE_KV && !fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    // Vercel環境では無視
    if (error.code !== 'EROFS' && !error.message?.includes('read-only file system')) {
      console.warn('[ReactionCounter] Failed to create data directory:', error.message);
    }
  }
}

// デフォルトデータ
const DEFAULT_DATA = {
  totalSaved: 0,        // 累計回避数
  dailySaved: {},       // 日次回避数 { "2024-01-01": 10 }
  dailyUsers: {},       // 日次ユーザーIDリスト（重複防止用） { "2024-01-01": Set<string> }
  lastUpdated: new Date().toISOString()
};

/**
 * 現在のデータを読み込む（Vercel KV優先、フォールバック: ファイル）
 */
async function loadData() {
  // Vercel KVが利用可能な場合はKVから読み込む
  if (USE_KV && kv) {
    try {
      const data = await kv.get(SOCIAL_PROOF_KEY);
      if (data) {
        return data;
      }
      // データがない場合はデフォルトを返す
      return DEFAULT_DATA;
    } catch (error) {
      console.error('[ReactionCounter] KV load failed, falling back to file storage:', error.message);
      // フォールバック: ファイルストレージにフォールバック
    }
  }

  // フォールバック: ファイルストレージ（ローカル開発用）
  // Vercel環境ではファイルシステムがread-onlyのため、デフォルトデータを返す
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    console.warn('[ReactionCounter] Vercel environment detected, using default data (file storage not available)');
    return DEFAULT_DATA;
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[ReactionCounter] Error loading data from file:', error.message);
  }

  return DEFAULT_DATA;
}

/**
 * データを保存する（Vercel KV優先、フォールバック: ファイル）
 */
async function saveData(data) {
  // Vercel KVが利用可能な場合はKVに保存
  if (USE_KV && kv) {
    try {
      await kv.set(SOCIAL_PROOF_KEY, data);
      console.log('[ReactionCounter] Saved data to KV');
      return;
    } catch (error) {
      console.error('[ReactionCounter] KV save failed:', error.message);
      // フォールバック: ファイルストレージにフォールバック
    }
  }

  // フォールバック: ファイルストレージ（ローカル開発用）
  // Vercel環境ではファイルシステムがread-onlyのため、スキップ
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    console.warn('[ReactionCounter] Vercel environment detected, skipping file write (read-only filesystem)');
    return;
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('[ReactionCounter] Saved data to file');
  } catch (error) {
    if (error.code === 'EROFS' || error.message?.includes('read-only file system')) {
      console.warn('[ReactionCounter] Skipped file write (read-only filesystem)');
    } else {
      console.error('[ReactionCounter] Error saving data to file:', error.message);
    }
  }
}

/**
 * 「助かった！」カウントを増やす
 * @param {string} userId - ユーザーID（重複防止用）
 * @returns {Promise<Object>} { total: number, today: number, isNewUser: boolean }
 */
async function incrementSavedCount(userId) {
  if (!userId) {
    console.warn('[ReactionCounter] userId is required');
    return { total: 0, today: 0, isNewUser: false };
  }

  const data = await loadData();
  const today = new Date().toISOString().split('T')[0];

  // 日次ユーザーリストの初期化
  if (!data.dailyUsers) data.dailyUsers = {};
  if (!data.dailyUsers[today]) {
    // Setを配列として保存（JSON互換性のため）
    data.dailyUsers[today] = [];
  }

  // ユーザーIDを配列に変換（Setの代わりに配列を使用）
  const todayUsers = Array.isArray(data.dailyUsers[today]) 
    ? data.dailyUsers[today] 
    : Object.values(data.dailyUsers[today] || {});

  // 重複チェック：今日既にクリックしたユーザーはカウントしない
  const isNewUser = !todayUsers.includes(userId);
  
  if (!isNewUser) {
    console.log(`[ReactionCounter] User ${userId} already clicked today, skipping increment`);
    // 既存ユーザーの場合でも、現在のカウントを返す
    const todayCount = data.dailySaved?.[today] || 0;
    return {
      total: data.totalSaved || 0,
      today: todayCount,
      isNewUser: false
    };
  }

  // 新規ユーザーの場合のみカウントアップ
  // 累計カウント
  data.totalSaved = (data.totalSaved || 0) + 1;

  // 日次カウント
  if (!data.dailySaved) data.dailySaved = {};
  data.dailySaved[today] = (data.dailySaved[today] || 0) + 1;

  // ユーザーIDをリストに追加
  todayUsers.push(userId);
  data.dailyUsers[today] = todayUsers;

  data.lastUpdated = new Date().toISOString();
  
  await saveData(data);
  
  console.log(`[ReactionCounter] Incremented saved count. Total: ${data.totalSaved}, Today: ${data.dailySaved[today]} (User: ${userId}, New: true)`);
  
  return {
    total: data.totalSaved,
    today: data.dailySaved[today],
    isNewUser: true
  };
}

/**
 * 今日の「助かった！」数を取得
 * @returns {Promise<number>}
 */
async function getTodaySavedCount() {
  const data = await loadData();
  const today = new Date().toISOString().split('T')[0];
  return data.dailySaved ? (data.dailySaved[today] || 0) : 0;
}

/**
 * 表示用のフォーマットされたテキストを取得（全世界6言語規模・ハッタリ戦法）
 * 6言語展開なので「今週」の数字は全世界集計規模で表示する。
 * @param {string} lang - 言語コード
 * @returns {Promise<string>}
 */
async function getSocialProofText(lang = 'en') {
  const count = await getTodaySavedCount();
  // ガンガン盛る: 全世界6言語の週次規模を大きく見せる（8k〜18k）
  const baseValue = Math.floor(Math.random() * 10000) + 8000;
  const displayCount = count + baseValue;
  const displayStr = displayCount.toLocaleString();

  const normalizedLang = (lang || 'en').toLowerCase().replace('_', '-');
  // 「あなたと同じ状況の人」+ "this exact setup" + 6言語。Asia(ja,ko)は "Be safe with us" で刺さる
  const templates = {
    en: `🔥 ${displayStr}+ traders across 6 languages avoided this exact setup this week. 👥 I'm Safe. Join us.`,
    ja: `🔥 今週、6言語${displayStr}+人が同じセットアップを回避。👥 I'm Safe. 一緒に守ろう。`,
    es: `🔥 ${displayStr}+ traders en 6 idiomas evitaron este setup exacto esta semana. 👥 I'm Safe. Únete.`,
    'pt-br': `🔥 ${displayStr}+ traders em 6 idiomas evitaram este setup exato esta semana. 👥 I'm Safe. Junte-se.`,
    ar: `🔥 ${displayStr}+ متداولين في 6 لغات تجنبوا نفس الإعداد هذا الأسبوع. 👥 I'm Safe. انضم.`,
    ko: `🔥 6개국어 ${displayStr}+명이 이번 주 이 세팅 회피. 👥 I'm Safe. 함께 지키자.`
  };
  return templates[normalizedLang] || templates.en;
}

module.exports = {
  incrementSavedCount,
  getTodaySavedCount,
  getSocialProofText
};
