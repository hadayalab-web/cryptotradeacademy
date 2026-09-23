# 構造化出力機能実装

## 概要

Gemini APIの構造化出力機能をMCPサーバーに追加しました。JSONスキーマに準拠した予測可能で解析可能なレスポンスを生成できます。

## 追加された機能

### ✅ 構造化出力 (`gemini_structured_output`)

**機能**: JSONスキーマに準拠した構造化データの生成

- **ドキュメント**: https://ai.google.dev/gemini-api/docs/structured-output
- **主な用途**:
  - データ抽出: 非構造化テキストから特定の情報を抽出
  - 構造化された分類: テキストを事前定義されたカテゴリに分類
  - エージェントワークフロー: 他のツールやAPIの呼び出しに使用できる構造化データを生成

## 対応モデル

以下のモデルが構造化出力をサポートしています：

- ✅ Gemini 3 Pro プレビュー
- ✅ Gemini 3 Flash プレビュー
- ✅ Gemini 2.5 Pro
- ✅ Gemini 2.5 Flash（デフォルト）
- ✅ Gemini 2.5 Flash-Lite
- ✅ Gemini 2.0 Flash
- ✅ Gemini 2.0 Flash-Lite

## タスクタイプ

- `extract` - データ抽出（デフォルト）
- `classify` - 構造化された分類
- `generate` - 構造化データの生成
- `custom` - カスタムタスク

## 使用例

### データ抽出（レシピの抽出）

```javascript
{
  "model": "gemini-2.5-flash",
  "prompt": "Please extract the recipe from the following text. The user wants to make delicious chocolate chip cookies...",
  "task": "extract",
  "schema": {
    "type": "object",
    "properties": {
      "recipe_name": {
        "type": "string",
        "description": "The name of the recipe"
      },
      "prep_time_minutes": {
        "type": "integer",
        "description": "Optional time in minutes to prepare the recipe"
      },
      "ingredients": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the ingredient"
            },
            "quantity": {
              "type": "string",
              "description": "Quantity of the ingredient, including units"
            }
          },
          "required": ["name", "quantity"]
        }
      },
      "instructions": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": ["recipe_name", "ingredients", "instructions"]
  }
}
```

### 構造化された分類（顧客フィードバック）

```javascript
{
  "model": "gemini-2.5-flash",
  "prompt": "この顧客フィードバックを感情とトピックで分類してください: '製品は素晴らしいですが、配送が遅かったです。'",
  "task": "classify",
  "schema": {
    "type": "object",
    "properties": {
      "sentiment": {
        "type": "string",
        "enum": ["positive", "negative", "neutral"],
        "description": "感情の分類"
      },
      "topic": {
        "type": "string",
        "enum": ["product", "delivery", "service", "other"],
        "description": "トピックの分類"
      },
      "summary": {
        "type": "string",
        "description": "フィードバックの要約"
      }
    },
    "required": ["sentiment", "topic"]
  }
}
```

### エージェントワークフロー（ゲームキャラクターシート）

```javascript
{
  "model": "gemini-2.5-pro",
  "prompt": "以下の情報からRPGゲームのキャラクターシートを作成してください: ...",
  "task": "generate",
  "schema": {
    "type": "object",
    "properties": {
      "character_name": {
        "type": "string"
      },
      "class": {
        "type": "string",
        "enum": ["warrior", "mage", "rogue", "cleric"]
      },
      "level": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "stats": {
        "type": "object",
        "properties": {
          "strength": {"type": "integer"},
          "intelligence": {"type": "integer"},
          "dexterity": {"type": "integer"}
        }
      }
    },
    "required": ["character_name", "class", "level", "stats"]
  }
}
```

## JSONスキーマのサポート

### 基本型

- `object` - オブジェクト
- `array` - 配列
- `string` - 文字列
- `integer` - 整数
- `number` - 数値
- `boolean` - 真偽値
- `null` - null値

### 文字列の制約

- `enum` - 可能な値のセット
- `pattern` - 正規表現パターン
- `minLength` / `maxLength` - 文字列の長さ
- `format` - 形式（`date-time`, `date`, `time`など）

### 数値の制約

- `enum` - 可能な値のセット
- `minimum` / `maximum` - 最小値/最大値

### 配列の制約

- `items` - 配列内のすべての項目のスキーマ
- `prefixItems` - 最初のN個の項目のスキーマ（タプル構造）
- `minItems` / `maxItems` - 最小/最大項目数

## ベストプラクティス

### 1. 明確な説明

スキーマの`description`フィールドを使用して、各プロパティが何を表しているかを明確に指定します。

### 2. 強い型付け

可能な限り、特定の型（`integer`, `string`, `enum`）を使用します。有効な値のセットが限られている場合は、`enum`を使用します。

### 3. プロンプトエンジニアリング

モデルに実行してほしいことをプロンプトで明確に指定します：
- 「テキストから次の情報を抽出してください」
- 「提供されたスキーマに従ってこのフィードバックを分類してください」

### 4. 検証

構造化された出力では、構文的に正しいJSONが保証されますが、値が意味的に正しいことは保証されません。最終的な出力は、使用する前に必ずアプリケーションコードで検証してください。

### 5. エラー処理

アプリケーションに堅牢なエラー処理を実装して、モデルの出力がスキーマに準拠していてもビジネスロジックの要件を満たしていない場合を適切に処理します。

## 制限事項

- **スキーマのサブセット**: JSONスキーマ仕様のすべての機能がサポートされているわけではありません
- **スキーマの複雑さ**: 非常に大きいスキーマやネストが深いスキーマは拒否されることがあります
- **エラー時の対処**: エラーが発生した場合は、プロパティ名を短くしたり、ネストを減らしたり、制約の数を制限したりして、スキーマを簡素化してみてください

## 構造化出力と関数呼び出しの違い

| 機能 | 主なユースケース |
|------|----------------|
| **構造化出力** | **ユーザーへの最終的な回答の書式設定**。モデルの_回答_を特定の形式にする場合（ドキュメントからデータを抽出してデータベースに保存するなど）に使用 |
| **関数呼び出し** | **会話中にアクションを実行する**。モデルがタスクの実行を_ユーザーに依頼する_必要がある場合（たとえば、「現在の天気を取得」）を実行してから、最終的な回答を提供 |

## 参考

- [構造化出力公式ドキュメント](https://ai.google.dev/gemini-api/docs/structured-output)
- [JSONスキーマ仕様](https://json-schema.org/)
