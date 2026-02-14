# D-06: キーワード & タグ付け（Keyword & Tagging）

## ドメイン概要

ユーザー定義および自動推薦キーワードの管理、論文へのキーワード付与を担当。

## 責務境界

- キーワードのCRUD（ユーザー定義 + 自動推薦）
- 論文へのキーワードタグ付け
- キーワードによる関連論文/文段検索
- 自動キーワード推薦（LLM/埋め込みベース）

## 機能一覧

| 機能ID | 機能名                 | 説明                               |
| ------ | ---------------------- | ---------------------------------- |
| F-0601 | キーワードCRUD         | 作成/修正/削除                     |
| F-0602 | 論文キーワードタグ付け | 論文にキーワードを付与             |
| F-0603 | 自動キーワード推薦     | LLM/埋め込みベースの推薦           |
| F-0604 | 適合性判断             | キーワードが論文に該当するかの判断 |

## 主要エンティティ

### Keyword

```
keywords/{keywordId}
{
  "id": "string",
  "ownerUid": "string",
  "label": "string",
  "description": "string",
  "createdAt": "timestamp"
}
```

### PaperKeyword

```
papers/{paperId}/keywords/{keywordId}
{
  "paperId": "string",
  "keywordId": "string",
  "confidence": 0.95,
  "source": "manual" | "auto"
}
```

## API仕様

| メソッド | パス                                     | 説明                 |
| -------- | ---------------------------------------- | -------------------- |
| `POST`   | `/api/v1/keywords`                       | キーワード作成       |
| `GET`    | `/api/v1/keywords`                       | キーワード一覧       |
| `PATCH`  | `/api/v1/keywords/:id`                   | キーワード更新       |
| `DELETE` | `/api/v1/keywords/:id`                   | キーワード削除       |
| `GET`    | `/api/v1/papers/:id/keywords`            | 論文のキーワード一覧 |
| `POST`   | `/api/v1/papers/:id/keywords`            | 論文にキーワード付与 |
| `DELETE` | `/api/v1/papers/:id/keywords/:keywordId` | キーワード解除       |
| `POST`   | `/api/v1/papers/:id/keywords/suggest`    | 自動キーワード推薦   |

## TODO一覧

```python
# TODO(F-0601): キーワードCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
# TODO(F-0602): 論文タグ付け | AC: 論文とキーワードの紐付け/解除 | owner:@
# TODO(F-0603): 自動推薦 | AC: LLM/埋め込みベースのキーワード候補返却 | owner:@
# TODO(F-0604): 適合性判断 | AC: キーワード-論文の適合度スコア返却 | owner:@
# TODO(F-0602): ownerUidベースACLへの移行 | AC: papers.ownerUid導入後、likes依存チェックをownerUid照合に置換 | owner:@
```

## 実装メモ（ACL移行）

- 現在のF-0602実装では `KeywordService._ensure_paper_access` が **likesベース** でアクセス可否を判定している。
- `papers.ownerUid` 導入後は、この関数の判定ロジックを **ownerUid照合ベース** に置換すること。
- 置換対象をこの関数に集約しているため、移行時の修正箇所は原則ここ1箇所を想定。
