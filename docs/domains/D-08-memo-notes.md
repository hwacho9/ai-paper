# D-08: メモ & ノート（Memo & Notes）

## ドメイン概要

メモの作成/検索、論文/キーワード/チャンク単位での参照連結、引用根拠の記録を担当。

## 責務境界

- メモのCRUD
- メモを特定のPaper/Chunk/Keywordに連結
- メモの検索（キーワード/論文ベース）
- いいね保存時の自動メモ生成

## 機能一覧

| 機能ID | 機能名   | 説明                          |
| ------ | -------- | ----------------------------- |
| F-0801 | メモCRUD | 作成/読取/更新/削除           |
| F-0802 | 参照連結 | Paper/Chunk/Keywordへの紐付け |
| F-0803 | メモ検索 | キーワード/論文ベースの検索   |

## 主要エンティティ

### Memo

```
memos/{memoId}
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "body": "string",
  "status": "draft" | "reviewed",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "tags": ["string"]
}
```

### MemoRef（メモ参照）

```
memos/{memoId}/refs/{refId}
{
  "memoId": "string",
  "refType": "paper" | "project" | "chunk" | "keyword",
  "refId": "string",
  "note": "string | null"
}
```

## API仕様

| メソッド | パス                | 説明                       |
| -------- | ------------------- | -------------------------- |
| `POST`   | `/api/v1/memos`     | メモ作成                   |
| `GET`    | `/api/v1/memos`     | メモ一覧（フィルター対応） |
| `GET`    | `/api/v1/memos/:id` | メモ詳細                   |
| `PATCH`  | `/api/v1/memos/:id` | メモ更新                   |
| `DELETE` | `/api/v1/memos/:id` | メモ削除                   |

## スキーマ（Pydantic）

```python
class MemoCreate(BaseModel):
    title: str = ""
    body: str = ""
    tags: list[str] = []
    refs: list[MemoRefCreate] = []

class MemoRefCreate(BaseModel):
    ref_type: str  # "paper" | "project" | "chunk" | "keyword"
    ref_id: str
    note: str | None = None

class MemoResponse(BaseModel):
    id: str
    owner_uid: str
    title: str
    body: str
    status: str
    created_at: datetime
    updated_at: datetime
    tags: list[str]
    refs: list[MemoRefResponse]
```

## フロントエンド

### ページ

- `/memos` — メモ一覧（チェック/編集/整理）

### コンポーネント

- `MemoCard` — メモカード（一覧用、チェックボックス付き）
- `MemoEditor` — メモ編集器（リッチテキスト）
- `MemoRefBadge` — 参照先バッジ（論文/チャンク/キーワード）

## 自動メモ生成フロー

1. ユーザーが論文にいいね → D-03が `POST /memos` を呼び出し
2. タイトル: 論文タイトルのコピー
3. ボディ: 要約テンプレート（後でユーザーが編集）
4. 参照: `refType=paper`, `refId=paperId`

## TODO一覧

```python
# TODO(F-0801): メモCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
# TODO(F-0802): 参照連結 | AC: メモとPaper/Chunk/Keywordの紐付け | owner:@
# TODO(F-0803): メモ検索 | AC: キーワード/論文ベースのフィルタリング | owner:@
```
