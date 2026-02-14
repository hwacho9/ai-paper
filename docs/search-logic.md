# 論文検索ロジック仕様書（現在実装）

## 1) 概要

- 検索は **フロントエンドの検索UI** → **APIルーター** → **SearchService** の順で処理されます。
- 利用可能ソース: `arxiv`, `pubmed`, `scholar`, `gemini`
- 検索モード:
    - `auto`（デフォルト）: クエリの分野を推定して優先ソースを自動選択
    - `all`: 3ソースを並列取得して統合
    - `arxiv` / `pubmed` / `scholar` / `gemini`: 単一ソース検索

---

## 2) リクエストの流れ（Request Flow）

1. ユーザーが検索語を入力して実行
2. フロント(`/apps/web/src/app/search/page.tsx`)で `handleSearch` が起動
3. APIクライアント(`/apps/web/src/lib/api/search.ts`)で `source`, `q`, `limit` をクエリにして送信
4. ルーター(`/apps/api/app/modules/search/router.py`)が `search_service.search_papers(...)` を呼び出し
5. `SearchService` がソース別に取得
6. 結果を統合 → 重複除去 → スコアリング → レスポンス変換
7. 画面に結果を表示

---

## 3) フロントエンドの動作

### 3.1 検索実行

- ファイル: `apps/web/src/app/search/page.tsx`
- `handleSearch` が `searchPapers({ q: trimmedQuery, source: searchSource, limit: 20 })` を実行

### 3.2 ソース切替

- 選択肢: `auto`, `all`, `arxiv`, `pubmed`, `scholar`
- 選択値は `localStorage` の `paper-search-source` に保存し、次回起動時に復元

---

## 4) APIパラメータ

- ファイル: `apps/web/src/lib/api/search.ts`
- `SearchQuery`:
    - `q: string`
    - `source?: "auto" | "all" | "arxiv" | "pubmed" | "scholar" | "gemini"`
    - `limit?: number`
    - `offset?: number`
    - `year_from`, `year_to`

---

## 5) ルーター

- ファイル: `apps/api/app/modules/search/router.py`
- エンドポイント: `GET /api/v1/search/papers`
- デフォルト `source`: `"auto"`
- 認証ユーザーの UID を `search_service.search_papers(..., uid=current_user["uid"])` に渡し、ライブラリ情報（いいね）反映を可能に

---

## 6) SearchService の分岐ロジック

- ファイル: `apps/api/app/modules/search/service.py`
- 関数: `search_papers(query, limit, offset, source, uid)`

### `source = "all"`

1. `arxiv`, `pubmed`, `scholar` を同時並行で取得
2. 各ソースの失敗は warning ログ後に無視
3. 成功結果のみを結合

### `source = "auto"`

1. `_infer_sources_by_domain(query)` で優先順を決定
2. 優先順ソースを順に順次取得
3. `limit` に達したら早期終了
4. 不足なら残りソースで補完取得

### `source = "arxiv" / "pubmed" / "scholar"`

- 該当ソースを `_safe_search(...)` で単独取得

### `source = "gemini"`

- Gemini結果を内部スキーマに変換

---

## 7) `_safe_search`（共通呼び出しラッパ）

- ファイル: `apps/api/app/modules/search/service.py`
- 役割:
    - ソース別呼び出しを try/except で保護
    - エラー時は `[]` を返す
    - 一部ソース障害で全体が落ちることを防止

---

## 8) ArXiv検索エンジンの詳細（重要）

- ファイル: `apps/api/app/core/search/arxiv.py`
- 関数: `ArxivClient.search(query, limit)`

### 以前の課題

- 以前は `all:{query}` のみで検索していたため、タイトル完全一致クエリで上位に乗らない場合があった

### 現在のロジック

1. `cleaned_query` を生成
2. 候補クエリを作成
    - `ti:"{query}"`（タイトル優先）
    - `all:{query}`
3. 候補を順に取得
4. ArXiv ID で重複排除
5. 結果数が `limit` なら即停止
6. 全候補失敗時は `all:{query}` を再試行
7. キャッシュ（`query:limit`）を 1 時間有効で利用

---

## 9) 重複除去とランキング

- ファイル: `apps/api/app/modules/search/service.py`
- 関数: `_dedupe_and_rank_results(results, query)`

### 重複キー優先順位

1. `ArXiv` ID
2. `DOI`
3. `PubMed` ID
4. なければ `title + year`

### ランキングキー

- 第1: タイトル一致スコア `_title_match_score`
- 第2: 年（year）
- 第3: タイトル文字列

`_title_match_score`:

- 正規化テキスト比較（小文字化・記号除去）
- 完全一致: 非常に高得点
- 部分一致: 高得点
- トークン共通率ベースでスコア加算

---

## 10) レスポンス変換

- ファイル: `apps/api/app/modules/search/service.py`
- 関数: `_convert_to_item`
- IDの優先順:
    1. `ArXiv`
    2. `doi:...`
    3. `pubmed:...`
    4. 無い場合 UUID
- `is_in_library` は UID がある場合は保存済み情報で反映

---

## 11) `auto` モードの分野推定ルール

- ファイル: `apps/api/app/modules/search/service.py`
- `_infer_sources_by_domain(query)` がトークン/フレーズによりスコアリング
- プロファイル:
    - `pubmed`: 生物医学関連キーワード
    - `cs`: transformer / attention など
    - `math`: theorem / proof など
    - `physics`: quantum / relativity など
- スコア結果:
    - `pubmed`優位 → `pubmed -> arxiv -> scholar`
    - `cs/math/physics`優位 → `arxiv -> scholar -> pubmed`
    - 0点 → `scholar -> arxiv -> pubmed`

---

## 12) エラー処理

- 全体検索ロジックは `try/except` で保護
- 重大エラー時は HTTP 500 を返却
- ライブラリ取得失敗は検索結果返却自体を停止しない
- 一部ソース失敗は warning のみで継続

---

## 13) 現在の改善効果（`attention is all you need`）

- ArXiv をタイトル優先で検索する `ti:` を追加
- タイトル一致スコアを導入してランキングを調整
- これにより、該当論文（`arXiv:1706.03762`）の上位表示可能性を高める構成になっています
