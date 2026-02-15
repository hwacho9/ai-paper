# D-05: 取り込みパイプライン（Ingestion Pipeline）

## ドメイン概要

論文PDFの取り込み処理（Parse -> Chunk -> Embed -> Index）を非同期で実行し、
Firestore の論文状態とチャンクデータを更新するドメイン。

## 責務境界

- 取り込みジョブの起動（Cloud Run Jobs / ローカル実行）
- PDFの取得とテキスト抽出
- チャンク生成
- 埋め込み生成（Vertex AI）
- Vector Search へのアップサート
- Firestore 状態更新（`INGESTING -> READY/FAILED`）

## 機能一覧

| 機能ID | 機能名                         | 説明 |
| ------ | ------------------------------ | ---- |
| F-0501 | パイプライントリガー           | API から Cloud Run Jobs を起動 |
| F-0502 | PDFパース                      | Storage上PDFをページ単位テキストへ変換 |
| F-0503 | チャンク生成                   | 文字数ベースのスライディングウィンドウ分割 |
| F-0504 | 埋め込み生成・インデックス登録 | `text-embedding-004` と Vector Search 更新 |
| F-0505 | 状態更新                       | `papers/{paperId}` の状態・エラー情報更新 |

## 実行トリガー（現行）

現行実装は Pub/Sub 主体ではなく、API 経由の直接起動。

- `POST /api/v1/library/{paper_id}/ingest`
  - 手動インジェスト起動
- `POST /api/v1/library/{paper_id}/upload`
  - PDFアップロード後にインジェスト起動
- `POST /api/v1/library/{paper_id}/like`
  - `pdf_url` がPDFらしい場合のみ自動インジェスト起動

起動時に Worker へ以下を渡す。

```json
{
  "PAPER_ID": "string",
  "OWNER_UID": "string",
  "REQUEST_ID": "manual-... or auto-...",
  "PDF_URL": "string | null"
}
```

## パイプライン処理フロー

1. `papers/{paperId}.status` を `INGESTING` に更新
2. PDF取得
3. PDFパース（PyMuPDF）
4. チャンク生成
5. 埋め込み生成（Vertex AI）
6. Vector Searchアップサート
7. `papers/{paperId}/chunks` に保存
8. `papers/{paperId}.status` を `READY` に更新

例外時は `status=FAILED` に更新し、`error` を記録する。

## データモデル（実装）

### papers/{paperId} への更新

```json
{
  "status": "INGESTING | READY | FAILED",
  "updatedAt": "serverTimestamp",
  "lastRequestId": "string",
  "startedAt": "serverTimestamp",
  "error": "string | null"
}
```

### papers/{paperId}/chunks/{chunkId}

```json
{
  "paperId": "string",
  "chunkId": "string",
  "text": "string",
  "pageNumber": 1,
  "tokenCount": 123,
  "updatedAt": "serverTimestamp"
}
```

補足:
- `section`, `pageRange`, `embeddingRef` は現行の保存モデルには含まれない
- 埋め込みベクトル本体は Firestore に保存しない

## 実装詳細

### Trigger/Job実行

- API 側は `execute_ingest_job(...)` を呼び出す
- `run_ingest_locally=true` のときは Worker を同一プロセスで非同期起動
- それ以外は Cloud Run Jobs を `RunJobRequest` で実行

### Parse

- Storage パス規約: `papers/{ownerUid}/{paperId}.pdf`
- `pdf_url` が渡され、StorageにPDFがない場合は外部URLから取得して保存
- パースはページごとに `text` を抽出

### Chunk

- 文字数ベース
  - `CHUNK_SIZE=1000`
  - `CHUNK_OVERLAP=200`
- `chunk_id` は UUID

### Embed

- モデル: `text-embedding-004`
- バッチ: 5件ずつ
- Task Type: `RETRIEVAL_DOCUMENT`

### Index

- Vector Search へ `upsert_datapoints`
- restricts:
  - `paper_id`
  - `owner_uid`
- `VECTOR_INDEX_ID` 未設定時はインデックス更新をスキップ（Mock扱い）

## 失敗時の扱い

- 途中例外はキャッチして `FAILED` へ更新
- API 側のジョブ起動失敗はログ記録（非同期処理のためAPI全体は止めない設計）

## 現状の注意点

- 仕様上の Pub/Sub/Eventarc 主体フローは未採用（将来拡張候補）
- チャンクIDが毎回 UUID のため、厳密な再実行冪等（同一ID上書き）にはなっていない
- `tokenCount` は文字数ベースの簡易値

## 実装ステータス

- 実装済み: API起点での非同期インジェスト起動
- 実装済み: Parse -> Chunk -> Embed -> Index の処理
- 実装済み: Firestore 状態更新（`INGESTING/READY/FAILED`）
- 実装済み: `pdf_url` 指定時の自動ダウンロード補完
- 未実装: Pub/Sub/Eventarc 主体の本格イベント駆動運用
