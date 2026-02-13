# D-05: 取り込みパイプライン（Ingestion Pipeline）

## ドメイン概要

PDF → テキスト抽出 → セクション分割 → チャンク生成 → 埋め込み生成 → Vector Searchインデックス更新までの非同期パイプラインを担当。

## 責務境界

- Pub/Sub トリガーによるパイプライン起動
- PDF パースおよびセクション構造化
- チャンク/メタ（セクション、ページ、オフセット）生成
- Vertex AI Embedding 生成およびインデックス登録
- Firestore 状態更新（INGESTING → READY / FAILED）

## 機能一覧

| 機能ID | 機能名                         | 説明                                         |
| ------ | ------------------------------ | -------------------------------------------- |
| F-0501 | パイプライントリガー           | Pub/Subイベント受信でJob起動                 |
| F-0502 | PDFパース                      | テキスト/セクション抽出                      |
| F-0503 | チャンク生成                   | セクション/ページ/オフセットメタ付きチャンク |
| F-0504 | 埋め込み生成・インデックス登録 | Vertex Embedding + Vector Search更新         |
| F-0505 | 状態更新                       | READY/FAILEDのFirestore反映                  |

## パイプラインフロー

```
PDF登録 → Pub/Sub発行 → Worker起動
  → parser: PDF→テキスト/セクション
  → chunker: チャンク生成
  → embedder: ベクトル生成
  → indexer: Vector Search更新
  → Firestore: status=READY
```

## 主要エンティティ

### PaperIngestJob

```
papers/{paperId}/ingest_jobs/{jobId}
{
  "paperId": "string",
  "status": "INGESTING" | "READY" | "FAILED",
  "startedAt": "timestamp",
  "finishedAt": "timestamp | null",
  "error": "string | null",
  "chunkCount": "number",
  "requestId": "string"
}
```

### PaperChunk

```
papers/{paperId}/chunks/{chunkId}
{
  "paperId": "string",
  "chunkId": "string",
  "section": "string",
  "text": "string",
  "pageRange": [1, 3],
  "offset": 0,
  "tokenCount": 512,
  "embeddingRef": "string"
}
```

## イベント設計

| イベント名               | 用途                |
| ------------------------ | ------------------- |
| `paper.ingest.requested` | PDF取り込み開始依頼 |
| `paper.ingest.completed` | 取り込み完了通知    |
| `paper.ingest.failed`    | 取り込み失敗通知    |

### メッセージフォーマット

```json
{
  "paperId": "string",
  "ownerUid": "string",
  "pdfUrl": "gs://bucket/path/to/pdf",
  "requestId": "string",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

## 失敗/リトライポリシー

1. **パース失敗**: 1回リトライ → FAILED
2. **埋め込み/インデックス失敗**: 指数バックオフで最大3回リトライ
3. すべての例外はキャッチしてFirestoreにエラー状態を反映

## 冪等性保証

- 同じ `paperId` で再実行可能（既存チャンク/エンベディングを上書き）
- Vector Searchはアップサート（upsert）で既存データを更新

## 構造化ログ

```python
# 各ステップで以下のフィールドを含む
{
    "requestId": "uuid",
    "paperId": "string",
    "step": "parse" | "chunk" | "embed" | "index",
    "duration_ms": 1234,
    "status": "success" | "error",
    "error": "string | null"
}
```

## TODO一覧

```python
# TODO(F-0501): パイプライントリガー | AC: Pub/Subメッセージ受信→Job起動 | owner:@
# TODO(F-0502): PDFパース | AC: テキスト+セクション抽出成功 | owner:@
# TODO(F-0503): チャンク生成 | AC: セクション/ページ/オフセットメタ付きチャンク生成 | owner:@
# TODO(F-0504): 埋め込み+インデックス | AC: Vertex Embedding生成+Vector Search登録 | owner:@
# TODO(F-0505): 状態更新 | AC: INGESTING→READY/FAILED遷移 | owner:@
```

## Cloud Run Jobs 設定

- CPU: 2 vCPU / メモリ: 2〜4GB
- 同時実行数: 1（推奨）
- タイムアウト: 10〜30分
- リトライ: 最大3回
