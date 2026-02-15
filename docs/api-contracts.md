# API仕様書（Contract）

## 概要

本ドキュメントはバックエンドAPIの全エンドポイントを一覧化する。詳細は各ドメインドキュメントを参照。

## 共通仕様

### ベースURL

```
/api/v1
```

### 認証

- Firebase Auth JWT トークンを `Authorization: Bearer <token>` ヘッダーで送信
- `/healthz` のみ認証不要

### エラーレスポンス

```json
{
  "detail": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

---

## エンドポイント一覧

### ヘルスチェック

| メソッド | パス | 認証 | ドメイン |
| -------- | ---- | ---- | -------- |
| `GET` | `/healthz` | — | — |

### D-01: 認証/ユーザー

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/me` | ユーザー情報取得 |
| `PATCH` | `/api/v1/me` | ユーザー情報更新 |

### D-02: プロジェクト

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/projects` | 作成（`seed_paper_ids`対応） |
| `GET` | `/api/v1/projects` | 一覧 |
| `GET` | `/api/v1/projects/{project_id}` | 詳細 |
| `PATCH` | `/api/v1/projects/{project_id}` | 更新 |
| `DELETE` | `/api/v1/projects/{project_id}` | 削除 |
| `POST` | `/api/v1/projects/{project_id}/papers` | 参照論文追加 |
| `DELETE` | `/api/v1/projects/{project_id}/papers/{paper_id}` | 参照論文削除 |
| `GET` | `/api/v1/projects/{project_id}/papers` | 参照論文一覧 |

### D-03: ペーパーライブラリ

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/library` | 一覧 |
| `GET` | `/api/v1/library/{paper_id}` | 詳細 |
| `POST` | `/api/v1/library/{paper_id}/like` | いいねトグル（保存/解除） |

### D-04: 検索

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/search/papers` | 論文検索 |
| `POST` | `/api/v1/search/papers/recluster` | 検索結果クラスタ再整理 |

### D-04: `/api/v1/search/papers/recluster` 仕様

- リクエスト

```json
{
  "query": "graph neural networks for molecule property prediction",
  "source": "auto",
  "top_k": 60,
  "group_target": 4,
  "include_related": true
}
```

- レスポンス

```json
{
  "query": "graph neural networks for molecule property prediction",
  "clusters": [
    {
      "cluster_id": "c1",
      "label": "Message Passing 系",
      "summary": "分子グラフ上で局所伝播を繰り返す主流系統",
      "hub_paper": {
        "paper_id": "paper-001",
        "title": "Neural Message Passing for Quantum Chemistry",
        "year": 2017,
        "source": "scholar",
        "score": 0.93,
        "relation_type": null
      },
      "children": [],
      "related": []
    }
  ],
  "uncertain_items": [],
  "meta": {
    "fetched": 60,
    "latency_ms": 1420,
    "model": "gemini-2.5-flash",
    "fallback_used": false
  }
}
```

- 補足
  - `source` は当面 `auto` / `all` / `arxiv` / `pubmed` / `scholar` / `gemini` を許容。
  - LLM再整理に失敗した場合は `fallback-1` クラスタを返し、`meta.fallback_used=true` を返す。
  - 既存 `GET /api/v1/search/papers` は互換維持し、フロント側フォールバックに利用する。

### D-05: 取り込みパイプライン

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/library/{paper_id}/ingest` | 手動インジェスト起動 |
| `POST` | `/api/v1/library/{paper_id}/upload` | PDFアップロード + インジェスト起動 |

### D-06: キーワード

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/keywords` | 作成 |
| `GET` | `/api/v1/keywords` | 一覧 |
| `PATCH` | `/api/v1/keywords/{keyword_id}` | 更新 |
| `DELETE` | `/api/v1/keywords/{keyword_id}` | 削除 |
| `GET` | `/api/v1/papers/{paper_id}/keywords` | タグ一覧 |
| `POST` | `/api/v1/papers/{paper_id}/keywords` | タグ付け |
| `DELETE` | `/api/v1/papers/{paper_id}/keywords/{keyword_id}` | タグ解除 |
| `POST` | `/api/v1/papers/{paper_id}/keywords/suggest` | 自動推薦 |

### D-07: 関連グラフ

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/related` | 関連論文取得 |
| `GET` | `/api/v1/projects/{project_id}/graph` | プロジェクトグラフ取得 |
| `GET` | `/api/v1/graph` | グローバルグラフ取得 |

- 補足
  - `GET /api/v1/graph` は `connection_mode` クエリを受け付ける（`embedding` / `keyword` / `hybrid`）。
  - `connection_mode` 未指定または不正値は `keyword` として扱う。
  - レスポンス形は `GraphData`（`nodes[]`, `edges[]`）で共通。

### D-08: メモ

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/memos` | 作成 |
| `GET` | `/api/v1/memos` | 一覧 |
| `GET` | `/api/v1/memos/{memo_id}` | 詳細 |
| `PATCH` | `/api/v1/memos/{memo_id}` | 更新 |
| `DELETE` | `/api/v1/memos/{memo_id}` | 削除 |

- 補足
  - `GET /api/v1/memos` のサーバー側フィルタ（tag/ref/paper_id 等）は現状未実装。

### D-09: 読解サポート

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/outline` | 目次 |
| `GET` | `/api/v1/papers/{paper_id}/chunks` | チャンク一覧 |
| `POST` | `/api/v1/papers/{paper_id}/explain` | テキスト解釈 |
| `POST` | `/api/v1/papers/{paper_id}/highlights` | ハイライト保存 |
| `GET` | `/api/v1/papers/{paper_id}/highlights` | ハイライト一覧 |
| `POST` | `/api/v1/library/ask` | ライブラリRAG検索 |

### D-09: `/api/v1/library/ask` 仕様

- リクエスト

```json
{
  "question": "Transformer の主張を要約してください",
  "paper_ids": ["paper-id-1", "paper-id-2"],
  "top_k": 5
}
```

- レスポンス

```json
{
  "answer": "関連する根拠に基づいて要約した回答",
  "confidence": 0.82,
  "citations": [
    {
      "paper_id": "paper-id-1",
      "chunk_id": "chunk-id-1",
      "score": 0.91,
      "page_range": [2],
      "snippet": "..."
    }
  ]
}
```

- 補足
  - `paper_ids` を空配列または省略すると「ライブラリ内全論文」を対象にします。
  - 指定した `paper_id` はユーザーのライブラリ所属を検証します。
  - Vector Searchが利用不可の環境では、トークン一致ベースの簡易検索にフォールバックします。

### D-10: TeX/BibTeX

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/projects/{project_id}/tex/files` | TeXファイル一覧 |
| `GET` | `/api/v1/projects/{project_id}/tex/file` | TeXテキストファイル内容取得 |
| `GET` | `/api/v1/projects/{project_id}/tex/file/raw` | TeXワークスペース内ファイルのバイナリ取得 |
| `POST` | `/api/v1/projects/{project_id}/tex/file` | TeXテキストファイル保存 |
| `DELETE` | `/api/v1/projects/{project_id}/tex/file` | TeXワークスペース内ファイル削除 |
| `POST` | `/api/v1/projects/{project_id}/tex/upload` | TeXファイルアップロード |
| `POST` | `/api/v1/projects/{project_id}/tex/compile` | TeXコンパイル |
| `GET` | `/api/v1/projects/{project_id}/tex/preview` | プレビューURL取得 |
| `GET` | `/api/v1/projects/{project_id}/tex/preview/pdf` | プレビューPDF本体取得 |

- 補足
  - `app.modules.tex` の `texdocs` API は雛形のまま未マウント（現行では利用不可）。

### D-11: AIエージェント

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/agent/chat` | 自然言語リクエストの計画生成/実行 |

- 補足
  - `execute=false` の場合は計画のみ返却し、アクション実行は行わない。
  - 実行時は `steps`（完了/失敗/スキップ）と `verification` を返す。
  - 必要に応じて `pending_actions` / `pending_plan` を返し、再試行を補助する。

### D-12: キーワード起点ライブラリ関連

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/library-related-by-keywords` | キーワード別ライブラリ関連取得 |

- 補足
  - クエリ: `per_keyword_limit`（1..20, default=15）, `max_keywords`（1..20, default=8）
  - 結果はユーザーのライブラリ（likes）内候補に限定。
