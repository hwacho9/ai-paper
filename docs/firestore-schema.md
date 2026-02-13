# Firestoreコレクション設計書

## 概要

本ドキュメントはFirestoreのコレクション/ドキュメント構造を定義する。すべてのユーザーデータは `ownerUid` ベースでアクセス制御される。

## コレクション一覧

| コレクション                    | ドメイン | 説明                     |
| ------------------------------- | -------- | ------------------------ |
| `users`                         | D-01     | ユーザープロフィール     |
| `papers`                        | D-03     | 論文メタデータ           |
| `users/{uid}/likes`             | D-03     | いいね記録               |
| `papers/{paperId}/chunks`       | D-05     | 論文チャンク             |
| `papers/{paperId}/ingest_jobs`  | D-05     | 取り込みジョブ           |
| `papers/{paperId}/keywords`     | D-06     | 論文キーワード           |
| `papers/{paperId}/highlights`   | D-09     | ハイライト               |
| `projects`                      | D-02     | マイペーパープロジェクト |
| `projects/{projectId}/papers`   | D-02     | プロジェクト参照論文     |
| `keywords`                      | D-06     | キーワードマスター       |
| `memos`                         | D-08     | メモ                     |
| `memos/{memoId}/refs`           | D-08     | メモ参照                 |
| `paper_relations`               | D-07     | 論文関連度               |
| `graph_snapshots`               | D-07     | グラフスナップショット   |
| `tex_docs`                      | D-10     | TeX文書                  |
| `tex_docs/{texDocId}/citations` | D-10     | 引用                     |

## ドキュメント構造

### users/{uid}

```json
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "researchFields": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "preferences": { "language": "ja", "theme": "light" }
}
```

### papers/{paperId}

```json
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "authors": ["string"],
  "year": 2024,
  "venue": "string",
  "doi": "string | null",
  "arxivId": "string | null",
  "abstract": "string",
  "pdfUrl": "string | null",
  "pdfGcsPath": "string | null",
  "status": "PENDING | INGESTING | READY | FAILED",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### projects/{projectId}

```json
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "description": "string",
  "paperCount": 0,
  "status": "active | archived",
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
  "status": "draft | reviewed",
  "tags": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## 複合インデックス

| コレクション | フィールド                                     | 順序             |
| ------------ | ---------------------------------------------- | ---------------- |
| `papers`     | `ownerUid` ASC, `createdAt` DESC               | 一覧表示用       |
| `papers`     | `ownerUid` ASC, `status` ASC, `createdAt` DESC | 状態フィルター用 |
| `projects`   | `ownerUid` ASC, `createdAt` DESC               | 一覧表示用       |
| `memos`      | `ownerUid` ASC, `updatedAt` DESC               | メモ一覧用       |
| `keywords`   | `ownerUid` ASC, `label` ASC                    | キーワード一覧用 |

## セキュリティルール

- すべてのCRUD操作で `ownerUid == request.auth.uid` を検証
- 共有機能は後順位（`projectMembers[]` で拡張予定）
