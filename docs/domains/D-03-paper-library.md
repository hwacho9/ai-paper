# D-03: ペーパーライブラリ（My Paper Library: いいね保存庫）

## ドメイン概要

検索結果/論文詳細から「いいね（Like）」で保存した論文の管理を担当。メタデータ管理、PDF登録、状態管理を行う。

## 責務境界

- 検索結果からのいいね保存（メタデータ基本）
- PDF アップロード/リンク登録
- ライブラリ照会/ソート/フィルター
- 論文状態管理（INGESTING / READY / FAILED）
- いいね保存時のメモ自動生成

## 機能一覧

| 機能ID | 機能名         | 説明                                               |
| ------ | -------------- | -------------------------------------------------- |
| F-0301 | 論文保存       | メタデータベースで論文をライブラリに保存           |
| F-0302 | PDF登録        | PDFファイルアップロードまたはURLリンク登録         |
| F-0303 | ライブラリ照会 | 保存論文の一覧表示、ソート、フィルター             |
| F-0304 | 論文詳細       | メタデータ、キーワード、メモ、関連論文の表示       |
| F-0305 | メモ自動生成   | いいね保存時にメモを自動作成（Memoドメインと連携） |

## 主要エンティティ

### Paper

```
papers/{paperId}
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "authors": ["string"],
  "year": "number",
  "venue": "string",
  "doi": "string | null",
  "arxivId": "string | null",
  "abstract": "string",
  "pdfUrl": "string | null",
  "pdfGcsPath": "string | null",
  "status": "PENDING" | "INGESTING" | "READY" | "FAILED",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Like

```
users/{uid}/likes/{paperId}
{
  "paperId": "string",
  "ownerUid": "string",
  "createdAt": "timestamp"
}
```

## API仕様

| メソッド | パス                      | 説明                     |
| -------- | ------------------------- | ------------------------ |
| `POST`   | `/api/v1/papers`          | 論文保存（メタデータ）   |
| `POST`   | `/api/v1/papers/:id/pdf`  | PDF アップロード/URL登録 |
| `GET`    | `/api/v1/papers`          | ライブラリ一覧           |
| `GET`    | `/api/v1/papers/:id`      | 論文詳細                 |
| `PATCH`  | `/api/v1/papers/:id`      | 論文メタ更新             |
| `DELETE` | `/api/v1/papers/:id`      | 論文削除                 |
| `POST`   | `/api/v1/papers/:id/like` | いいね保存               |
| `DELETE` | `/api/v1/papers/:id/like` | いいね解除               |

## スキーマ（Pydantic）

```python
class PaperCreate(BaseModel):
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    abstract: str = ""

class PaperResponse(BaseModel):
    id: str
    owner_uid: str
    title: str
    authors: list[str]
    year: int | None
    venue: str
    doi: str | None
    arxiv_id: str | None
    abstract: str
    pdf_url: str | None
    status: str
    is_liked: bool
    created_at: datetime

class PaperPdfUpload(BaseModel):
    pdf_url: str | None = None  # URL登録の場合
    # ファイルアップロードはmultipart/form-data
```

## 非同期連携

- PDFが登録されたら `paper.ingest.requested` イベントを発行 → D-05パイプライン実行

## フロントエンド

### ページ

- `/library` — いいね保存論文リスト/フィルター
- `/papers/[id]` — 論文詳細（メタ + いいね + Related プレビュー）

### コンポーネント

- `PaperCard` — 論文カード（リストアイテム）
- `PaperDetail` — 論文詳細情報
- `LikeButton` — いいねトグルボタン（❤️）
- `LibraryList` — ライブラリリスト
- `LibraryFilters` — フィルター/ソートUI
- `StatusBadge` — 論文状態バッジ（PENDING/INGESTING/READY/FAILED）

## TODO一覧

```python
# TODO(F-0301): 論文保存API | AC: ownerUid検証、重複防止 | owner:@
# TODO(F-0302): PDF登録 | AC: GCSアップロード、Pub/Sub発行 | owner:@
# TODO(F-0303): ライブラリ照会 | AC: ソート/フィルター/ページネーション | owner:@
# TODO(F-0304): 論文詳細 | AC: メタ+状態+関連情報表示 | owner:@
# TODO(F-0305): メモ自動生成 | AC: いいね時にメモ自動作成 | owner:@
```
