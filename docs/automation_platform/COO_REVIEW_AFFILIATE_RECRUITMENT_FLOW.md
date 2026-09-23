# COOレビュー: アフィリエイター募集フロー

**作成日**: 2026-01-11  
**作成者**: COO: Cursor (Composer 1)  
**目的**: 再編成後のフローに問題がないかレビュー

---

## 🎯 現在のフロー

```
1. Grok: CSOが毎日50人×6市場のアフィリエイター候補をデータベース化
   ↓
2. GPT: CTOが毎日50人×6市場のアフィリエイター候補にDM送信
   ↓
3. アフィリエイター候補がリクルートLPにアクセス
   ↓
4. LPからWhopに遷移してアフィリエイトリンクを取得（Whop API活用）
   ↓
5. アフィリエイターがユーザー向けLPにアクセスさせる
   ↓
6. ユーザー向けLPがユーザーにセールスし、Whopチェックアウトでコンバージョン
   ↓
7. Whop Webhookでコンバージョンをカウント（Whop API活用）
```

---

## ⚠️ 問題点と改善案

### 問題1: アフィリエイター登録のタイミングが不明確

**問題**:
- ステップ4で「LPからWhopに遷移してアフィリエイトリンクを取得」とありますが、Whop APIではアフィリエイター作成ができません
- アフィリエイターがWhopに登録するタイミングが不明確

**改善案**:
```
3. アフィリエイター候補がリクルートLPにアクセス
   ↓
3.1. リクルートLPでWhopダッシュボードへの直接リンクを提供
     - アフィリエイターが自分でWhopダッシュボードに登録
     - または、Puppeteer自動化で登録（オプション）
   ↓
4. アフィリエイターがWhopに登録完了後、Whop APIでアフィリエイター情報を取得
   ↓
4.1. Whop APIで`affiliate_code`を取得してアフィリエイトリンクを生成
```

### 問題2: DM送信のタイミングと内容

**問題**:
- ステップ2でDM送信をしていますが、この時点ではアフィリエイトリンクがまだ存在しません
- DMにはリクルートLPへのリンクのみを含めるべき

**改善案**:
```
2. GPT: CTOが毎日50人×6市場のアフィリエイター候補にDM送信
   - DM内容: リクルートLPへのリンク + アフィリエイトプログラムの説明
   - アフィリエイトリンクは含めない（まだ存在しない）
```

### 問題3: アフィリエイトリンク生成のタイミング

**問題**:
- ステップ4でアフィリエイトリンクを取得するとありますが、Whop APIでアフィリエイター情報を取得するには、アフィリエイターが既にWhopに登録されている必要があります

**改善案**:
```
4. アフィリエイターがWhopに登録完了
   ↓
4.1. Whop APIでアフィリエイター情報を取得（`getWhopAffiliates`）
   ↓
4.2. `affiliate_code`を取得してアフィリエイトリンクを生成
   ↓
4.3. アフィリエイターにアフィリエイトリンクを送信（オプション）
```

### 問題4: アフィリエイター登録の自動化

**問題**:
- アフィリエイターが自分でWhopダッシュボードに登録する必要がある
- 大規模運用（毎日50人×6市場 = 300人）では、手動登録は非現実的

**改善案**:
```
3. アフィリエイター候補がリクルートLPにアクセス
   ↓
3.1. リクルートLPで登録フォームを提供（email, telegramUserIdを収集）
   ↓
3.2. 登録フォーム送信後、Puppeteer自動化でWhopダッシュボードに登録
   ↓
3.3. 登録完了後、Whop APIでアフィリエイター情報を取得
   ↓
3.4. アフィリエイトリンクを生成してアフィリエイターに送信
```

---

## ✅ 改善後のフロー

### 完全フロー（改善版）

```
1. Grok: CSOが毎日50人×6市場のアフィリエイター候補をデータベース化
   ↓
2. GPT: CTOが毎日50人×6市場のアフィリエイター候補にDM送信
   - DM内容: リクルートLPへのリンク + アフィリエイトプログラムの説明
   ↓
3. アフィリエイター候補がリクルートLPにアクセス
   ↓
3.1. リクルートLPで登録フォームを提供（email, telegramUserIdを収集）
   ↓
3.2. 登録フォーム送信後、Puppeteer自動化でWhopダッシュボードに登録
   ↓
3.3. 登録完了後、Whop APIでアフィリエイター情報を取得
   ↓
3.4. `affiliate_code`を取得してアフィリエイトリンクを生成
   ↓
3.5. アフィリエイターにアフィリエイトリンクを送信（Telegram DM）
   ↓
4. アフィリエイターがユーザー向けLPにアクセスさせる
   - アフィリエイターが取得したアフィリエイトリンクをユーザーにシェア
   - URL: `https://your-domain.com/EN?ref=AFFILIATE_CODE_123`
   ↓
5. ユーザー向けLPがユーザーにセールスし、Whopチェックアウトでコンバージョン
   - `WhopCheckoutEmbed`が`ref`パラメータから`affiliateCode`を取得（既存実装）
   - `WhopCheckout`コンポーネントが`affiliateCode`をWhopに送信（既存実装）
   ↓
6. Whop Webhookでコンバージョンをカウント（Whop API活用）
   - `membership.created`イベントに`affiliate_code`が含まれる
   - Whop APIでアフィリエイター情報を取得
   - データベースにコンバージョンを記録
```

---

## 📋 実装が必要な追加機能

### 1. リクルートLPでの登録フォーム

**ファイル**: `orientation-lp/app/affiliate/[market]/page.tsx`

**実装内容**:
```typescript
// 登録フォームを追加
<form onSubmit={handleSubmit}>
  <input type="email" name="email" required />
  <input type="text" name="telegramUserId" required />
  <button type="submit">アフィリエイター登録</button>
</form>

// フォーム送信後、APIエンドポイントに送信
const handleSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch('/api/affiliate/register', {
    method: 'POST',
    body: JSON.stringify({
      email: e.target.email.value,
      telegramUserId: e.target.telegramUserId.value,
      market: marketCode,
    }),
  });
};
```

### 2. アフィリエイター登録APIエンドポイント

**ファイル**: `app/api/affiliate/register/route.ts`

**実装内容**:
```typescript
export async function POST(request: NextRequest) {
  const { email, telegramUserId, market, productId } = await request.json();
  
  // Step 1: Puppeteer自動化でWhopダッシュボードに登録
  const affiliateId = await registerAffiliateViaDashboard({
    email,
    telegramUserId,
    productId,
  });
  
  // Step 2: Whop APIでアフィリエイター情報を取得
  const affiliates = await getWhopAffiliates({ productId });
  const affiliate = affiliates.find(a => a.id === affiliateId);
  
  if (!affiliate) {
    return NextResponse.json(
      { error: 'Affiliate not found' },
      { status: 404 }
    );
  }
  
  // Step 3: アフィリエイトリンクを生成
  const affiliateLink = await generateAffiliateLink({
    affiliateCode: affiliate.code,
    productId,
    market,
  });
  
  // Step 4: アフィリエイターにアフィリエイトリンクを送信
  await sendTelegramMessage({
    userId: telegramUserId,
    language: market,
    message: `🎉 アフィリエイト登録が完了しました！\n\nあなたのアフィリエイトリンク:\n${affiliateLink}`,
  });
  
  return NextResponse.json({
    success: true,
    affiliateId,
    affiliateCode: affiliate.code,
    affiliateLink,
  });
}
```

---

## ✅ 改善後のチェックリスト

### Phase 1: リクルートLPの拡張

- [ ] リクルートLPに登録フォームを追加
- [ ] フォーム送信後のAPIエンドポイント実装

### Phase 2: アフィリエイター登録APIの実装

- [ ] `/api/affiliate/register`エンドポイントの実装
- [ ] Puppeteer自動化でWhopダッシュボードに登録
- [ ] Whop APIでアフィリエイター情報を取得
- [ ] アフィリエイトリンクを生成して送信

### Phase 3: フローの統合

- [ ] 完全フロー（改善版）の実装
- [ ] エラーハンドリングの追加
- [ ] テストの実行

---

## 🎯 結論

### 問題点のまとめ

1. ⚠️ **アフィリエイター登録のタイミングが不明確** → 改善案を提示
2. ⚠️ **DM送信のタイミングと内容** → 改善案を提示
3. ⚠️ **アフィリエイトリンク生成のタイミング** → 改善案を提示
4. ⚠️ **アフィリエイター登録の自動化** → 改善案を提示

### 改善後のフロー

- ✅ **明確なタイミング**: 各ステップのタイミングが明確
- ✅ **自動化**: Puppeteer自動化でWhopダッシュボードに登録
- ✅ **Whop API活用**: Whop APIでアフィリエイター情報を取得してリンク生成
- ✅ **完全自動化**: アフィリエイター登録からリンク送信まで自動化

### 推奨アクション

1. **即座に実装**: リクルートLPに登録フォームを追加
2. **1週間後**: アフィリエイター登録APIの実装
3. **2週間後**: 完全フローの統合とテスト

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ レビュー完了、改善案提示
