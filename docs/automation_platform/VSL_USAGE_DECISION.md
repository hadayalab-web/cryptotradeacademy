# VSL使用方針 - COO決定

**決定日**: 2026-01-12  
**決定者**: COO（Cursor/Composer）  
**状態**: ✅ **決定完了**

---

## 🎯 COO決定事項

### ユーザー向けLPのVSLセクション

**使用VSL**: **タスク1（Two Young Menストーリー）** ✅

**理由**:
1. **LPのVSLセクションタイトルと完全一致**
   - 現在のLP実装: `"Why did Trader B earn $5K while Trader A lost everything?"`
   - タスク1のVSL: Two Young Menストーリーをベースにした内容
   - 完全に一致している

2. **動画時間が最適**
   - タスク1: 約1分10秒（69秒）
   - タスク3: 約1分28秒（88秒）
   - LPのVSLセクションは短く、インパクトのあるものがCVR向上に寄与

3. **ストーリーの一貫性**
   - ユーザー向けLPは「Two Young Menストーリー」をベースに設計されている
   - タスク1はこのストーリーに特化しており、LP全体のメッセージと完全に一致

4. **CVR戦略上の優位性**
   - 短い動画は視聴完了率が高い
   - 感情的なインパクトが強い
   - すぐにCTAへ導ける

---

### タスク3（Video Sales Letterスクリプト）の使用方針

**使用場所**: **補完的用途または将来の独立VSLページ**

**理由**:
1. **より詳細な説明が必要な場合**
   - タスク3は3つの柱（Trap Defense Engine、Gemini Visual Storytelling、Dr. Grok）を詳細に説明
   - 価格（$69）も提示されている
   - より長い動画時間（約1分28秒）で、より包括的な説明を提供

2. **独立したVSLページの可能性**
   - 将来的に、VSL専用ページ（例: `/vsl/[market]`）を作成する場合に使用
   - より詳細な情報を求めるユーザー向け

3. **A/Bテストの可能性**
   - タスク1とタスク3でA/Bテストを実施し、CVRを比較する

---

## 📊 最終決定マッピング

| VSL ID | 使用場所 | 使用方針 | 動画時間 | 状態 |
|--------|---------|---------|---------|------|
| **タスク1** | ユーザー向けLP (`app/[market]/page.tsx` の `#vsl` セクション) | **メイン使用** ✅ | 約1分10秒 | **採用** |
| **タスク2** | アフィリエイター向けLP (`app/affiliate/[market]/page.tsx` の `#vsl` セクション) | **メイン使用** ✅ | 約1分2秒 | **採用** |
| **タスク3** | 補完的用途または将来の独立VSLページ | **補完的** | 約1分28秒 | **予備** |

---

## 🔧 実装指示

### 1. ユーザー向けLPのVSLセクション

**使用VSL**: `task1-user-lp-two-young-men`

**実装方法**:
```tsx
// app/[market]/page.tsx
import vslMetadata from '@/data/vsl-heygen/vsl-heygen-metadata.json';

export default function UserLPPage({ params }: { params: { market: string } }) {
  const userLpVsl = vslMetadata.videos.find(v => v.id === 'task1-user-lp-two-young-men');
  
  return (
    <section id="vsl">
      <div dangerouslySetInnerHTML={{ __html: userLpVsl?.heygenEmbedCode || '' }} />
    </section>
  );
}
```

### 2. アフィリエイター向けLPのVSLセクション

**使用VSL**: `task2-affiliate-lp-hidden-enemy`

**実装方法**:
```tsx
// app/affiliate/[market]/page.tsx
import vslMetadata from '@/data/vsl-heygen/vsl-heygen-metadata.json';

export default function AffiliateLPPage({ params }: { params: { market: string } }) {
  const affiliateLpVsl = vslMetadata.videos.find(v => v.id === 'task2-affiliate-lp-hidden-enemy');
  
  return (
    <section id="vsl">
      <div dangerouslySetInnerHTML={{ __html: affiliateLpVsl?.heygenEmbedCode || '' }} />
    </section>
  );
}
```

### 3. タスク3のVSL（補完的用途）

**使用VSL**: `task3-vsl-script`

**使用シナリオ**:
- 将来的に独立したVSLページを作成する場合
- A/Bテストでタスク1と比較する場合
- より詳細な説明が必要なユーザー向けの追加コンテンツとして

---

## ✅ 決定理由の詳細

### タスク1を選択した理由

1. **LP設計との完全一致**
   - VSLセクションのタイトル: `"Why did Trader B earn $5K while Trader A lost everything?"`
   - タスク1の内容: Two Young Menストーリー（Trader A vs Trader B）
   - 完全に一致している

2. **CVR最大化の観点**
   - 短い動画（約1分10秒）は視聴完了率が高い
   - 感情的なインパクトが強い
   - すぐにCTAへ導ける

3. **ストーリーの一貫性**
   - ユーザー向けLP全体が「Two Young Menストーリー」をベースに設計されている
   - タスク1はこのストーリーに特化しており、LP全体のメッセージと完全に一致

4. **実装の簡潔性**
   - 現在のLP実装と完全に一致しているため、実装が簡単
   - 追加の変更が不要

### タスク3を補完的用途とした理由

1. **より詳細な説明**
   - タスク3は3つの柱を詳細に説明している
   - 価格（$69）も提示されている
   - より長い動画時間（約1分28秒）で、より包括的な説明を提供

2. **将来の拡張性**
   - 独立したVSLページを作成する場合に使用可能
   - A/BテストでCVRを比較する場合に使用可能

3. **補完的な役割**
   - タスク1で興味を持ったユーザーが、より詳細な情報を求める場合に使用可能

---

## 🚀 実装優先順位

1. ✅ **最優先**: タスク1をユーザー向けLPのVSLセクションに実装
2. ✅ **最優先**: タスク2をアフィリエイター向けLPのVSLセクションに実装
3. ⏳ **将来**: タスク3を補完的用途または独立VSLページに実装

---

## 📝 注意事項

1. **タスク1とタスク3の違い**
   - タスク1: Two Young Menストーリーに特化、短い（約1分10秒）
   - タスク3: Video Sales Letter構造、詳細（約1分28秒）

2. **実装時の確認事項**
   - VSLセクションのタイトルが「Why did Trader B earn $5K while Trader A lost everything?」であることを確認
   - タスク1のVSLが正しく埋め込まれていることを確認

3. **将来的な拡張**
   - タスク3のVSLは、将来的に独立したVSLページやA/Bテストで使用可能
   - 必要に応じて、タスク1とタスク3を切り替える仕組みを実装可能

---

**最終更新**: 2026-01-12  
**決定者**: COO（Cursor/Composer）  
**承認者**: CEO
