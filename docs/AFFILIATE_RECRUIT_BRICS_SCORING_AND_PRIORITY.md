# BRICS圏スコアリング・DM優先度・抽出プロンプト（採掘OS）

**目的**: 「プロじゃなくていい。実績ゼロ〜少ないが、モチベだけ異常に高いファイター」を数値と優先度で判定する共通OS。  
対象: **IN / BR / RU / ZA ＋ NG / PH / VN / MX / CO / SA**（BRICS圏＋周辺）。

**即効性×再現性の決定版**: 以下は Copilot 戦略側の「7つすべての唯一の正解」に沿った仕様。抽象論ゼロ・曖昧さゼロで Cursor がそのまま実装済み。

関連: [AFFILIATE_RECRUIT_BRICS_TARGET.md](./AFFILIATE_RECRUIT_BRICS_TARGET.md) | [AFFILIATE_RECRUIT_SCREENING_PRINCIPLES.md](./AFFILIATE_RECRUIT_SCREENING_PRINCIPLES.md)

---

## 1. BRICS圏スコアリングモデル（100点満点・理想形）

現行実装は「取得できるデータの範囲」で近似。ここは **理想OS** の構造として参照。

### A. 行動量（最大30点）
| 条件 | 点数 |
|------|------|
| 過去7日10ポスト以上 | +10 |
| 過去7日15ポスト以上 | +20 |
| 過去7日20ポスト以上 | +30 |

### B. 継続力（最大20点）
| 条件 | 点数 |
|------|------|
| いいね0〜3でも投稿継続 | +10 |
| 投稿が7日間連続 | +10 |

### C. 泥臭さ（最大20点）
| 条件 | 点数 |
|------|------|
| 行動ログあり（今日の作業・学び・進捗） | +10 |
| 自己啓発より行動ログが多い | +10 |

### D. プロフィール適性（最大15点）
| 条件 | 点数 |
|------|------|
| 努力系ワード（learning / beginner / building / trying / side hustle / renda extra / ingresos / aprendiendo / iniciante） | +10 |
| affiliate / open to collab / DM open | +5 |

### E. 商材の有無（最大10点）
| 条件 | 点数 |
|------|------|
| リンクなし | +10 |
| リンクあるが死んでいる | +5 |

### F. リスク減点（最大▲15点）
| 条件 | 点数 |
|------|------|
| MLM / crypto signals / forex trader | ▲10 |
| coach / mentor / guru | ▲5 |
| 宗教・政治・過激系 | ▲15 |

### 判定ライン
- **80点以上** — 最優先DM（即アプローチ）
- **65〜79点** — DM候補（国によって優先度調整）
- **50〜64点** — 保留（将来用プール）
- **49点以下** — DM不要

---

## 2. DM送信優先度アルゴリズム

**Priority = S × C × L × R**

| 記号 | 意味 | 範囲 |
|------|------|------|
| **S** | 個人スコア（0〜1に正規化） | 0〜1 |
| **C** | 国係数（Trap Defence 観点） | 0.5〜1.2 |
| **L** | 言語適合係数 | 0.7〜1.1 |
| **R** | リスク補正 | 0.6〜1.0 |

### 国係数 C（実装: `REGION_COEFFICIENT`）
| 国・地域 | 係数C |
|----------|-------|
| インド（IN） | 1.2 |
| フィリピン（PH） | 1.2 |
| ブラジル（BR） | 1.15 |
| メキシコ（MX） | 1.1 |
| ベトナム（VN） | 1.05 |
| ナイジェリア（NG） | 1.0（Rで調整） |
| コロンビア（CO） | 1.0 |
| サウジ・中東（SA等） | 1.0 |
| ロシア（RU） | 0.9 |
| 南アフリカ（ZA） | 0.9 |

### 言語適合係数 L
- 英語でDMできる（IN / PH / NG / ZA / 一部MX）：**1.1**
- 英語＋現地語どちらも可：**1.0**
- 現地語のみ（翻訳前提）：**0.7〜0.8**

### リスク補正 R
- 詐欺系ワード一切なし：**1.0**
- グレー（投資・トレード系だが露骨ではない）：**0.8〜0.9**
- crypto signals / forex / MLM の匂いあり：**0.6〜0.7**

### 優先度ランク
- **Priority ≥ 0.8** — 最優先DM
- **0.6〜0.79** — 通常DM
- **0.4〜0.59** — 保留
- **0.39以下** — DM不要

---

## 3. 最初に攻めるべき国（スタートダッシュの最適4カ国）

評価軸: 候補の量・泥臭さ・言語適合・リスク・Trap Defence との相性。

| 順位 | 国 | 理由（Trap Defence 視点） |
|------|----|---------------------------|
| 1位 | 🇮🇳 インド | 行動量世界トップ、英語可、SNS依存、初心者ファイターの密度が異常 |
| 2位 | 🇵🇭 フィリピン | 英語強い、SNS依存、副業文化、素直で動く層が多い |
| 3位 | 🇧🇷 ブラジル | アフィリエイト文化成熟、行動量、動画・SNS強い |
| 4位 | 🇲🇽 メキシコ | LATAMのハブ、熱量高い、副業文化、英語層も一定数 |

**この4カ国で**: BRICS圏の泥臭さ × 英語の効率 × LATAMの熱量 をほぼカバー。

### 第二波
- 🇻🇳 ベトナム（泥臭さの塊、英語層を狙い撃ち）
- 🇳🇬 ナイジェリア（リスク管理しつつ、当たれば爆発）
- 🇨🇴 コロンビア（動画・SNS強者）
- 🇸🇦 サウジ（購買力 × SNS熱量）

---

## 4. 国別抽出プロンプト（Cursor用）

### 4-1. 共通フレーム

```
あなたの役割は「実績は少ないが、モチベーションが高く泥臭く動けるアフィリエイター候補」を抽出するフィルターです。

【目的】
プロではなく、行動量と継続力が高い初心者ファイターだけを抽出する。

【共通必須条件】
- 過去7日で10ポスト以上
- 反応が少なくても投稿を継続している
- 引用RT 3回以上
- フォロワー30〜1500
- プロフィールに努力系ワード（learning / beginner / building / trying / side hustle など）
- リンクなし、または明らかに死んでいるリンク
- 行動ログがある（今日の作業・学び・進捗など）

【共通除外条件】
- MLM / crypto signals / forex trader
- coach / mentor / guru
- 宗教・政治・過激系
- 自己啓発ポストばかり

【出力】
- スコア（0〜100）
- スコアの理由（行動量・継続力・泥臭さ・リスク）
- DMを送るべきか（YES / NO）
- この国における強み（例：行動量が異常、英語が強い など）
```

### 4-2. 代表国ごとの上書きパラメータ

| 国 | 追加必須 | 追加除外 | 優先 |
|----|----------|----------|------|
| **IN** | 過去7日15ポスト以上 | guru / mentor / coach / spiritual | 英語投稿あり |
| **BR** | 過去7日12ポスト、aprendendo / iniciante / renda extra | Hotmart系詐欺商材 | — |
| **NG** | 引用RT 5〜10回 | — | **リンクなしを絶対条件** |
| **PH** | 英語投稿あり、side hustle / extra income / learning / beginner | — | — |
| **VN** | 英語投稿あり（フィルター） | — | — |
| **MX** | aprendiendo / empezando / ingresos | — | — |

---

## 5. 決定版（Copilot）実装

戦略→仕様の決定に基づく実装。

### Priority = S × C × L × R（実装済み）
- **S**: スコア 0–100 を 0–1 に正規化
- **C**: `getRegionCoefficientByLang(lang)` — en=1.15, pt=1.15, es=1.1, ar/ja/ko=1.0
- **L**: 1.0 固定（DM言語＝候補言語とみなす）
- **R**: `getRiskFactor(user, tweets, lang)` — 0.6 / 0.8 / 1.0 の3段階

### リスク補正 R の値（即効性×再現性の決定版）
| R | 条件 |
|---|------|
| **1.0** | 完全クリーン: 努力系・行動ログ・リンクなし・詐欺系なし |
| **0.8** | グレー: get rich, make $100/day, investing, entrepreneur（※crypto 単体は Trap Defence がクリプトアフィリのため R=0.8 に含めず、誤検知を避けている） |
| **0.6** | 怪しい: crypto signals, forex trader, MLM, 宗教・政治・過激系。PT 時は BR Hotmart 系（hotmart, eduzz, monetizze, produtor digital, lançamento, fórmula, 7 em 7, 6 em 7, milionário）も 0.6 |

### 優先度ランク（実装済み）
- **Priority ≥ 0.8**: 最優先DM
- **0.6〜0.79**: 通常DM
- **0.4〜0.59**: 保留（送信対象から外さず順次）
- **&lt;0.4**: DM送らない（`PRIORITY_MIN_SEND` でフィルタ）

### NG（ナイジェリア）リンク即除外
- **条件**: 検索言語が EN かつ、プロフィールに nigeria/naija/lagos のいずれかがあり、かつプロフィールにリンクあり
- **動作**: 該当候補は eligible から除外（スコア・Priority に関係なく送らない）

### BR Hotmart 系
- PT 検索時、プロフィール＋投稿に Hotmart 系キーワードがあれば R=0.6（Priority が下がり、0.4 未満になりやすく結果的に送られにくい。既存の除外キーワードとは別枠）

### ログ・フィードバック
- **粒度**: 国単位（検索言語で代用）× スコア帯（80/65/50）で見るのが最適
- **係数更新**: 最初は手動。返信率・成約率・ブロック率のデータが溜まったら半自動チューニング可能

---

## 6. 実装との対応（ファイル）

- **スコア**: `services/td/affiliateRecruitScoring.js` が A〜F を「取得可能なデータ範囲」で近似。擬似継続力・痛み＋行動ログ・REGION_COEFFICIENT・**getRiskFactor / getRegionCoefficientByLang** 実装済み。
- **C**: `COEFFICIENT_BY_LANG` と `getRegionCoefficientByLang(lang)` で検索言語から C を取得。
- **R**: `getRiskFactor(user, tweets, lang)` で 0.6/0.8/1.0。BR Hotmart は lang===pt 時に適用。
- **Run**: `api/affiliate-recruit-run.js` で Priority 算出、0.4 未満除外、NG リンク即除外、Priority 降順で送信順を決定。
- **7日ポスト数・引用RT数**: API 拡張次第で追加。

---

## 7. 即効性×再現性 決定版チェックリスト

Copilot「唯一の正解」8項目と実装の対応。

| 項目 | 実装状況 |
|------|----------|
| 最優先で欲しい指標: PostCount7d → QuoteRT7d | API 取得範囲外。doc で優先順位を明記済み。 |
| 今できる近似: ConsistencyFromRecentTweets + Pain×ActionLog | ✅ `scoreConsistencyFromRecentTweets`・痛み＋行動ログボーナス実装済み。 |
| region は検索言語で代用、lang は L=1.0 固定 | ✅ `getRegionCoefficientByLang(lang)`・L=1.0 で Priority 計算。 |
| Priority は今すぐ実装、0.8/0.6 で送る/送らないを決める | ✅ Run で Priority 算出・&lt;0.4 除外・降順送信。 |
| R は 1.0/0.8/0.6 の3段階で十分 | ✅ `getRiskFactor` で 3 段階。 |
| 4カ国集中は C 係数で優先度調整する運用が最適 | ✅ C を検索言語で付与。EN/PT/ES で IN/PH/BR/MX を優先。 |
| ログは国×スコア帯で見る | doc で仕様化。KV/レスポンス拡張で対応可。 |
| BR は Hotmart 系除外、NG はリンクあり即除外 | ✅ PT 時 R=0.6（Hotmart 系）。EN＋nigeria/naija/lagos＋リンクありで即除外。 |
