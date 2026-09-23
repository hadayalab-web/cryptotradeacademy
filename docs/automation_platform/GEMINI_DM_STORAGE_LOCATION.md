# Gemini CMOが作成したDMメッセージの格納場所

**作成日時**: 2026-01-13  
**目的**: Gemini CMOが作成したDMメッセージの格納場所を明確化

---

## 📍 現在の実装

### 作成場所

**スクリプト**: `scripts/complete-6markets-whop-and-send-dm.ts`  
**関数**: `generateSalesLettersBatch`  
**行番号**: 約408-539行

### 保存場所

**現在**: データベースの `AffiliateCandidate.notes` フィールド

```typescript
// 現在の実装（約611行目）
const notesContent = `【配信準備完了 - GPT（CTO）- フォールバック生成】\n準備日時: ${new Date().toISOString()}\n優先チャネル: ${preferredChannel}\nTelegram User ID: ${telegramUserId || 'N/A'}\nEmail: ${email || 'N/A'}\n\nDMメッセージ:\n${dmMessage}`;

await prisma.affiliateCandidate.update({
  where: { id: existing.id },
  data: {
    notes: notesContent, // ← ここに保存
  },
});
```

---

## 🎯 新しい設計（提案）

### 保存場所

**ファイル**: `data/dm-messages-en.json`

### 実装方法

```typescript
// scripts/complete-6markets-whop-and-send-dm.ts に追加

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * DMメッセージをJSONファイルに保存
 */
async function saveDMMessageToFile(market: string, messageData: {
  username: string;
  message_id: string;
  created_at: string;
  created_by: string;
  preferred_channel: string;
  dm_message: string;
}) {
  const filePath = join(__dirname, '..', 'data', `dm-messages-${market.toLowerCase()}.json`);
  
  // 既存のファイルを読み込む
  let messages: any[] = [];
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      const data = JSON.parse(content);
      messages = data.messages || [];
    } catch (e) {
      messages = [];
    }
  }
  
  // 新しいメッセージを追加
  messages.push(messageData);
  
  // ファイルに保存
  fs.writeFileSync(filePath, JSON.stringify({
    messages: messages
  }, null, 2), 'utf-8');
  
  console.log(`✅ DMメッセージを保存: ${filePath} (${messages.length}件)`);
}

// generateSalesLettersBatch関数内で使用
async function generateSalesLettersBatch(market: string, users: any[], vslScript: string, batchSize: number = 50): Promise<Map<string, string>> {
  // ... 既存のコード ...
  
  // Gemini CMOがセールスレターを生成後
  salesLetters.forEach((item: any) => {
    if (item.username && item.salesLetter) {
      results.set(item.username, item.salesLetter);
      
      // ✅ 新しい実装: JSONファイルに保存
      saveDMMessageToFile(market, {
        username: item.username,
        message_id: `msg_${Date.now()}_${item.username}`,
        created_at: new Date().toISOString(),
        created_by: 'Gemini CMO',
        preferred_channel: users.find(u => u.username === item.username)?.preferredChannel || 'TG',
        dm_message: item.salesLetter
      });
    }
  });
  
  return results;
}
```

---

## 📁 ファイル構成

```
data/
├── user-list-en.csv          # ユーザーリスト（DMメッセージなし）
└── dm-messages-en.json       # Gemini CMOが作成したDMメッセージ
```

---

## 🔄 ワークフロー

1. **Grok CSO**: ユーザーリストを収集 → `data/user-list-en.csv`
2. **Gemini CMO**: DMメッセージを生成 → `data/dm-messages-en.json`
3. **GPT CTO**: ユーザーリストとDMメッセージを結合して送信準備
4. **DM送信**: `scripts/send-en-dm-csv.ts` が両方のファイルを読み込んで送信

---

## ✅ メリット

1. **分離**: ユーザーリストとDMメッセージが独立
2. **追跡**: Gemini CMOが作成したDMメッセージを追跡可能
3. **再利用**: 同じメッセージを複数ユーザーに適用可能
4. **管理**: メッセージの更新が容易

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
