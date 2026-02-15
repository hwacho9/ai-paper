# D-03: ペーパーライブラリ（My Paper Library: いいね保存庫）

## ドメイン概要

検索結果から「いいね（Like）」で保存した論文の管理を担当するドメイン。  
ライブラリ一覧/詳細、Like トグル、PDFアップロード、インジェスト起動を扱う。

## 責務境界

- 検索結果からのいいね保存（メタデータ基本）
- ライブラリ照会（一覧・詳細）
- PDF アップロード（ファイル）
- インジェスト起動（手動/自動）
- いいね保存時のキーワード推薦連携（D-06）

## 機能一覧

| 機能ID | 機能名         | 説明 |
| ------ | -------------- | ---- |
| F-0301 | Likeトグル保存 | Like状態の ON/OFF をトグルし、未登録論文は自動作成 |
| F-0302 | PDFアップロード | PDF を受け取り、アップロード後にインジェスト開始 |
| F-0303 | ライブラリ照会 | 保存論文の一覧・詳細を取得 |
| F-0304 | インジェスト起動 | 手動起動、および PDF URL がある場合の自動起動 |
| F-0305 | キーワード推薦連携 | 新規 Like 時にキーワード推薦を実行（D-06） |

## 主要エンティティ

### Paper

```
papers/{paperId}
{
  "id": "string",
  "title": "string",
  "authors": ["string"],
  "year": "number",
  "venue": "string",
  "doi": "string | null",
  "arxivId": "string | null",
  "abstract": "string",
  "pdfUrl": "string | null",
  "keywords": ["string"],
  "prerequisiteKeywords": ["string"],
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
  "createdAt": "timestamp"
}
```

## API仕様

| メソッド | パス                             | 説明 |
| -------- | -------------------------------- | ---- |
| `GET`    | `/api/v1/library`               | ライブラリ一覧 |
| `GET`    | `/api/v1/library/{paper_id}`    | 論文詳細 |
| `POST`   | `/api/v1/library/{paper_id}/like` | Likeトグル（保存/解除） |
| `POST`   | `/api/v1/library/{paper_id}/ingest` | 手動インジェスト起動 |
| `POST`   | `/api/v1/library/{paper_id}/upload` | PDFアップロード + インジェスト起動 |

## スキーマ（Pydantic）

```python
class PaperCreate(BaseModel):
    external_id: str
    source: str = "semantic_scholar"
    title: str
    authors: list[str] = []
    year: int | None = None
    venue: str = ""
    abstract: str = ""
    doi: str | None = None
    arxiv_id: str | None = None
    pdf_url: str | None = None
    url: str | None = None
    keywords: list[str] = []
    prerequisite_keywords: list[str] = []

class PaperResponse(BaseModel):
    id: str
    owner_uid: str | None = None
    title: str
    authors: list[str]
    year: int | None
    venue: str
    abstract: str
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    url: str | None = None
    status: str = "PENDING"
    is_liked: bool = False
    keywords: list[str] = []
    prerequisite_keywords: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

class PaperListResponse(BaseModel):
    papers: list[PaperResponse]
    total: int
```

## 非同期連携

- Like時: `pdf_url` が PDF と判定できる場合、自動でインジェストJobを実行
- Upload時: Storageへアップロード後、手動インジェスト起動と同等の処理を実行

## フロントエンド

### ページ

- `/library` — いいね保存論文リスト/フィルター
- `/papers/[id]` — 論文詳細（メタ + キーワード + メモ + 関連論文）

### コンポーネント

- `/library` ページ内で Like解除、ソート/フィルター、RAG質問を実装
- `PdfUploadButton` — PDFアップロードとインジェスト起動のトリガー
- `/papers/[id]` では `/api/v1/library/{paper_id}` を使って詳細取得

## 実装ステータス

- 実装済み: Likeトグル（未登録時の論文自動作成含む）
- 実装済み: ライブラリ一覧・詳細取得
- 実装済み: PDFアップロード + インジェスト起動
- 実装済み: 新規Like時のキーワード推薦連携
- 未実装: `POST/PATCH/DELETE /api/v1/papers...` 系の汎用CRUD API
- 未実装: いいね保存時のメモ自動生成

## 備考

- D-03 のバックエンドルーターは `/api/v1/library` 配下で公開される
