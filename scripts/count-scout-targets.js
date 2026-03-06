const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/telegram-scout-targets.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rows = Array.isArray(data) ? data : (data.targets || []);

const total = rows.length;
const byCat = {};
const byLang = {};
for (const r of rows) {
  if (typeof r !== 'object') continue;
  const c = r.category || 'unknown';
  byCat[c] = (byCat[c] || 0) + 1;
  const lang = r.language || '(空)';
  byLang[lang] = (byLang[lang] || 0) + 1;
}

console.log('=== telegram-scout-targets 集計 ===');
console.log('総件数:', total);
console.log('');
console.log('【レイヤー別】');
for (const k of ['Admin', 'KOL', 'ActiveMember']) {
  console.log('  ' + k + ':', byCat[k] || 0);
}
for (const k of Object.keys(byCat).sort()) {
  if (!['Admin', 'KOL', 'ActiveMember'].includes(k)) console.log('  ' + k + ':', byCat[k]);
}
console.log('');
console.log('【言語別】');
const langEntries = Object.entries(byLang).sort((a, b) => b[1] - a[1]);
for (let i = 0; i < Math.min(10, langEntries.length); i++) {
  console.log('  ' + langEntries[i][0] + ':', langEntries[i][1]);
}
