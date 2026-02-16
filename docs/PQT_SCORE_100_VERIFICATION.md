# 100点に寄せるために必要な検証

**前提**: 現ログ（2026-02-16 12:44 UTC, lang=es）のスコアは 77/100。  
**目標**: 3条件それぞれを 100 に寄せるために「あと何が必要か」をコード・データに基づき検証する。

---

## 1. 現状のギャップ（なぜ 77 か）

| 条件 | 現スコア | 主なギャップ |
|------|----------|----------------|
| ① 引用リポストの対象が高品質 | 75 | 候補10→スロット5 と少ない。質のロジックは効いているが「数」が少い。 |
| ② テンプレが正確に反映 | 100 | ギャップなし。 |
| ③ 投稿数が予定通りの見込み | 55 | cap=63 に対し posted=5。スロット不足で fill_rate 7.9%。 |

→ 100 に寄せるには **① 対象の質（かつ数）** と **③ 投稿数** を伸ばす必要がある。  
いずれも **「スロット数」を増やす** ことが共通レバー（スロットが増えれば posted が増え、fill_rate と「予定通りの見込み」が改善する）。

---

## 2. スロット数・投稿数を増やすレバー（コード準拠）

スロットは次の順で決まる。

1. **posts_fetched**（検索ヒット数）
2. **candidates**（Fisherman 通過数 = hype ＋ engagement ≥ 閾値、median フィルタ後）
3. **slots** = selectFishermanSlotsTopPercent(candidates, lang, { maxCount: cap }) → 上位 5〜10% のみ
4. 2〜7分ウィンドウで絞り（あればその中だけ）
5. Tier 順・Tier3 cap 2・多様性 cap 適用

したがって **posts_fetched → candidates を増やせば**、同じ割合でも **slots の絶対数が増え**、posted が増える。

### 2.1 検索ヒット数を増やす（posts_fetched 増）

| レバー | 場所 | 現状 | 変更案 | 期待効果 |
|--------|------|------|--------|----------|
| **BUZZWEAVE_SEARCH_WINDOW_MIN** | buzzWeaveEngine.js | 15 分 | **30** または **45** | 検索時間幅が伸び、ヒット数増。pagesFetched が 2〜3 になりやすい。 |
| **BUZZWEAVE_SEARCH_PAGES_PER_BUCKET** | 同上 | 3 | そのまま or **5**（API 負荷に注意） | クエリあたり取得ページ数増→ posts_fetched 増。 |
| **lowVolumeBackfill** | 同上 | es は LOW_VOLUME_LANGS 外（ar,ko,ja のみ） | es を **BUZZWEAVE_LOW_VOLUME_LANGS** に含める | es で 0 件のとき 30 分ウィンドウで再検索→ 候補増。 |

**検証手順**: 上記のいずれか（まずは SEARCH_WINDOW_MIN 15→30）を変更し、次の run で **posts_fetched** が前 run 比で増えているか確認。増えていれば candidates / slots の増加も見る。

### 2.2 Fisherman 候補数を増やす（candidates 増）

| レバー | 場所 | 現状 | 変更案 | 期待効果 |
|--------|------|------|--------|----------|
| **engagement 閾値** | fishermanDetector.js | DEFAULT_ENGAGEMENT_THRESHOLD = **500** | 環境変数で **300** などに下げる場合、opts.engagementThreshold を渡す必要あり（現状は未対応）。 | 通過する候補が増え candidates 増。※ 質が下がるリスクあり。 |
| **topPercent** | 同上 | DEFAULT_TOP_PERCENT = **0.08**（8%） | selectFishermanSlotsTopPercent の opts で **0.10**（10%）に変更可能。 | 同じ candidates でも取る数が増え slots 増。 |

**検証手順**: まずは **検索ヒット数増** で candidates を増やす方が安全。閾値や topPercent の変更は、posts_fetched / candidates をログで見たうえで検討。

### 2.3 2〜7分ウィンドウの扱い

| 事実 | 意味 |
|------|------|
| **in2_7Window が 1 件でもあると、そのウィンドウ内のスロットだけに絞る**（buzzWeaveEngine.js） | 伸び中の投稿を優先するが、該当が少ないと slots が一気に減る。 |

**検証**: ログに **in2_7Window で絞ったか** は出ていないため、必要なら `slots before/after 2-7min filter` をログに出すと、ウィンドウ絞りがスロット数を削っていないか確認できる。

### 2.4 フォールバック（Fisherman 0 件時）

| レバー | 現状 | 変更案 |
|--------|------|--------|
| **BUZZWEAVE_FALLBACK_SLOT_COUNT** | 10 | すでに 10。Fisherman が 0 のときのみ使われる。今回 run では candidates=10 なので未使用。 |

→ 今回のボトルネックは「Fisherman 通過後の slots=5」なので、フォールバックより **検索・候補数** が先。

---

## 3. Proof を「—」から実データにしたい場合（① 質の印象アップ）

現ログでは Proof が **"—"**。  
`buildProofSnippetFromSnapshot` は **snapshot の trap_score_label / funding_state or fundingRate / netflow_state or netflowState** があれば 1〜2 行出す。  
`getBtcSnapshot()` は **trap_score_label, fundingRate, netflow_state** を返すが、**row が無い or raw/cq が空** のときは `trapScore: "unknown"`, `fundingRate: "neutral"` 等になる。  
Proof が "—" になるのは、**snapshot が空で渡っている** か、**getBtcSnapshot が失敗してデフォルトも渡っていない** ようなケースが考えられる。

| 確認項目 | アクション |
|----------|------------|
| KV / Supabase の **btc_snapshots**（getLastBtcSnapshot）に直近 1h 以内の row があるか | 無い場合は Trap Defence のスナップショット投入を確認。 |
| buzzweave-run に **getBtcSnapshot()** の結果が渡っているか | ログで snapshot 有無を出すか、Proof 生成前に snapshot のキーを 1 行ログ出力して検証。 |
| snapshot に **trap_score_label, fundingRate, netflow_state** が入っているか | 入っていれば Proof は "Trap score: XX." 等になる。入っていない場合は getBtcSnapshot の返却形と pqtProofSnippet の参照キーを揃える。 |

→ Proof を実データにすると「対象の質」の**見え方**は良くなる（スコア 75→85 程度を想定）。ただし **スロット数・投稿数** を増やす方が、総合スコアへの寄与は大きい。

---

## 4. 100点に寄せるためのアクション優先順位

1. **検索ヒット数を増やす**  
   - **BUZZWEAVE_SEARCH_WINDOW_MIN=30**（または 45）を設定し、1〜2 run で **posts_fetched** が増えるか確認。  
   - 増えれば **candidates → slots → posted** の連鎖で ③ が改善し、① の「数」も増える。

2. **short_report で追う**  
   - **posts_fetched, candidates, slots, cap, posted, fill_rate** を毎 run 記録。  
   - posts_fetched が 2× に近づき、slots が 10〜20 台、posted が cap の 50% 以上になる run が増えれば、スコアは 90 前後に寄る。

3. **Proof を実データにする（任意）**  
   - btc_snapshots の投入と getBtcSnapshot の返却を確認し、snapshot が buildProofSnippetFromSnapshot に渡っているか検証。  
   - 渡っていれば Proof は "—" ではなくなり、① の印象が上がる。

4. **閾値・topPercent の変更**  
   - 検索を伸ばしても slots が伸びない場合のみ、engagement 閾値の緩和や topPercent 0.08→0.10 を検討。  
   - 質とのトレードオフがあるため、ログで candidates の推移を見てから判断。

---

## 5. まとめ（あと何が必要か）

| やること | 効果 |
|----------|------|
| **SEARCH_WINDOW_MIN を 15→30（または 45）に増やす** | posts_fetched 増 → candidates/slots/posted 増 → ③ と ① の「数」が改善。 |
| **posts_fetched / candidates / slots / posted を毎 run ログで確認** | レバーが効いているか検証し、次に効く一手を決められる。 |
| **btc_snapshots と getBtcSnapshot の返却を確認し、Proof に trap/funding/netflow を出す** | Proof が "—" から実データになり、① の質の印象アップ。 |
| （必要に応じ）**topPercent を 8%→10% に** | 同じ candidates でより多くの slots を取る。 |

**まず実行するなら**: 環境変数 **BUZZWEAVE_SEARCH_WINDOW_MIN=30** を設定し、同じ言語・時間帯で 1 run 実行。  
ログで **posts_fetched が 24 より増えているか** と **slots / posted が増えているか** を確認すれば、100 点に寄せる第一歩の検証になる。
