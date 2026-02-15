# Firestoreコレクション設計書

## 概要

本ドキュメントは、**現行実装で実際に読み書きしている** Firestore 構造を定義する。
アクセス制御は主に `ownerUid` と `users/{uid}/likes` を組み合わせて行う。

## コレクション一覧（現行）

| コレクション | ドメイン | 説明 |
| --- | --- | --- |
| `users` | D-01 | ユーザープロフィール |
| `users/{uid}/likes` | D-03 | ライブラリ保存（いいね） |
| `users/{uid}/cache` | D-07 | グラフキャッシュ |
| `papers` | D-03/D-05/D-06 | 論文メタ情報・取り込み状態 |
| `papers/{paperId}/chunks` | D-05/D-09 | 取り込みチャンク |
| `papers/{paperId}/keywords` | D-06 | 論文タグ |
| `papers/{paperId}/highlights` | D-09 | ハイライト |
| `projects` | D-02 | プロジェクト |
| `projects/{projectId}/papers` | D-02 | プロジェクト参照論文 |
| `keywords` | D-06 | キーワードマスター |
| `memos` | D-08 | メモ本体 |
| `memos/{memoId}/refs` | D-08 | メモ参照 |

## ドキュメント構造

### users/{uid}

```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "researchFields": ["string"],
  "preferences": {},
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### users/{uid}/likes/{paperId}

```json
{
  "paperId": "string",
  "createdAt": "timestamp"
}
```

### users/{uid}/cache/graph_global_{mode}

```json
{
  "nodes": [{ "id": "string", "label": "string", "group": "string", "val": 1 }],
  "edges": [{ "source": "string", "target": "string", "value": 0.5 }],
  "connectionMode": "keyword | embedding | hybrid",
  "updatedAt": "timestamp"
}
```

### papers/{paperId}

```json
{
  "id": "string",
  "title": "string",
  "authors": ["string"],
  "year": 2024,
  "venue": "string",
  "abstract": "string",
  "doi": "string | null",
  "arxivId": "string | null",
  "pdfUrl": "string | null",
  "status": "PENDING | INGESTING | READY | FAILED",
  "keywords": ["string"],
  "prerequisiteKeywords": ["string"],
  "lastRequestId": "string | null",
  "startedAt": "timestamp | null",
  "error": "string | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### papers/{paperId}/chunks/{chunkId}

```json
{
  "paperId": "string",
  "chunkId": "string",
  "text": "string",
  "pageNumber": 1,
  "tokenCount": 120,
  "updatedAt": "timestamp"
}
```

### papers/{paperId}/keywords/{keywordId}

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

### papers/{paperId}/highlights/{highlightId}

```json
{
  "ownerUid": "string",
  "paperId": "string",
  "chunkId": "string | null",
  "textSpan": "string",
  "startOffset": 0,
  "endOffset": 20,
  "pageNumber": 1,
  "note": "string",
  "color": "yellow",
  "createdAt": "timestamp"
}
```

### projects/{projectId}

```json
{
  "ownerUid": "string",
  "title": "string",
  "description": "string",
  "paperCount": 0,
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### projects/{projectId}/papers/{paperId}

```json
{
  "paperId": "string",
  "note": "string",
  "role": "reference",
  "addedAt": "timestamp"
}
```

### keywords/{keywordId}

```json
{
  "ownerUid": "string",
  "label": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### memos/{memoId}

```json
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "body": "string",
  "status": "draft",
  "tags": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### memos/{memoId}/refs/{refType}_{refId}

```json
{
  "memoId": "string",
  "refType": "paper | project | chunk | keyword",
  "refId": "string",
  "note": "string | null"
}
```

## 未運用/旧設計（現行API未使用）

- `paper_relations`
- `graph_snapshots`
- `tex_docs`
- `tex_docs/{texDocId}/citations`

補足:
- D-07 は `paper_relations` 永続化ではなく、都度計算 + `users/{uid}/cache` キャッシュ。
- D-10 は Firestore ではなく Cloud Storage に `projects/{ownerUid}/{projectId}/tex/` を保存。
- `app.modules.tex` の `texdocs` ルーターは `main.py` で未マウント。

## セキュリティ運用メモ

- `users`, `projects`, `keywords`, `memos` は `ownerUid` ベースで所有者検証。
- `papers` へのアクセスは D-03/D-06/D-09 で `users/{uid}/likes` 所属を前提に判定。
