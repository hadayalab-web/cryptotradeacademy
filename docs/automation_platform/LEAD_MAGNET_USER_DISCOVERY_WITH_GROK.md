# Grokを使ったリードマグネットユーザー発見戦略

**作成日**: 2026-01-13  
**目的**: Grok（X AI）を使ってX（Twitter）とTelegramで潜在的なリードマグネットユーザーを発見する方法

---

## 🎯 概要

既存のアフィリエイター候補検索の実装をベースに、リードマグネット（無料ミニマム版）の潜在ユーザーを発見できます。

---

## ✅ 既存実装の確認

### アフィリエイター候補検索（既存）

**実装場所**:
- `workflows/affiliate-recruitment/src/utils/grok-enhanced.ts`
- `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-search/route.ts`

**機能**:
- Grok APIでX/Telegram/YouTubeの候補を検索
- X統合ツール（`x_keyword_search`, `x_semantic_search`）を使用
- セマンティック検索で関連性の高い候補を発見

---

## 💡 リードマグネット用のユーザー検索

### 検索クエリ例

**X（Twitter）での検索**:
```
- "BTC trader" "looking for signals"
- "crypto trading" "free alerts"
- "bitcoin trap" "avoid losses"
- "crypto signals" "free"
- "BTC analysis" "daily"
```

**Telegramでの検索**:
```
- "crypto signals group"
- "BTC trading alerts"
- "free crypto signals"
- "bitcoin analysis channel"
```

### 検索条件

**対象ユーザー**:
- フォロワー数: 1,000-50,000（適度な影響力）
- エンゲージメント率: 5%以上
- コンテンツ: BTC/暗号通貨関連
- 言語: 市場別（EN/AR/KO/JA/ES/PT-BR）

**除外条件**:
- 既存の有料版ユーザー
- 既に無料版に登録済みのユーザー
- スパムアカウント

---

## 🔧 実装方法

### 1. 既存の検索機能を活用

```javascript
// workflows/affiliate-recruitment/src/utils/grok-enhanced.ts をベースに

/**
 * リードマグネット用のユーザー検索
 */
async function searchLeadMagnetUsers(options: {
  searchQueries: string[];
  platforms: string[]; // ['X', 'Telegram']
  marketCode: MarketCode;
  maxUsers: number;
  minEngagementRate: number;
}): Promise<{
  users: LeadMagnetUser[];
  total: number;
}> {
  const {
    searchQueries,
    platforms,
    marketCode,
    maxUsers = 100,
    minEngagementRate = 5,
  } = options;

  // Grok APIで検索（既存の実装を活用）
  const searchResult = await searchAffiliateCandidates({
    search_query: searchQueries[0],
    platforms,
    max_candidates: maxUsers,
    min_match_score: 5, // リードマグネットは低めのスコアでもOK
    marketCode,
  });

  // リードマグネット用にフィルタリング
  const leadMagnetUsers = searchResult.candidates
    .filter(candidate => {
      // エンゲージメント率チェック
      if (candidate.engagement_rate < minEngagementRate) return false;
      
      // フォロワー数チェック（1K-50K）
      if (candidate.follower_count < 1000 || candidate.follower_count > 50000) return false;
      
      // 既存ユーザーチェック（重複除外）
      // TODO: DBで既存ユーザーを確認
      
      return true;
    })
    .map(candidate => ({
      id: candidate.id,
      username: candidate.username,
      displayName: candidate.name,
      platform: candidate.platform, // 'X' or 'Telegram'
      telegramUserId: candidate.telegram_user_id,
      email: candidate.email,
      followerCount: candidate.follower_count,
      engagementRate: candidate.engagement_rate,
      market: marketCode,
      profileUrl: candidate.profile_url,
      matchScore: candidate.match_score,
    }));

  return {
    users: leadMagnetUsers,
    total: leadMagnetUsers.length,
  };
}
```

### 2. Telegram Bot経由での自動招待

```javascript
/**
 * 発見したユーザーを無料版チャットグループに招待
 */
async function inviteUsersToFreeMinimal(users: LeadMagnetUser[]) {
  for (const user of users) {
    if (user.platform === 'Telegram' && user.telegramUserId) {
      try {
        // Telegram Bot APIでユーザーをチャットグループに追加
        await addUserToChatGroup(user.telegramUserId, TELEGRAM_CHAT_ID_MINIMAL);
        
        // ウェルカムメッセージ送信
        await sendMessageToAsset(
          `✅ 無料版に登録しました！\n\n` +
          `毎日Trap Scoreをお届けします。`,
          'MINIMAL'
        );
      } catch (error) {
        console.error(`Failed to invite user ${user.username}:`, error);
      }
    }
  }
}
```

### 3. X（Twitter）経由でのリーチアウト

```javascript
/**
 * X経由でリードマグネットを紹介
 */
async function reachOutViaX(users: LeadMagnetUser[]) {
  for (const user of users) {
    if (user.platform === 'X' && user.profileUrl) {
      // XのDMまたはリプライで無料版を紹介
      // 注意: X APIの制限に注意
      const message = `無料でBTC Trap Scoreを毎日お届けします！\n` +
        `Telegram Bot: @CryptoSignal_AI_Official_bot\n` +
        `コマンド: /free`;
      
      // TODO: X APIでDM送信またはリプライ
    }
  }
}
```

---

## 📊 検索戦略

### Phase 1: キーワード検索

**X（Twitter）**:
- `x_keyword_search`: キーワードベースの検索
- 例: "BTC trader", "crypto signals", "bitcoin trap"

**Telegram**:
- チャンネル/グループの検索
- 例: "crypto signals", "BTC alerts"

### Phase 2: セマンティック検索

**X（Twitter）**:
- `x_semantic_search`: 意味ベースの検索
- 例: "looking for free crypto trading alerts"
- "want to avoid BTC traps"

**メリット**:
- より関連性の高いユーザーを発見
- キーワードに依存しない検索

---

## 🎯 実装フロー

### 1. ユーザー検索（Grok）
```
Grok API呼び出し
  ↓
X/Telegramで検索
  ↓
候補リスト取得
  ↓
フィルタリング（エンゲージメント、フォロワー数）
  ↓
重複チェック（既存ユーザー除外）
  ↓
リードマグネットユーザーリスト
```

### 2. 自動招待（Telegram）
```
Telegramユーザーを検出
  ↓
Botがチャットグループに追加
  ↓
ウェルカムメッセージ送信
  ↓
定期配信開始
```

### 3. リーチアウト（X）
```
Xユーザーを検出
  ↓
DMまたはリプライで紹介
  ↓
Telegram Botへのリンクを共有
  ↓
ユーザーがBotで登録
```

---

## 📋 実装チェックリスト

### Phase 1: ユーザー検索機能
- [ ] Grok APIを使った検索機能の実装
- [ ] X統合ツール（`x_keyword_search`, `x_semantic_search`）の活用
- [ ] フィルタリングロジック（エンゲージメント、フォロワー数）
- [ ] 重複チェック（既存ユーザー除外）

### Phase 2: 自動招待機能
- [ ] Telegram Bot経由の自動招待
- [ ] チャットグループへの自動追加
- [ ] ウェルカムメッセージの送信

### Phase 3: リーチアウト機能
- [ ] X API経由のDM送信（オプション）
- [ ] リプライ機能（オプション）

---

## 💡 既存実装の活用

### アフィリエイター候補検索のコードを再利用

**既存の実装**:
- `workflows/affiliate-recruitment/src/utils/grok-enhanced.ts`
- `searchAffiliateCandidates`関数

**リードマグネット用にカスタマイズ**:
- 検索クエリを変更（"affiliate" → "free signals"）
- フィルタリング条件を緩和（より多くのユーザーを対象）
- プラットフォームを`['X', 'Telegram']`に限定

---

## 🎯 期待される効果

### ユーザー獲得
- **X経由**: 月間50-200名（見込み）
- **Telegram経由**: 月間30-100名（見込み）
- **合計**: 月間80-300名（見込み）

### コンバージョン率
- **無料→有料**: 5-10%（見込み）
- **リテンション**: 30-50%（見込み）

---

## ⚠️ 注意事項

1. **X APIの制限**
   - DM送信には制限がある
   - レート制限に注意

2. **Telegram Botの権限**
   - チャットグループへの追加にはBotが管理者権限が必要
   - ユーザーの同意が必要な場合がある

3. **スパム対策**
   - 過度なDM送信は避ける
   - ユーザーの同意を尊重

---

## 📝 実装例

### リードマグネットユーザー検索API

```typescript
// app/api/workflows/lead-magnet-search/route.ts

export async function POST(request: NextRequest) {
  const { marketCode, searchQueries, maxUsers = 100 } = await request.json();

  // Grok APIで検索
  const users = await searchLeadMagnetUsers({
    searchQueries,
    platforms: ['X', 'Telegram'],
    marketCode,
    maxUsers,
    minEngagementRate: 5,
  });

  // Telegramユーザーを自動招待
  const telegramUsers = users.users.filter(u => u.platform === 'Telegram');
  await inviteUsersToFreeMinimal(telegramUsers);

  return NextResponse.json({
    success: true,
    usersFound: users.total,
    invited: telegramUsers.length,
  });
}
```

---

**状態**: ✅ 戦略作成完了 - Grokを使ったユーザー発見が可能
