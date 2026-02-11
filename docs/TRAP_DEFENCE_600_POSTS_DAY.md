# Trap Defence OS: 600投稿/日 スケジューラ

## 概要

- **Cron**: 7分ごとに `/api/x-quote-repost-batch` 実行
- **1バッチ**: 3投稿、150秒間隔
- **言語ローテ**: 奇数バッチ EN/ES/PT、偶数バッチ JA/KO/AR
- **日次**: ~205バッチ × 3 = **約615投稿/日**

## 安全設計

- 投稿間隔 150秒（anti-spam 安全ライン）
- 多言語分散で BAN リスク低減
- 既存テンプレ/Grok/hybrid の揺らぎ維持

## 手動実行

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://your-domain.vercel.app/api/x-quote-repost-batch"
```
