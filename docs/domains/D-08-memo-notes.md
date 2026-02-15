# D-08: メモ & ノート（Memo & Notes）

## ドメイン概要

ユーザーのメモ管理（CRUD）と、メモ参照情報（`refs`）の保持を担当するドメイン。

## 責務境界

- メモの作成/一覧/詳細/更新/削除
- メモに紐づく参照情報（paper/project/chunk/keyword）の保存
- ユーザー単位のアクセス制御（`ownerUid`）

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-0801 | メモCRUD | 作成/読取/更新/削除 |
| F-0802 | 参照連結 | `refs` サブコレクションで参照先を保持 |
| F-0803 | 並び替え | 一覧を `updatedAt` 降順で返却 |

## 主要エンティティ

### Memo

`memos/{memoId}`

```json
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "body": "string",
  "status": "draft | reviewed | string",
  "tags": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### MemoRef

`memos/{memoId}/refs/{refType}_{refId}`

```json
{
  "memoId": "string",
  "refType": "paper | project | chunk | keyword",
  "refId": "string",
  "note": "string | null"
}
```

補足:
- `refs` はメモ本体とは別のサブコレクションで保存
- 更新時に `refs` を指定した場合は、既存 `refs` を一旦全削除して再作成する

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/memos` | メモ一覧 |
| `POST` | `/api/v1/memos` | メモ作成 |
| `GET` | `/api/v1/memos/{memo_id}` | メモ詳細 |
| `PATCH` | `/api/v1/memos/{memo_id}` | メモ更新 |
| `DELETE` | `/api/v1/memos/{memo_id}` | メモ削除 |

## スキーマ（実装）

### `MemoCreate`

```json
{
  "title": "string",
  "body": "string",
  "tags": ["string"],
  "refs": [
    {
      "ref_type": "paper",
      "ref_id": "string",
      "note": "string"
    }
  ],
  "status": "draft"
}
```

### `MemoResponse`

```json
{
  "id": "string",
  "owner_uid": "string",
  "title": "string",
  "body": "string",
  "status": "draft",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "tags": ["string"],
  "refs": [
    {
      "ref_type": "paper",
      "ref_id": "string",
      "note": "string | null"
    }
  ]
}
```

## 実装挙動

- 一覧は `ownerUid` でフィルタし、`updated_at` 降順で返す
- 詳細/更新/削除は `ownerUid` 不一致時に 404 として扱う
- `PATCH` は部分更新
- `refs` 未指定で更新した場合は既存 `refs` を維持
- `refs` を指定して更新した場合は全置換

## 現状の注意点

- APIレベルの検索フィルター（キーワード、paper_id など）は未実装
  - 現状は `GET /api/v1/memos` で全件取得し、フロントで絞り込み
- `MemoService.create_auto_memo(...)` は実装済みだが、現行フローでは自動呼び出しされていない

## 実装ステータス

- 実装済み: メモCRUD
- 実装済み: 参照連結（`refs`）
- 実装済み: `updatedAt` 降順一覧
- 未実装: API側の条件検索（タグ/参照先によるサーバーフィルタ）
- 未実装: いいね時の自動メモ生成フック
