# D-06: キーワード & タグ付け（Keyword & Tagging）

## ドメイン概要

ユーザー定義キーワードの管理と、論文への手動/自動タグ付けを担当するドメイン。

## 責務境界

- キーワードのCRUD（ユーザー単位）
- 論文へのキーワードタグ付け・解除
- 論文ごとの自動キーワード推薦（LLM + フォールバック）
- 論文ドキュメントの `keywords` / `prerequisiteKeywords` 同期

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-0601 | キーワードCRUD | 作成/一覧/更新/削除 |
| F-0602 | 論文キーワードタグ付け | 手動タグ付け・一覧・解除 |
| F-0603 | 自動キーワード推薦 | 推薦結果の保存（`source=auto`） |
| F-0604 | 論文キーワード同期 | タグ情報を `papers` に反映 |

## 主要エンティティ

### Keyword

`keywords/{keywordId}`

```json
{
  "ownerUid": "string",
  "label": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### PaperKeyword

`papers/{paperId}/keywords/{keywordId}`

```json
{
  "paperId": "string",
  "keywordId": "string",
  "confidence": 0.95,
  "source": "manual | auto",
  "reason": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

補足:
- サブコレクションの Firestore ドキュメントIDには `keywordId` を利用
- `paperId` に `/` を含む場合は内部的にサニタイズして保存

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/keywords` | キーワード作成 |
| `GET` | `/api/v1/keywords` | キーワード一覧 |
| `PATCH` | `/api/v1/keywords/{keyword_id}` | キーワード更新 |
| `DELETE` | `/api/v1/keywords/{keyword_id}` | キーワード削除 |
| `POST` | `/api/v1/papers/{paper_id}/keywords` | 論文に手動タグ付け |
| `GET` | `/api/v1/papers/{paper_id}/keywords` | 論文のタグ一覧 |
| `DELETE` | `/api/v1/papers/{paper_id}/keywords/{keyword_id}` | 論文からタグ解除 |
| `POST` | `/api/v1/papers/{paper_id}/keywords/suggest` | 自動推薦して反映 |

## 挙動詳細

### F-0601 キーワードCRUD

- `label` は trim 後に空文字不可
- 同一 `ownerUid` 内で `label` 重複を禁止（409）
- 一覧は `updatedAt` 降順

### F-0602 手動タグ付け

- `confidence` 未指定時は `1.0`
- `confidence` は `0.0 <= x <= 1.0`
- `reason` 未指定時は `manual_tag`
- 手動付与は `source=manual`
- 付与/解除後に `papers/{paperId}` の以下を再計算して同期
  - `keywords`
  - `prerequisiteKeywords`
- 分類規則は `reason` に `"prerequisite"` を含むかどうか

### F-0603 自動推薦

- `POST /papers/{paper_id}/keywords/suggest` は推薦してそのまま保存する
- 推薦器は Gemini を優先利用し、失敗時はルールベースへフォールバック
- 推薦結果の `reason` は主に以下
  - `llm_paper_keyword`
  - `llm_prerequisite_keyword`
- 反映ポリシー
  - 既存 `manual` タグは保持
  - 既存 `auto` タグは削除して置換
  - 既存 manual と同じ `keywordId` の auto はスキップ

## レスポンスモデル（主要）

### `PaperKeywordResponse`

```json
{
  "paper_id": "string",
  "keyword_id": "string",
  "label": "string",
  "description": "string",
  "confidence": 0.95,
  "source": "manual",
  "reason": "manual_tag"
}
```

### `KeywordSuggestionResponse`

```json
{
  "paper_id": "string",
  "suggestions": [
    {
      "keyword_id": "string",
      "label": "string",
      "confidence": 0.85,
      "source": "auto",
      "reason": "llm_paper_keyword"
    }
  ],
  "total": 1
}
```

## アクセス制御（現行と移行方針）

- 現行の論文アクセス判定は `likes` ベース（ライブラリに入っているか）
- `papers.ownerUid` を前提とした厳密ACLには未移行
- 判定は `KeywordService._ensure_paper_access` に集約されており、移行時の主変更点はここ

## 実装ステータス

- 実装済み: キーワードCRUD
- 実装済み: 論文への手動タグ付け・解除・一覧
- 実装済み: 自動推薦（LLM + ルールベースフォールバック）
- 実装済み: autoタグ置換とmanualタグ保持
- 実装済み: `papers.keywords` / `papers.prerequisiteKeywords` 同期
- 未実装: ownerUidベースACLへの移行
- 未実装: キーワード適合性判定の独立API（スコアのみ返す専用エンドポイント）
