#!/usr/bin/env node
/**
 * 10カ国×3レイヤー＝200件のサンプルJSONを生成（フォーマット確認・KV/APIテスト用）
 * 出力: ../../data/telegram-scout-200-sample.json
 */
const fs = require("fs");
const path = require("path");

const LANGS = [
  { code: "en", groupName: "Crypto Signals EN", country: "IN/NG" },
  { code: "ja", groupName: "ビットコイン日本語", country: "JP" },
  { code: "ko", groupName: "코인 시그널 코리아", country: "KO" },
  { code: "vi", groupName: "Crypto Vietnam", country: "VN" },
  { code: "ar", groupName: "تداول عملات UAE", country: "AR" },
  { code: "hi", groupName: "India Crypto Hub", country: "IN" },
  { code: "pt", groupName: "Cripto Brasil", country: "PT" },
  { code: "es", groupName: "Señales Cripto LATAM", country: "ES" },
  { code: "id", groupName: "Crypto Indonesia", country: "ID" },
  { code: "th", groupName: "Crypto Thailand", country: "TH" },
];

const CAP = { Admin: 5, KOL: 5, ActiveMember: 10 };

function buildRecord(lang, category, index, groupName, groupId) {
  const uid = 600000000 + LANGS.findIndex((l) => l.code === lang) * 1000 + (category === "Admin" ? index : category === "KOL" ? 10 + index : 20 + index);
  const role = category === "Admin" ? "admin" : "member";
  const names = {
    en: ["Alex", "Jordan", "Sam", "Taylor", "Casey", "Jamie", "Morgan", "Riley", "Quinn", "Drew"],
    ja: ["太郎", "花子", "健一", "美咲", "翔太", "優子", "大輔", "真由美", "拓也", "恵子"],
    ko: ["민준", "서연", "지호", "수빈", "현우", "유진", "준서", "지우", "시우", "하은"],
    vi: ["Minh", "Lan", "Hoàng", "Trang", "Nam", "Hương", "Tuấn", "Linh", "Đức", "Hà"],
    ar: ["أحمد", "فاطمة", "محمد", "سارة", "علي", "نورة", "خالد", "مريم", "عمر", "هدى"],
    hi: ["Rahul", "Priya", "Amit", "Anita", "Vikram", "Kavita", "Raj", "Sita", "Arjun", "Neha"],
    pt: ["Lucas", "Maria", "Pedro", "Ana", "Rafael", "Julia", "Bruno", "Fernanda", "Gabriel", "Camila"],
    es: ["Carlos", "Elena", "Diego", "Laura", "Miguel", "Sofia", "Javier", "Isabel", "Pablo", "Carmen"],
    id: ["Budi", "Siti", "Ahmad", "Dewi", "Agus", "Rina", "Eko", "Yanti", "Bambang", "Sri"],
    th: ["สมชาย", "สมหญิง", "วิชัย", "วรรณา", "ประเสริฐ", "มณี", "สุชาติ", "กัลยา", "อนุชา", "รัตน์"],
  };
  const nameIndex = index % 10;
  const first = names[lang] ? names[lang][nameIndex] : "User";
  const last = category === "Admin" ? (lang === "ja" ? "管理者" : "Admin") : "";
  const username = `sample_${lang}_${category.toLowerCase()}_${index}`;
  const bioKOL = category === "KOL" ? `${lang === "ja" ? "ビジネス・DM開放" : "Business | Collab | DM me"}` : null;
  return {
    user_id: uid,
    username: username,
    first_name: first,
    last_name: last || null,
    category: category,
    role: role,
    group_name: groupName,
    group_id: groupId,
    group_ref: `SampleGroup_${lang}`,
    language: lang,
    bio_snippet: bioKOL,
  };
}

const out = [];
let globalId = 700000000;
for (const { code, groupName } of LANGS) {
  const groupId = globalId++;
  for (let i = 0; i < CAP.Admin; i++) out.push(buildRecord(code, "Admin", i, groupName, groupId));
  for (let i = 0; i < CAP.KOL; i++) out.push(buildRecord(code, "KOL", i, groupName, groupId));
  for (let i = 0; i < CAP.ActiveMember; i++) out.push(buildRecord(code, "ActiveMember", i, groupName, groupId));
}

const outPath = path.resolve(__dirname, "../../data/telegram-scout-200-sample.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(`Written ${out.length} sample targets to ${outPath}`);
