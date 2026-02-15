# D-09: 読解サポート（Reading Support）

## ドメイン概要

ライブラリ内論文の読解支援として、アウトライン/チャンク取得、選択テキスト説明、ハイライト保存、ライブラリ横断Q&Aを提供するドメイン。

## 責務境界

- 論文チャンクからのアウトライン生成
- チャンク一覧取得
- 選択テキストまたはチャンク単位の説明生成
- ハイライトの保存/一覧
- ライブラリ横断の根拠付きQ&A（RAG）

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-0901 | アウトライン取得 | `chunks` をページ単位で集約して返却 |
| F-0902 | チャンク取得 | 論文の `chunks` を返却 |
| F-0903 | 説明生成 | `selected_text` または `chunk_id` を説明 |
| F-0904 | ハイライト管理 | 保存・一覧取得 |
| F-0905 | ライブラリQ&A | 根拠チャンク付き回答を返却 |

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/outline` | アウトライン取得 |
| `GET` | `/api/v1/papers/{paper_id}/chunks` | チャンク一覧取得 |
| `POST` | `/api/v1/papers/{paper_id}/explain` | テキスト/チャンク説明 |
| `POST` | `/api/v1/papers/{paper_id}/highlights` | ハイライト保存 |
| `GET` | `/api/v1/papers/{paper_id}/highlights` | ハイライト一覧 |
| `POST` | `/api/v1/library/ask` | ライブラリRAG質問 |

補足:
- `paper` 系APIはライブラリ所属（Like済み）論文のみアクセス可
- `GET /papers/{paper_id}/chunks` の `section` クエリは現状未使用

## 主要エンティティ

### Highlight

`papers/{paperId}/highlights/{highlightId}`

```json
{
  "ownerUid": "string",
  "paperId": "string",
  "chunkId": "string | null",
  "textSpan": "string",
  "startOffset": 0,
  "endOffset": 10,
  "pageNumber": 1,
  "note": "string",
  "color": "yellow",
  "createdAt": "serverTimestamp"
}
```

## スキーマ（主要）

### `ExplainRequest`

```json
{
  "selected_text": "string | null",
  "chunk_id": "string | null"
}
```

### `ExplainResponse`

```json
{
  "explanation": "string",
  "source_chunk_id": "string",
  "page_range": [1],
  "confidence": 0.95
}
```

### `LibraryAskRequest`

```json
{
  "question": "string",
  "paper_ids": ["string"],
  "top_k": 5
}
```

バリデーション:
- `question`: 1..4000文字
- `top_k`: 1..20

### `LibraryAskResponse`

```json
{
  "answer": "string",
  "confidence": 0.82,
  "citations": [
    {
      "paper_id": "string",
      "chunk_id": "string",
      "score": 0.91,
      "page_range": [2],
      "snippet": "string"
    }
  ]
}
```

## 実装挙動

### F-0901/F-0902 アウトライン・チャンク

- チャンク取得元: `papers/{paperId}/chunks`
- `outline` はチャンクをページ番号順に並べ、連続ページを1セクションとして集約
- `chunks` はページ番号順で返却

### F-0903 説明生成

- `selected_text` または `chunk_id` のどちらか必須（無い場合 400）
- `chunk_id` 指定時は該当チャンク本文をコンテキスト化（先頭3000文字）
- LLM応答が取得できれば高信頼（`confidence=0.95`）、失敗時は低め

### F-0904 ハイライト

- 保存時チェック:
  - `page_number >= 1`
  - `start_offset >= 0`
  - `end_offset >= start_offset`
- 一覧は `createdAt` 降順

### F-0905 ライブラリQ&A

- `paper_ids` 指定時は、すべてがユーザーライブラリ所属であることを検証（不一致があれば403）
- ベクトル検索が有効な場合:
  - 質問埋め込みを生成して候補チャンクを取得
- 候補が取れない場合:
  - キーワード一致ベースのフォールバック検索
  - 非英語クエリでは英語キーワード抽出を試行
- それでも候補がない場合:
  - 根拠不足メッセージを返す（`confidence=0.15`, citations空）
- `confidence` は採用チャンクのスコア平均を `0.2..0.95` に丸めて返却

## 現状の注意点

- `section` 引数によるチャンク絞り込みは未実装
- `explain` で `selected_text` のみ入力時は `source_chunk_id="unknown"`, `page_range=[1]` を返す
- ベクトル検索は設定依存（`vector_index_endpoint_id`）で、無効時はフォールバック中心の動作

## 実装ステータス

- 実装済み: アウトライン取得
- 実装済み: チャンク取得
- 実装済み: 説明生成
- 実装済み: ハイライト保存/一覧
- 実装済み: ライブラリRAG質問（ベクトル + フォールバック）
- 未実装: section指定によるサーバー側チャンクフィルタ
