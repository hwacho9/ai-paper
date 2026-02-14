# 論文IDEで現在できること（AIエージェント実装用）

## 目的

このドキュメントは、右下チャット型AIエージェントが「このIDE内で自動実行できる操作」を定義するための現状機能一覧です。  
対象は **現在の実装コードに存在する機能** です。

## 前提

- APIベース: `GET/POST/PATCH/DELETE /api/v1/...`
- 認証: 基本的に全APIでFirebase認証が必要
- 主な操作対象:
  - 論文検索・保存（ライブラリ）
  - プロジェクト管理
  - LaTeX/BibTeX編集
  - メモ・キーワード管理
  - 読解支援（チャンク/ハイライト/RAG）
  - 関連論文/グラフ

## 画面上の機能（ユーザー操作）

### 1. 検索 (`/search`)

- 論文検索（`auto/all/arxiv/pubmed/scholar/gemini`）
- LLM再整理検索（Hub/Children/Relatedクラスタ表示）
- 検索履歴サジェスト（localStorage）
- 検索結果からライブラリ保存（Likeトグル）

### 2. ライブラリ (`/library`)

- 保存済み論文一覧表示
- 論文詳細への遷移
- PDFアップロードとインジェスト実行
- ライブラリ横断Q&A（RAG）

### 3. 論文詳細 (`/papers/[id]`)

- 論文概要表示
- PDF表示（URLがある場合）
- 論文メモの作成/更新/削除
- キーワード作成・タグ付け・解除
- 関連論文表示

### 4. メモ (`/memos`)

- メモ一覧表示・検索
- 論文を起点にしたメモ作成
- メモ編集/削除
- メモから関連論文/プロジェクトへ遷移

### 5. プロジェクト一覧 (`/projects`)

- プロジェクト作成
- プロジェクト一覧表示
- プロジェクト削除

### 6. プロジェクト詳細 (`/projects/[id]`)

- 参照論文追加/削除
- プロジェクトメモ作成/編集/削除
- LaTeXファイル一覧・選択・保存・削除
- TeXファイルアップロード
- LaTeXコンパイル（PDF生成）
- PDFプレビュー取得
- 引用挿入支援（`\cite{}`）
- BibTeXテキスト表示/コピー
- 文中検索（LaTeX本文内）

### 7. グラフ (`/graph`)

- グローバルグラフ表示
- プロジェクト単位グラフ表示（`/projects/{id}/graph`）

## APIアクション一覧（エージェント実行単位）

### 認証・ユーザー

| 操作 | メソッド/パス |
| --- | --- |
| 自分のプロフィール取得 | `GET /api/v1/me` |
| 自分のプロフィール更新 | `PATCH /api/v1/me` |

### 検索

| 操作 | メソッド/パス |
| --- | --- |
| 論文検索 | `GET /api/v1/search/papers` |
| LLM再整理検索 | `POST /api/v1/search/papers/recluster` |

### ライブラリ（論文）

| 操作 | メソッド/パス |
| --- | --- |
| ライブラリ一覧取得 | `GET /api/v1/library` |
| 論文Likeトグル（保存/解除） | `POST /api/v1/library/{paper_id}/like` |
| 論文詳細取得 | `GET /api/v1/library/{paper_id}` |
| PDFアップロード+インジェスト開始 | `POST /api/v1/library/{paper_id}/upload` |
| 手動インジェスト開始 | `POST /api/v1/library/{paper_id}/ingest` |

### プロジェクト

| 操作 | メソッド/パス |
| --- | --- |
| プロジェクト作成 | `POST /api/v1/projects` |
| プロジェクト一覧 | `GET /api/v1/projects` |
| プロジェクト詳細 | `GET /api/v1/projects/{project_id}` |
| プロジェクト更新 | `PATCH /api/v1/projects/{project_id}` |
| プロジェクト削除 | `DELETE /api/v1/projects/{project_id}` |
| 参照論文追加 | `POST /api/v1/projects/{project_id}/papers` |
| 参照論文削除 | `DELETE /api/v1/projects/{project_id}/papers/{paper_id}` |
| 参照論文一覧 | `GET /api/v1/projects/{project_id}/papers` |

### TeX/LaTeX（プロジェクト配下）

| 操作 | メソッド/パス |
| --- | --- |
| TeXファイル一覧 | `GET /api/v1/projects/{project_id}/tex/files` |
| TeXファイル内容取得 | `GET /api/v1/projects/{project_id}/tex/file?path=...` |
| TeXファイル保存 | `POST /api/v1/projects/{project_id}/tex/file` |
| TeXファイル削除 | `DELETE /api/v1/projects/{project_id}/tex/file?path=...` |
| TeXファイルアップロード | `POST /api/v1/projects/{project_id}/tex/upload` |
| TeXコンパイル | `POST /api/v1/projects/{project_id}/tex/compile` |
| プレビューURL取得 | `GET /api/v1/projects/{project_id}/tex/preview` |
| プレビューPDF本体取得 | `GET /api/v1/projects/{project_id}/tex/preview/pdf` |

### メモ

| 操作 | メソッド/パス |
| --- | --- |
| メモ一覧 | `GET /api/v1/memos` |
| メモ作成 | `POST /api/v1/memos` |
| メモ詳細 | `GET /api/v1/memos/{memo_id}` |
| メモ更新 | `PATCH /api/v1/memos/{memo_id}` |
| メモ削除 | `DELETE /api/v1/memos/{memo_id}` |

### キーワード

| 操作 | メソッド/パス |
| --- | --- |
| キーワード作成 | `POST /api/v1/keywords` |
| キーワード一覧 | `GET /api/v1/keywords` |
| キーワード更新 | `PATCH /api/v1/keywords/{keyword_id}` |
| キーワード削除 | `DELETE /api/v1/keywords/{keyword_id}` |
| 論文へのタグ付け | `POST /api/v1/papers/{paper_id}/keywords` |
| 論文キーワード一覧 | `GET /api/v1/papers/{paper_id}/keywords` |
| 論文キーワード解除 | `DELETE /api/v1/papers/{paper_id}/keywords/{keyword_id}` |
| 自動キーワード推薦 | `POST /api/v1/papers/{paper_id}/keywords/suggest` |

### 読解支援

| 操作 | メソッド/パス |
| --- | --- |
| 目次/アウトライン取得 | `GET /api/v1/papers/{paper_id}/outline` |
| チャンク取得 | `GET /api/v1/papers/{paper_id}/chunks` |
| 選択テキスト解釈 | `POST /api/v1/papers/{paper_id}/explain` |
| ハイライト作成 | `POST /api/v1/papers/{paper_id}/highlights` |
| ハイライト一覧 | `GET /api/v1/papers/{paper_id}/highlights` |
| ライブラリ横断Q&A | `POST /api/v1/library/ask` |

### 関連・グラフ

| 操作 | メソッド/パス |
| --- | --- |
| 関連論文取得 | `GET /api/v1/papers/{paper_id}/related` |
| グローバルグラフ取得 | `GET /api/v1/graph` |
| プロジェクトグラフ取得 | `GET /api/v1/projects/{project_id}/graph` |

## 注意点（エージェント設計時）

- 1アクションで完結しない操作がある（例: 検索結果を保存してからプロジェクト追加）。
- TeX機能は「プロジェクト配下API」に統合されている。
- `texdocs` 系APIモジュールは存在するが、`main.py` でルーター未マウントのため現状は利用対象外。
