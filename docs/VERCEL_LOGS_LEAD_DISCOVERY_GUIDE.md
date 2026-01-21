# Vercelログでリード獲得数を確認する方法 - 2026-01-21
**作成日時**: 2026-01-21  
**目的**: Vercel DashboardのLogsでリード獲得数の詳細を確認する方法

---

## 📊 Vercelログで確認できる情報

### リード発見プロセスのログ

以下のログがVercel Dashboard → Logsで確認できます：

#### 1. リード発見開始時のログ

```
[Lead Discovery] Starting lead discovery process...
[Lead Discovery] Environment: LEAD_DISCOVERY_SEND_REPORT=true (default)
[Lead Discovery] Environment: LEAD_DISCOVERY_LANGUAGES=en,es,pt-br,ar,ja,ko (default)
[Lead Discovery] Environment: LEAD_DISCOVERY_MAX_SOURCES=50 (default)
[Lead Discovery] Processing 6 languages: en, es, pt-br, ar, ja, ko
```

#### 2. 言語別リード発見数のログ

```
[Lead Discovery] Searching 50 sources for en language
[X Lead Discovery] Searching leads with Grok (lang: en, maxResults: 50)
[X Lead Discovery] Grok returned 45 sources
[X Lead Discovery] Extracted 38 leads from 45 sources
[X Lead Discovery] Perfect matches: 12
[X Lead Discovery] Leads with tweetId: 35
[Lead Discovery] Found 38 leads for en language
[Lead Discovery] Perfect matches: 12
[Lead Discovery] Leads with tweetId: 35
```

#### 3. リード記録・送信状況のログ

```
[Lead Discovery] Recorded lead: abc123 (@username, tweetId: 1234567890)
[Lead Discovery] Perfect match lead found, sending VSL1 immediately: @username (tweetId: 1234567890)
[Lead Discovery] ✅ VSL1 sent successfully to lead: abc123 (@username)
[Lead Discovery] Lead queued (not perfect match): @username
```

#### 4. 言語別サマリーログ

```
[Lead Discovery] Processed 38 leads for en:
[Lead Discovery]   - Recorded: 38
[Lead Discovery]   - Queued: 38
[Lead Discovery]   - Sent (VSL1): 12
[Lead Discovery]   - Errors: 0
```

#### 5. 最終サマリーログ

```
[Lead Discovery] Total leads discovered: 228
[Lead Discovery] Total VSL1 sent: 72
[Lead Discovery] Total errors: 0
```

---

## 🔍 Vercel Dashboardでの確認方法

### 1. Vercel Dashboardにアクセス

1. Vercel Dashboard → プロジェクトを選択
2. **Logs**タブをクリック
3. フィルターで`/api/lead-discovery`を検索

### 2. 確認すべきログパターン

#### リード発見数の確認

**検索キーワード**: `Found X leads for`
- 例: `Found 38 leads for en language`
- 各言語のリード発見数が表示される

**検索キーワード**: `Total leads discovered`
- 全体のリード発見数が表示される

#### Perfect Match数の確認

**検索キーワード**: `Perfect matches`
- 例: `Perfect matches: 12`
- ドンピシャリードの数が表示される

#### VSL1送信数の確認

**検索キーワード**: `VSL1 sent successfully`
- 例: `✅ VSL1 sent successfully to lead: abc123`
- VSL1が実際に送信されたリード数が確認できる

#### エラー数の確認

**検索キーワード**: `Errors`
- 例: `- Errors: 0`
- エラーが発生したリード数が確認できる

---

## 📈 ログから収集できるメトリクス

### 日次メトリクス

1. **総リード発見数**: 全言語の合計
2. **言語別リード発見数**: 各言語のリード発見数
3. **Perfect Match数**: ドンピシャリードの数
4. **VSL1送信数**: 実際にVSL1が送信された数
5. **エラー数**: エラーが発生したリード数
6. **tweetIdありのリード数**: VSL1送信可能なリード数

### 週次メトリクス

1. **週次リード発見数**: 1週間の合計
2. **週次VSL1送信数**: 1週間の合計
3. **週次エラー数**: 1週間の合計
4. **CVR**: VSL1送信数 ÷ リード発見数

---

## 🎯 目標値との比較

### 日次目標

- **リード発見数**: 200-300件/日
- **VSL1送信数**: 60-90件/日（CVR 30%想定）
- **Perfect Match数**: 40-60件/日（約20%）

### 週次目標

- **リード発見数**: 1,400-2,100件/週
- **VSL1送信数**: 420-630件/週（CVR 30%想定）
- **Perfect Match数**: 280-420件/週（約20%）

---

## 💡 ログの活用方法

### 1. 問題の早期発見

- **エラー数の増加**: エラーが増えている場合は、原因を特定
- **リード発見数の減少**: Grok APIやキーワード検出に問題がある可能性
- **VSL1送信数の減少**: X APIやレート制限に問題がある可能性

### 2. パフォーマンスの最適化

- **Perfect Match率**: Perfect Match率が低い場合、Grok APIプロンプトの最適化
- **tweetId取得率**: tweetIdがないリードが多い場合、Grok APIプロンプトの最適化
- **言語別パフォーマンス**: 特定の言語でリード発見数が少ない場合、キーワードの最適化

### 3. 収益予測

- **リード発見数**: 収益予測の基礎データ
- **CVR**: 実際のCVRを確認して、収益予測を調整
- **Perfect Match率**: 高品質リードの割合を確認

---

## 🔍 ログの検索例

### 例1: 今日のリード発見数を確認

**検索クエリ**: `Found.*leads for`
**期間**: 過去24時間

**結果例**:
```
Found 38 leads for en language
Found 35 leads for es language
Found 32 leads for pt-br language
Found 28 leads for ar language
Found 25 leads for ja language
Found 22 leads for ko language
```

**合計**: 180件/日

### 例2: Perfect Match数を確認

**検索クエリ**: `Perfect matches:`
**期間**: 過去24時間

**結果例**:
```
Perfect matches: 12
Perfect matches: 10
Perfect matches: 8
Perfect matches: 7
Perfect matches: 6
Perfect matches: 5
```

**合計**: 48件/日（Perfect Match率: 約27%）

### 例3: VSL1送信数を確認

**検索クエリ**: `VSL1 sent successfully`
**期間**: 過去24時間

**結果例**:
```
✅ VSL1 sent successfully to lead: abc123 (@username)
✅ VSL1 sent successfully to lead: def456 (@username2)
...
```

**合計**: 60件/日（CVR: 約33%）

---

## 📝 まとめ

Vercel DashboardのLogsで、以下の情報を確認できます：

1. ✅ **リード発見数**: 言語別、全体
2. ✅ **Perfect Match数**: ドンピシャリードの数
3. ✅ **VSL1送信数**: 実際に送信された数
4. ✅ **エラー数**: エラーが発生した数
5. ✅ **tweetId取得率**: VSL1送信可能なリードの割合

これらの情報を活用して、リード獲得機能のパフォーマンスを監視し、収益化を最適化できます。

---

## 🚀 次のステップ

1. **Vercel Dashboard → Logsで確認**: 次回のリード発見実行（2時間ごと）でログを確認
2. **CEOレポートと比較**: CEOレポートの数値とログの数値を比較
3. **問題の早期発見**: エラーや異常値があれば、すぐに対応
