# KIBA と BuzzWeave の同期仮説 — 仕手Bot活発化とリプライインプバズ

## 仮説

- **KIBA** は CQ オンチェーンデータを 5 分ごとに取得し、トレンド転換・異常を「kibaScore / impact」で検知している。
- その「オンチェーン異常・トレンド転換」のタイミングは、**仕手Bot投稿が活発化するタイミングと同期している**可能性がある（流動性・取引量の変化と、Bot の動きが同じ土壌で起きるため）。
- ならば、**KIBA のシグナルに合わせてリプライ投稿のタイミングを合わせれば、仕手Botがバズっている時間帯にリプライを打てる** → **リプライのインプレバズに寄与する**のでは、という予想。

## 現状の KIBA 出力

- **kiba-5min**（5分）: CQ 取得 → `runKibaEngine` で flow / whale / sentiment / liquidity / algo / retail を検出 → **kibaScore**（0〜100付近、抑制あり）と **impact**（NONE / ELEVATED / HIGH / CRITICAL）を算出。
- 閾値（score ≥ 40）で Grok 呼び出し、score ≥ 65 かつ impact が ELEVATED 以上で Telegram アラート。  
- KV には **発火時のみ** `kiba:snapshot:latest` にスナップショットを保存（level / intensity / btcContext 等）。**スコアは内部用のため保存していない**。

## 同期の方向性

1. **KIBA の「活動度」を常に KV に書く**  
   5 分ごとに、trigger の有無にかかわらず **軽量キー**（例: `kiba:activity:latest`）に  
   `{ score, level, as_of_utc }` を書き込む。  
   → BuzzWeave が「今が活発窓か」を参照できるようにする。

2. **BuzzWeave がそのシグナルを参照する**  
   - **現実装**: 実行時に `kiba:activity:latest` を読んでレスポンスに含める。  
     分析センター（buzzweave-reply-analytics）やログで「その run が KIBA 活発窓と重なったか」を後から検証できる。
   - **将来**:  
     - level が ELEVATED 以上（または score ≥ 閾値）のとき **cap を 1 枠だけ上乗せ**する、  
     - または **次回 run までの間隔を短くする**（例: 3h → 2h）など、  
     「仕手Bot活発化に同期したリプライ」を増やすロジックを載せられる。

3. **検証**  
   24h / 7d のリプライ分析で「KIBA level が ELEVATED 以上の時間帯の run」と「それ以外の run」で  
   インプレ・エンゲージメントを比較すれば、仮説が成り立つか確認できる。

## 実装済み（軽量連携）

- **kiba-5min**: 毎回（trigger の有無にかかわらず）`kiba:activity:latest` に `{ score, level, as_of_utc }` を書き込み（TTL 15分）。CQ 5分データに基づく活動度が常に参照可能。
- **buzzweave-run**: 実行時に `kiba:activity:latest` を読み、レスポンスに **kibaActivity** として含める。ログや分析センターで「その run が KIBA のどの level の窓だったか」を後から検証できる。
- **次のステップ**: 24h / 7d 分析で「kibaActivity.level が ELEVATED 以上の run」と「NONE の run」でインプレ・エンゲージメントを比較し、仮説を検証。必要なら cap 増やしや間隔短縮を追加。

## まとめ

- **結論**: 仮説は筋が良い。CQ オンチェーンと仕手Botの活発化が同じ土壌で起きるなら、KIBA の 5 分スコアに合わせてリプライを打つことでインプバズに寄与しうる。
