# D-04: 論文検索（Paper Search）

## ドメイン概要

外部論文データベース（arXiv、Semantic Scholar等）への検索プロキシを担当。結果を内部スキーマに正規化して返却する。

## 責務境界

- 外部ソースへのキーワード検索（arXiv / Crossref / Semantic Scholar から1〜2つ選択）
- 検索結果の正規化（内部Paperスキーマへのマッピング）
- キャッシュ管理（同一クエリの短期TTLキャッシュ）

## 機能一覧

| 機能ID | 機能名             | 説明                                     |
| ------ | ------------------ | ---------------------------------------- |
| F-0401 | キーワード検索     | 外部APIへの検索クエリ送信                |
| F-0402 | フィルター         | 年度/ジャーナル/著者によるフィルタリング |
| F-0403 | 検索結果からの保存 | My Paper Libraryへのインポート           |

## API仕様

### `GET /api/v1/search/papers`

- **認証**: 必須
- **パラメータ**:
  - `q` (string, 必須): 検索キーワード
  - `year_from` (int, 任意): 開始年
  - `year_to` (int, 任意): 終了年
  - `author` (string, 任意): 著者名
  - `source` (string, 任意): "arxiv" | "semantic_scholar"（デフォルト: "semantic_scholar"）
  - `limit` (int, 任意): 結果件数（デフォルト: 20、最大: 100）
  - `offset` (int, 任意): オフセット
- **レスポンス**: `SearchResultListResponse`

## スキーマ（Pydantic）

```python
class SearchQuery(BaseModel):
    q: str
    year_from: int | None = None
    year_to: int | None = None
    author: str | None = None
    source: str = "semantic_scholar"
    limit: int = 20
    offset: int = 0

class SearchResultItem(BaseModel):
    external_id: str           # 外部ソースのID
    source: str                # "arxiv" | "semantic_scholar"
    title: str
    authors: list[str]
    year: int | None
    venue: str
    abstract: str
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    citation_count: int | None
    is_in_library: bool = False  # ユーザーのライブラリに存在するか

class SearchResultListResponse(BaseModel):
    results: list[SearchResultItem]
    total: int
    offset: int
    limit: int
```

## フロントエンド

### ページ

- `/search` — 検索入力 + 結果リスト

### コンポーネント

- `SearchBar` — 検索入力（キーワード + フィルター展開）
- `SearchResults` — 検索結果リスト
- `SearchResultCard` — 各結果のカード（いいねボタン付き）
- `SearchFilters` — 詳細フィルター（年度/著者/ソース）

## 検索履歴サジェスト機能（F-0401拡張）

**概要:**

- ユーザーの検索履歴を `localStorage` に保存（キー: `paper-search-history`）
- 最大10件の検索履歴を保持（FIFO削除）
- 検索フォーカス時にフィルター済みのサジェスト候補を表示（ドロップダウン）

**フロントエンド実装:**

- `/search` ページ内で検索入力フォーカス時にサジェスト表示
- 候補をクリックすると該当クエリで検索実行
- クリックアウト時にドロップダウン自動非表示

**データ保存フォーマット:**

```json
[
  { "query": "transformer", "timestamp": 1707873600000 },
  { "query": "reinforcement learning", "timestamp": 1707873500000 }
]
```

## 実装ノート

- **キャッシュ**: 同一クエリは短期TTLキャッシュ（メモリ/Redis代替は後順位）
- **速度**: 検索UXのためAPI応答は300〜800ms目標
- **外部API**: 1次は Semantic Scholar API を使用（レート制限に注意）
- **検索履歴**: ローカル保存（ログイン不要、ブラウザのストレージ依存）

## TODO一覧

```python
# TODO(F-0401): キーワード検索 | AC: 外部API呼び出し+結果正規化 | owner:@
# TODO(F-0402): フィルター | AC: 年度/著者/ソースによるフィルタリング | owner:@
# TODO(F-0403): 検索結果保存 | AC: 検索結果からPaperライブラリへのインポート | owner:@
```
