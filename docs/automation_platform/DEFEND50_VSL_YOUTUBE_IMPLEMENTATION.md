# DEFEND50キャンペーン VSL YouTube実装記録

**作成日時**: 2026-01-14  
**実装者**: CEO  
**評価**: まぁまぁの出来

---

## 📹 YouTube VSL情報

- **URL**: https://youtu.be/6Z7AfE9FSy4
- **タイトル**: DEFEND50キャンペーン VSL
- **総時間**: 約75秒（1分15秒）
- **実装仕様**:
  - ✅ Bロールあり
  - ✅ 字幕あり（SRT形式）
  - ✅ 音楽あり

---

## 📝 SRTファイル

SRTファイルの保存場所: `c:\Users\chiba\Downloads\DEFEND50-caption.srt`

### SRTファイルの内容

```
1
00:00:00,000 --> 00:00:02,578
Remember the two young men from our story?

2
00:00:02,578 --> 00:00:04,787
One lost everything to a Whale Trap.

3
00:00:04,787 --> 00:00:06,922
The other woke up to $5,000 profit.

4
00:00:06,922 --> 00:00:09,078
Right now, you're staring at charts for 12 hours a day.

5
00:00:09,278 --> 00:00:10,928
Chasing every green candle.

6
00:00:11,128 --> 00:00:12,879
But here's the truth: You're being hunted.

7
00:00:13,079 --> 00:00:14,940
Institutional whales set traps.

8
00:00:15,340 --> 00:00:16,910
They create fake signals.

9
00:00:17,310 --> 00:00:18,677
They trigger your FOMO.

10
00:00:18,877 --> 00:00:20,264
And when you click buy, the trap snaps.

11
00:00:20,464 --> 00:00:22,004
Your account gets wiped out.

12
00:00:22,204 --> 00:00:25,476
But what if you could see the traps before they snap?

13
00:00:25,476 --> 00:00:28,291
Trap Defence BTC visualizes the invisible.

14
00:00:28,491 --> 00:00:30,955
Four AI engines working together.

15
00:00:31,155 --> 00:00:33,254
CryptoQuant, Grok, GPT, and Gemini.

16
00:00:33,254 --> 00:00:35,028
Our Trap Score shows you the danger zones.

17
00:00:35,228 --> 00:00:36,894
Real-time whale tracking.

18
00:00:37,094 --> 00:00:39,241
Sentiment analysis that filters out hype.

19
00:00:39,441 --> 00:00:41,491
You know what to do in 3 seconds.

20
00:00:41,891 --> 00:00:43,764
Not 12 hours of staring at charts.

21
00:00:43,964 --> 00:00:46,525
Today, we're launching The Defender's Protocol Campaign.

22
00:00:46,725 --> 00:00:48,454
For the first 50 people only.

23
00:00:48,854 --> 00:00:50,634
Everything is 50 percent off.

24
00:00:51,034 --> 00:00:52,454
Monthly plan: Just $34.50.

25
00:00:52,854 --> 00:00:54,154
Annual plan: Only $294.

26
00:00:54,554 --> 00:00:56,094
That's less than a dollar a day.

27
00:00:56,494 --> 00:00:57,644
But here's the catch.

28
00:00:58,044 --> 00:00:59,301
Only 50 spots available.

29
00:00:59,501 --> 00:01:00,656
When they're gone, the price doubles.

30
00:01:00,856 --> 00:01:02,032
Right now, spots are disappearing.

31
00:01:02,432 --> 00:01:03,382
This is your one chance.

32
00:01:03,582 --> 00:01:05,792
Don't be the trader who loses it all.

33
00:01:05,792 --> 00:01:08,075
Be the defender who stays protected.

34
00:01:08,275 --> 00:01:10,283
Use code DEFEND50 at checkout.

35
00:01:10,483 --> 00:01:12,281
Activate your defense protocol now.

36
00:01:12,481 --> 00:01:13,367
Welcome to the Academy.

37
00:01:13,767 --> 00:01:14,615
Where defenders win.
```

---

## 📊 実装分析

### タイミング配分

| セクション | 開始時間 | 終了時間 | 時間 | 内容 |
|-----------|---------|---------|------|------|
| Opening Hook | 0:00 | 0:06.922 | 6.9秒 | Two Young Men Story |
| Problem Setup | 0:06.922 | 0:12.879 | 5.9秒 | 12時間チャート監視、狩られる |
| The Trap | 0:13.079 | 0:22.004 | 8.9秒 | クジラの罠、アカウント消失 |
| Solution Introduction | 0:22.204 | 0:33.254 | 11.0秒 | Trap Defence BTC、4つのAI |
| Value Demonstration | 0:33.254 | 0:43.764 | 10.5秒 | Trap Score、3秒で判断 |
| The Offer | 0:43.964 | 0:56.094 | 12.1秒 | Defender's Protocol、50%OFF、価格 |
| Urgency & Scarcity | 0:56.494 | 1:03.382 | 6.9秒 | 50枠限定、価格2倍 |
| Risk Reversal & CTA | 1:03.582 | 1:12.281 | 8.7秒 | DEFEND50コード、行動喚起 |
| Closing | 1:12.481 | 1:14.615 | 2.1秒 | Welcome to the Academy |

**総時間**: 約74.6秒（原稿想定75秒とほぼ一致）

### 原稿との比較

✅ **一致している点**:
- 原稿の内容が忠実に再現されている
- タイミング配分が原稿の想定とほぼ一致
- 重要なメッセージ（DEFEND50、50%OFF、価格）が明確に伝えられている

📝 **実装の特徴**:
- 字幕のタイミングが適切に設定されている
- Bロールと音楽で視覚的・聴覚的に補完されている
- 「DEFEND50」コードが明確に表示されている（34番目の字幕）

---

## 🎯 実装評価

**評価**: まぁまぁの出来

### 良い点

1. **原稿の忠実な再現**: 原稿の内容が正確に実装されている
2. **タイミングの適切性**: 各セクションの時間配分が適切
3. **視覚的補完**: Bロールと字幕で情報が明確に伝えられている
4. **CTAの明確性**: 「DEFEND50」コードが明確に表示されている

### 今後の改善点（参考）

1. **アバターの表情・ジェスチャー**: より感情的に訴求できる表現
2. **音楽のタイミング**: セクションごとの感情に合わせた音楽の変化
3. **Bロールの選択**: より効果的なビジュアル要素の選択
4. **緊急性の演出**: 残り枠数の視覚的表現の強化

---

## 📋 関連ドキュメント

- **原稿**: `docs/HEYGEN_VSL_SCRIPT_50x50_CAMPAIGN.md`
- **キャンペーン戦略**: `docs/LIMITED_COUPON_CAMPAIGN.md`
- **プロモーションコード**: Whop APIで取得済み（`promo_kg5pOJdZpngW`、コード: `defend50`）

---

**作成日時**: 2026-01-14  
**実装者**: CEO  
**評価**: まぁまぁの出来  
**状態**: ✅ **YouTube実装完了**
