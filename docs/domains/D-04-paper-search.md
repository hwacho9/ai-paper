# D-04: 論文検索（Paper Search）

## ドメイン概要

外部論文データベース（ArXiv / PubMed / Google Scholar 等）への検索と、結果の正規化を担当するドメイン。  
検索結果にはライブラリ保存済み状態（`is_in_library`）を付与して返却する。

## 責務境界

- 外部ソースへのキーワード検索（`auto` / `all` / `arxiv` / `pubmed` / `scholar` / `gemini`）
- 検索結果の正規化（内部Paperスキーマへのマッピング）
- 重複除去とランキング（ID重複・タイトル一致ベース）
- ライブラリ保存済み判定（`is_in_library`）

## 機能一覧

| 機能ID | 機能名             | 説明 |
| ------ | ------------------ | ---- |
| F-0401 | キーワード検索     | 外部APIへの検索クエリ送信 |
| F-0402 | ソース最適化       | `auto` 時にクエリ内容から優先ソースを推定 |
| F-0403 | 重複除去/並び替え  | 外部ID・タイトルを使った重複除去と順位調整 |
| F-0404 | ライブラリ連携表示 | 検索結果へ `is_in_library` を付与 |

## API仕様

### `GET /api/v1/search/papers`

- **認証**: 必須
- **パラメータ**:
  - `q` (string, 必須): 検索キーワード
  - `source` (string, 任意): `"auto" | "all" | "arxiv" | "pubmed" | "scholar" | "gemini"`（デフォルト: `"auto"`）
  - `limit` (int, 任意): 結果件数（デフォルト: 20、最大: 100）
  - `offset` (int, 任意): オフセット
- **レスポンス**: `SearchResultListResponse`

## スキーマ（Pydantic）

```python
class SearchQuery(BaseModel):
    q: str
    year_from: int | None = None
    year_to: int | None = None
    source: str = "auto"
    limit: int = 20
    offset: int = 0

class SearchResultItem(BaseModel):
    external_id: str
    source: str
    title: str
    authors: list[str]
    year: int | None
    venue: str
    abstract: str
    doi: str | None
    arxiv_id: str | None
    pdf_url: str | None
    url: str | None = None
    citation_count: int | None
    is_in_library: bool = False

class SearchResultListResponse(BaseModel):
    results: list[SearchResultItem]
    total: int
    offset: int
    limit: int
```

## フロントエンド

### ページ

- `/search` — 検索入力 + ソース選択 + 結果表示

### 実装ポイント

- 検索履歴を `localStorage` に保存（キー: `paper-search-history`、最大10件）
- ソース選択を `localStorage` に保存（キー: `paper-search-source`）
- 検索ページ状態（結果/モード）を `sessionStorage` に保存（キー: `paper-search-page-state-v1`）
- 検索結果から Like トグル可能（D-03 連携）

## 実装ノート

- `auto` 検索ではクエリ内容から分野推定し、優先ソース順を変える
- `all` 検索では複数ソースを並列実行して統合する

## 実装ステータス

- 実装済み: キーワード検索 (`GET /api/v1/search/papers`)
- 実装済み: `auto/all/arxiv/pubmed/scholar/gemini` ソース切替
- 実装済み: 検索履歴サジェスト（localStorage）
- 実装済み: 検索結果から Like トグル（D-03）
- 未実装: `author` パラメータによるフィルタリング
- 未実装: `year_from/year_to` の実検索反映（スキーマのみ定義）
