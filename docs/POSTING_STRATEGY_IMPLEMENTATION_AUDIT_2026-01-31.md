# 投稿まわり Gemini/Grok 戦略の実装密度監査

**作成日**: 2026-01-31  
**目的**: 「表面上だけでスカスカ」かどうかを、コードでの実行 vs プロンプトだけ で整理する。

---

## 0. Grok と Gemini の役割分担

| モデル | 得意なこと | 苦手なこと |
|--------|------------|------------|
| **Grok** | X（Twitter）アルゴリズムの解析。チート術（アルゴリズムの穴・最適化ポイント）を見つけるところまで得意。 | 攻略のための**コンテンツ戦略**を考えるのは不得手。 |
| **Gemini** | 攻略のための**コンテンツ戦略**（何を・どう出して勝つか）を考えるのが得意。 | アルゴリズムの細かい穴掘り・チート術の列挙は Grok に任せる方がよい。 |

→ 実装では「Grok = アルゴリズム・チート術」「Gemini = コンテンツ戦略」と役割を分けて使う。

---

## 1. 結論（要約）

- **コードで確実に効いている**: 100/15min キャップ、getPeakMapForHour・人数制限、ジッター、Whop チェックアウト優先、140文字切り詰め時の CTA/リンク保持。
- **プロンプト任せ（コードで保証していない）**: 質問 CTA 必須、メディア優先、最適化戦略の反映。Grok/Gemini の出力を検証・補正していない。
- **戦略はあるが未接続**: スレッド戦略（1 メイン + 3 リプライ）、メディア比率（動画 10x / ポール 4x / 画像 2x）。定義はあるが引用リポスト投稿フローでは未使用。

→ **Composer クオリティ** の指摘と整合的。コメント・プロンプトでの「戦略」は多いが、投稿パイプラインでコードが強制している部分は限定的。

---

## 2. コードで確実に効いているもの

| 項目 | 場所 | 内容 |
|------|------|------|
| **100/15min 厳守** | postTracker + x-quote-repost | getPostCountInLast15Min、count+targetCount>100 でスキップ。 |
| **ピークマップ・人数** | optimization.js, influencerStrategy.js | getPeakMapForHour、getInfluencerCountForLang で 8/9/20–22 時など制限。 |
| **ジッター** | x-quote-repost.js | 0–15 分ランダム遅延を実行前に適用。 |
| **Whop チェックアウト優先** | x-quote-repost, x-post-minimal-version, x-post-free-report | minimalCheckoutUrl を優先、未設定時のみ t.me。 |
| **140 文字時の CTA/リンク保持** | services/x/client.js (postQuoteTweet) | 切り詰め時に `?` と URL を残すロジックあり。 |

---

## 3. プロンプト任せ（コードで保証していない）

| 項目 | 現状 | ギャップ |
|------|------|----------|
| **質問 CTA 必須** | Grok プロンプトで「MUST include open-ended question CTA」と指示。 | 投稿前の検証なし。`?` が含まれるか・末尾付近にあるかのチェックや、欠けていればデフォルト CTA を付与する処理がない。 |
| **最適化戦略の反映** | optimizeContentAndFunnel の結果を **プロンプトに渡しているだけ**。 | 戦略を「条件分岐やバリデーション」に使っていない。Grok が無視すればそのまま投稿される。 |
| **メディア優先（80% 等）** | Grok プロンプトでメディア・reply depth を推奨。 | **引用リポストでは mediaIds を一切渡していない**（postQuoteTweet(quoteText, influencer.tweetId) の 2 引数のみ）。API は media 対応済みでも未使用。 |

---

## 4. 戦略はあるが投稿フローに未接続

| 項目 | 定義場所 | 未使用の箇所 |
|------|----------|--------------|
| **スレッド戦略（1 メイン + 3 リプライ）** | optimization.js `getThreadStrategy(lang)`。AR/JA は単一、他は replyCount: 3。 | **x-quote-repost.js では参照していない**。引用リポストは「1 インフルエンサー = 1 ツイート」のみ。x-post-free-report.js では getThreadStrategy を使用。 |
| **メディア比率（動画 10x / ポール 4x / 画像 2x）** | optimization.js コメント・getContentFormat 等。 | 引用リポストでメディアを生成・アップロード・添付する処理がない。 |
| **トレンドハッシュタグ** | getTrendyHashtags。 | 時間不足でスキップされやすい。かつ「必須でない」ため、戦略が効かないケースが多い。 |

---

## 5. その他の「表面」になりがちな点

- **optimizationStrategy が null になりやすい**  
  - 残り時間 30 秒未満で最適化をスキップ → optimizationStrategy = null → フォールバックテンプレートのみ。Grok×Gemini の統合最適化が効かない実行がかなりある。
- **A/B テスト（Whop 優先 vs Telegram 優先）**  
  - x-post-minimal-version では 50% で切り替えているが、**無料版は Whop 経由に統一**したため、実質「PRO の出し方」の差のみ。設計とコードは一致。
- **engagementData / 過去メトリクス**  
  - Gemini messageOptimizer は engagementData をプロンプトに渡せるが、**呼び出し側で実績を渡しているか**は要確認。渡していなければ「戦略」は一般的な文言だけになる。

---

## 6. 密度を上げるための提案（優先度順）

1. **質問 CTA のコード側保証**  
   - 投稿前に `quoteText` をチェック。`?` が含まれない、または末尾 50 文字以内にない場合は、デフォルトの質問 CTA を付与（または付与して 140 文字で再切り詰め）。
2. **引用リポストへのメディア付与**  
   - Grok の「80% media」をコードで実現するなら、固定または生成した 1 枚画像を uploadMedia し、postQuoteTweet(quoteText, influencer.tweetId, [mediaId]) で投稿。まずは「画像 1 枚付き」からでも可。
3. **スレッド戦略の接続**  
   - getThreadStrategy(lang) を x-quote-repost で参照。replyCount > 0 のときは、メイン引用リポストのあと replyToTweet でリプライを最大 replyCount 回まで投稿する分岐を追加。
4. **最適化スキップ条件の緩和**  
   - 「30 秒未満でスキップ」を短くするか、並列化で最適化を先に完了させるなど、optimizationStrategy が null になりにくくする。
5. **optimizationStrategy のコード側利用**  
   - 戦略オブジェクトに「メディア推奨」「ポール推奨」などのフラグがあれば、それに応じて mediaIds や poll を付与する分岐を追加。

---

## 7. まとめ

- **「Gemini/Grok が分析した戦略をかなりの密度で実装している」** は、**プロンプトと設定の密度**としては成立しているが、**投稿パイプラインでコードが保証している範囲**は限定的。
- 特に **引用リポスト** は、100/15min・ピークマップ・ジッター・Whop 優先・140 文字 CTA 保持まではコードで固まっている一方、**メディア未使用・スレッド未使用・質問 CTA 未検証・最適化結果の未活用** で「表面上だけでスカスカ」になりやすい構造になっている。
- 上記 6 の 1–5 を順にコードに落とすと、Composer 的な「見た目だけの実装」から、**実行保証付きの戦略実装**に近づく。

---

## 8. 完全実装対応（2026-01-31）

上記 6 の 1–5 をすべてコードに実装済み。

| 項目 | 実装内容 |
|------|----------|
| **1. 質問 CTA のコード保証** | `ensureQuestionCTA(quoteText, lang)` を追加。投稿前に `?` が末尾 50 文字以内にない場合はデフォルト質問 CTA を付与し、140 文字で再切り詰め。 |
| **2. 引用リポストへのメディア付与** | `getQuoteRepostMediaId()` を追加。`QUOTE_REPOST_IMAGE_URL` が設定されていれば画像を取得・アップロードし、`postQuoteTweet(quoteText, tweetId, mediaIds)` で渡す。 |
| **3. スレッド戦略の接続** | `getThreadStrategy(lang)` を x-quote-repost で参照。メイン引用リポスト成功後、`replyCount > 0` のとき `replyToTweet` で最大 replyCount 回までリプライを投稿（`getQuoteRepostThreadReplyTexts` で文言生成）。 |
| **4. 最適化スキップ条件の緩和** | `MIN_REMAINING_TIME_FOR_OPTIMIZATION` を 30 秒から **15 秒** に変更。optimizationStrategy が null になりにくいようにした。 |
| **5. optimizationStrategy のコード利用** | テキスト生成の戻り値を `{ quoteText, optimizationStrategy }` に変更。投稿前に `optimizationStrategy?.optimization?.format` に「メディア・画像」等が含まれる場合もメディア付与する分岐を追加（のちに画像付与は廃止）。 |

**画像付与の廃止（方針）**  
引用リポスト用画像（QUOTE_REPOST_IMAGE_URL / getQuoteRepostMediaId）は、NanoBanana・Veo の動作不安定を理由に廃止。**無料版（Minimal Version）と有料版（Regular Briefing）のテキスト引用のみ**で運用する。

**レビュー蓄積時の対応**  
レビュー（ユーザーレビューやコードレビュー指摘）が溜まったタイミングで、レビュー表示・付与（例: サイトへのレビュー表示、レビュー集約）を検討する。
