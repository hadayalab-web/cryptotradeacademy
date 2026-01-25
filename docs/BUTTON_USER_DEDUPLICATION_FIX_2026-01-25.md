# ボタン重複クリック防止機能の実装レポート（2026-01-25）

## 問題

同じユーザーが「🔥 I'm Safe (Trap Avoided)」ボタンを何度もクリックすると、毎回カウントが増加してしまいます。これにより、ソーシャルプルーフの数値が実際よりも大きく表示される可能性があります。

## 原因

`services/telegram/reaction-counter.js`の`incrementSavedCount`関数に、ユーザーIDによる重複防止ロジックが実装されていませんでした。コメントには「重複防止用（今回は簡易実装のためログ記録のみに使用）」と書かれていましたが、実際には重複チェックが行われていませんでした。

## 修正内容

### 1. データ構造の拡張

日次ユーザーIDリストを保存するフィールドを追加：

```javascript
const DEFAULT_DATA = {
  totalSaved: 0,
  dailySaved: {},
  dailyUsers: {},  // 新規追加：日次ユーザーIDリスト { "2024-01-01": ["userId1", "userId2", ...] }
  lastUpdated: new Date().toISOString()
};
```

### 2. 重複防止ロジックの実装

`incrementSavedCount`関数に重複チェックを追加：

```javascript
async function incrementSavedCount(userId) {
  // 日次ユーザーリストを取得
  const todayUsers = data.dailyUsers[today] || [];
  
  // 重複チェック：今日既にクリックしたユーザーはカウントしない
  const isNewUser = !todayUsers.includes(userId);
  
  if (!isNewUser) {
    // 既存ユーザーの場合、カウントを増やさずに現在の値を返す
    return {
      total: data.totalSaved || 0,
      today: data.dailySaved?.[today] || 0,
      isNewUser: false
    };
  }
  
  // 新規ユーザーの場合のみカウントアップ
  data.totalSaved = (data.totalSaved || 0) + 1;
  data.dailySaved[today] = (data.dailySaved[today] || 0) + 1;
  todayUsers.push(userId);
  data.dailyUsers[today] = todayUsers;
  
  return {
    total: data.totalSaved,
    today: data.dailySaved[today],
    isNewUser: true
  };
}
```

### 3. ユーザーフィードバックの改善

`services/telegram/bot-commands.js`で、新規ユーザーと既存ユーザーで異なるメッセージを表示：

```javascript
if (counts.isNewUser) {
  notificationText = `🔥 Defense Confirmed! (Today: ${counts.today} protected)`;
} else {
  notificationText = `🔥 You've already confirmed today! (Today: ${counts.today} protected)`;
}
```

## 修正後の動作

### 新規ユーザー（初回クリック）
- ✅ カウントが増加する
- ✅ 「🔥 Defense Confirmed! (Today: X protected)」と表示される

### 既存ユーザー（2回目以降のクリック）
- ✅ カウントが増加しない（重複防止）
- ✅ 「🔥 You've already confirmed today! (Today: X protected)」と表示される
- ✅ ユーザーに既にクリック済みであることを通知

## データ構造

### KVに保存されるデータ構造

```json
{
  "totalSaved": 150,
  "dailySaved": {
    "2026-01-25": 45,
    "2026-01-24": 38
  },
  "dailyUsers": {
    "2026-01-25": ["123456789", "987654321", ...],
    "2026-01-24": ["111222333", "444555666", ...]
  },
  "lastUpdated": "2026-01-25T12:00:00.000Z"
}
```

## 注意事項

1. **日次リセット**: `dailyUsers`は日付ごとに管理されるため、翌日になると同じユーザーでも再度カウントされます
2. **データサイズ**: ユーザー数が多い場合、`dailyUsers`配列が大きくなる可能性があります。必要に応じて、古い日付のデータを削除するクリーンアップ処理を追加することを推奨します
3. **パフォーマンス**: ユーザー数が非常に多い場合（1000人以上/日）、配列の`includes`チェックが遅くなる可能性があります。その場合は、SetやMapを使用することを検討してください（ただし、JSON保存時に配列に変換する必要があります）

## 次のステップ

1. **デプロイ**: 修正をVercelにデプロイ
2. **テスト**: 
   - 同じユーザーが2回クリックした場合、2回目はカウントが増えないことを確認
   - 異なるユーザーがクリックした場合、それぞれカウントが増えることを確認
3. **監視**: ログで重複防止が正しく動作しているか確認
