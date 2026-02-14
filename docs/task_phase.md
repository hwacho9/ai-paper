# プロジェクトタスク & フェーズ定義 (Project Task & Phase Definition)

## 概要

本ドキュメントは `task.md` (タスク進行) と `Project Service Structure` (要件定義) を統合した、開発フェーズ管理ドキュメントである。

---

## Phase 0: 基盤構築 (Done)

- [x] ドメイン仕様書読解 (D-01～D-10)
- [x] リポジトリ/モノレポ構成 (Next.js + FastAPI)
- [x] Firestoreスキーマ設計 & GCP環境設定
- [x] 認証基盤 (Firebase Auth + Backend Middleware)
- [x] 共通コンポーネント (shadcn/ui + Tailwind)

---

## Phase 1: MVP Core (Search & Library & Memo) - CURRENT

> ユーザーが論文を検索し、ライブラリに保存し、メモを残せるようにする。
> 関連ドメイン: D-03 (Library), D-04 (Search), D-08 (Memo)

### バックエンド (FastAPI)

- [x] **D-04 Search**: 論文検索プロキシAPI
    - `GET /api/v1/search/papers` (Gemini)
- [x] **D-03 Library**: 論文保存 & 取得
    - `POST /api/v1/library/{id}/like` (Toggle Like)
    - `GET /api/v1/library` (My Library)
- [x] **D-08 Memo**: メモ自動生成 & CRUD
    - `POST /api/v1/memos` (Create) - _Auto-generated on Like_
    - `GET /api/v1/memos` (List)

### フロントエンド (Next.js)

- [x] **Search Page**: 検索 UI + 検索実行 + いいねボタン (API連携)
- [x] **Library Page**: 保存済み論文一覧 (API連携)
- [x] **Memo Page**: メモ一覧表示 (API連携)
- [x] **Refactoring**: `api.ts` のモジュール分割 (`client`, `search`, `papers`, `memos`)

---

## Phase 2: Project & Graph (Next Step)

> ユーザーが「自分の論文プロジェクト」を作成し、関連論文を体系化する。
> 関連ドメイン: D-02 (Project), D-07 (Graph)

### バックエンド

- [ ] **D-02 Project**: プロジェクト CRUD
    - `POST /projects` (Create Project)
    - `POST /projects/{id}/papers` (Add Paper to Project)
- [ ] **D-07 Graph**: 関連論文グラフデータ提供
    - `GET /papers/{id}/related` (Mock/Simple Logic)

### フロントエンド

- [ ] **Project List/Detail**: プロジェクト管理 UI
- [ ] **Graph View**: 論文関係の可視化 (Canvas/D3)

---

## Phase 3: Ingestion Pipeline & Reading Support

> PDFを解析し、RAG (Retrieval-Augmented Generation) や高度な読書支援を提供する。
> 関連ドメイン: D-05 (Ingestion), D-09 (Reading)

### バックエンド/パイプライン

- [x] **D-05 Ingestion**: PDF Upload & Parsing Pipeline
    - [x] PDF Upload API -> Firebase Storage
    - [x] Cloud Run Job Worker (Parse/Chunk/Embed/Index)
    - [x] Vector Search Indexing
- [ ] **D-09 Reading**: チャンク単位のハイライト/引用

### フロントエンド

- [ ] **PDF Viewer**: ハイライト機能付きビューア
- [ ] **Ask Paper**: 論文への質問 (RAG)

---

## Phase 4: Polish & Advanced Features

> キーワード管理、TeX Export、コラボレーション機能など。
> 関連ドメイン: D-06 (Keyword), D-10 (TeX)

- [ ] **D-06 Keyword**: 自動タグ付け & 管理
- [ ] **D-10 TeX**: BibTeX Export & TeX Editor (Basic)
- [ ] **UX Improvements**: ローディング、エラーハンドリング、レスポンシブ調整
