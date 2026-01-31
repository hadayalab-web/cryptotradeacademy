# Grok: Xアルゴリズム戦略 vs 100/15min レート制限

**作成日時**: 2026-01-31T09:55:23.730Z
**モデル**: grok-4-1-fast-reasoning

---

## 質問要約

- 現状: 8時台などで 15分窓 237 投稿 → 100/15min 超過
- Xアルゴリズム上「バースト」を正当化する根拠はあるか、それとも 100/15min 厳守すべきか

---

## Grok 回答

**結論**: 100/15min 厳守。バースト投稿は許容せず、スケジュールで15分あたり100以下に抑える。

**理由**:
- **アルゴリズム観点**: 2026アルゴリズムでは「engagement velocity」（エンゲージメント速度）が上位要因だが、短時間バースト（例:237投稿/15min）はvolume-based spam detectionを誘発しやすく、ランキング低下やシャドウバンリスク大。velocity最大化は「持続的な高頻度」（例:6分ごとEN投稿）で達成可能で、recency/freshnessは15min超バーストよりreply depth/media付き引用リポストで補完。ピーク時バーストは初期velocityを上げるが、アルゴリズムの「trust score」低下で長期不利（X公式ドキュメント・アルゴリズム解析より）。
- **API制限観点**: Per User 100/15min（POST /2/tweets）はハードリミットで超過時429エラー発生。連続超過でアカウント一時凍結・永久BANリスク（Per App 10,000/24hrsも考慮）。quote repostはcontent-based spam検知も加わり、バーストは高リスク。

**推奨** (アルゴリズム優先: velocity/recency + レート厳守):
1. **15min窓キャップ**: getPeakMapForHourを修正し、全言語合計で**最大100投稿/15min**に制限（例: UTC8時ピークでEN:50、他5言語合計50分散）。Cron間隔をEN:8分ごと、他言語:分ずれ+10分間隔に調整。
2. **言語・時間帯配分**: UTC8時ピークはEN優先（velocity高:35投稿→40に増）、他言語をAR/JA/KO:各10、ES/PT-BR:各10に減（multi-language best:地域オーディエンス峰分散、EN/EN-like言語でglobal velocityブースト）。
3. **バースト回避スケジュール**: ピーク外（非8時）はEN:6分ごと維持（velocity持続）、ピーク時は「rolling window」実装（過去15min総投稿監視、100超でスキップ）。総824インフルエンサー/6言語を1日均等分散（例:1アカウント/日20投稿以内）。
4. **追加最適化**: 各投稿にmedia/reply depth促進（引用リポスト+画像/動画80%）、スパム回避で1アカウント間3minクールダウン。モニタリング: APIレスポンスでrate limit残量チェック、超過予測で前倒し分散。
5. **成長効果測定**: A/Bテストで「100厳守分散」vs「軽バースト90/15min」実施、velocity（初1h likes/RT）をKPIに（期待:厳守で安定トップ露出）。

---
*Tokens: prompt=696 completion=636*
