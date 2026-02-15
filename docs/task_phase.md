# プロジェクトタスク & フェーズ定義 (Project Task & Phase Definition)

## 概要

本ドキュメントは、現行実装と `docs/` のドメイン定義（D-01〜D-12）をもとにした開発フェーズ管理ドキュメント。

---

## Phase 0: 基盤構築 (Done)

- [x] ドメイン仕様書整備（D-01〜D-12）
- [x] モノレポ構成（Next.js + FastAPI + Worker）
- [x] 認証基盤（Firebase Auth + Backend Middleware）
- [x] Firestore / GCP 接続基盤
- [x] 共通UI基盤（Tailwind + shadcn/ui）

---

## Phase 1: MVP Core (Search / Library / Memo) (Done)

> ユーザーが論文を検索し、保存し、メモできる最小機能。
> 関連ドメイン: D-03, D-04, D-08

### バックエンド (FastAPI)

- [x] **D-04 Search**
  - `GET /api/v1/search/papers`
  - `POST /api/v1/search/papers/recluster`
- [x] **D-03 Library**
  - `POST /api/v1/library/{paper_id}/like`
  - `GET /api/v1/library`
  - `GET /api/v1/library/{paper_id}`
- [x] **D-08 Memo CRUD**
  - `POST /api/v1/memos`
  - `GET /api/v1/memos`
  - `GET /api/v1/memos/{memo_id}`
  - `PATCH /api/v1/memos/{memo_id}`
  - `DELETE /api/v1/memos/{memo_id}`
- [ ] **D-08 Memo Auto-create on Like**
  - `create_auto_memo(...)` 実装はあるが Like フロー未接続

### フロントエンド (Next.js)

- [x] **Search Page**: `/search`
- [x] **Library Page**: `/library`
- [x] **Memo Page**: `/memos`
- [x] **Paper Detail Memo連携**: `/papers/[id]`

---

## Phase 2: Project & Graph (Done)

> ユーザーが論文をプロジェクトとして整理し、関係を可視化する。
> 関連ドメイン: D-02, D-07

### バックエンド

- [x] **D-02 Project CRUD**
  - `POST /api/v1/projects`
  - `GET /api/v1/projects`
  - `GET /api/v1/projects/{project_id}`
  - `PATCH /api/v1/projects/{project_id}`
  - `DELETE /api/v1/projects/{project_id}`
- [x] **D-02 Project Papers**
  - `POST /api/v1/projects/{project_id}/papers`
  - `DELETE /api/v1/projects/{project_id}/papers/{paper_id}`
  - `GET /api/v1/projects/{project_id}/papers`
- [x] **D-07 Related/Graph**
  - `GET /api/v1/papers/{paper_id}/related`
  - `GET /api/v1/graph`
  - `GET /api/v1/projects/{project_id}/graph`

### フロントエンド

- [x] **Project List**: `/projects`
- [x] **Project Detail**: `/projects/[id]`
- [x] **Graph View**: `/graph`

---

## Phase 3: Ingestion Pipeline & Reading Support (Mostly Done)

> PDF解析と読解支援（RAG/ハイライト/アウトライン）。
> 関連ドメイン: D-05, D-09

### バックエンド/パイプライン

- [x] **D-05 Ingestion**
  - `POST /api/v1/library/{paper_id}/upload`
  - `POST /api/v1/library/{paper_id}/ingest`
  - Worker: Parse/Chunk/Embed/Index
- [x] **D-09 Reading APIs**
  - `GET /api/v1/papers/{paper_id}/outline`
  - `GET /api/v1/papers/{paper_id}/chunks`
  - `POST /api/v1/papers/{paper_id}/explain`
  - `POST /api/v1/papers/{paper_id}/highlights`
  - `GET /api/v1/papers/{paper_id}/highlights`
  - `POST /api/v1/library/ask`

### フロントエンド

- [x] **Ask Library (RAG)**: `/library`
- [x] **Paper PDF表示**: `/papers/[id]`
- [ ] **ハイライト編集UXの磨き込み**（保存/表示の統合体験は要改善）

---

## Phase 4: Keyword & TeX (Done for Basic Scope)

> キーワード運用とプロジェクト配下 TeX ワークスペース。
> 関連ドメイン: D-06, D-10

### バックエンド

- [x] **D-06 Keyword CRUD + Tagging + Suggest**
  - `/api/v1/keywords*`
  - `/api/v1/papers/{paper_id}/keywords*`
- [x] **D-10 TeX Workspace APIs（projects配下）**
  - `/api/v1/projects/{project_id}/tex/*`
  - compile/preview を含む
- [ ] **D-10 texdocs API公開**（`app.modules.tex` は未マウント）

### フロントエンド

- [x] **Keyword UI**: `/papers/[id]`（タグ編集・推薦連携）
- [x] **TeX Editor Basic**: `/projects/[id]`（ファイル操作・コンパイル・プレビュー）

---

## Phase 5: Agent & Keyword-driven Related (Done for Initial Scope)

> 自然言語エージェント実行とキーワード起点関連表示。
> 関連ドメイン: D-11, D-12

### バックエンド

- [x] **D-11 AI Agent**
  - `POST /api/v1/agent/chat`
  - plan生成/実行/検証/再試行候補返却
- [x] **D-12 Keyword-driven Related**
  - `GET /api/v1/papers/{paper_id}/library-related-by-keywords`

### フロントエンド

- [x] **D-12 Related Panel連携**: `/papers/[id]?tab=related`
- [ ] **D-11 チャットUIの最終統合/運用導線の明確化**（APIは実装済み）

---

## 現在の主フォーカス（運用上）

- [ ] UX改善（ローディング/エラー文言/レスポンシブ）
- [ ] D-08 メモ自動生成フックの接続
- [ ] D-10 `texdocs` 系の扱い方針確定（廃止 or 実装）
- [ ] D-09 ハイライト体験の完成度向上
