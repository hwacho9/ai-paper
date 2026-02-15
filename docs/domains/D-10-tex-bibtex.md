# D-10: TeX & BibTeX

## ドメイン概要

プロジェクト配下の TeX ワークスペース管理、BibTeX自動同期、LaTeXコンパイルとPDFプレビュー提供を担当するドメイン。

## 責務境界

- プロジェクトごとの TeX ファイル管理（一覧/読取/保存/削除/アップロード）
- 参照論文から `references.bib` を自動生成
- `main.tex` の bibliography 設定を補完
- `pdflatex` + `biber` によるPDF生成とプレビュー配信

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-1001 | TeXワークスペース管理 | ファイルCRUD/アップロード |
| F-1002 | Bib同期 | プロジェクト参照論文から `references.bib` を再生成 |
| F-1003 | TeXコンパイル | `pdflatex`/`biber` でPDFを生成 |
| F-1004 | プレビュー配信 | 署名URLまたはPDFバイナリで返却 |

## ストレージ構成（実装）

保存先: `projects/{owner_uid}/{project_id}/tex/`

主なファイル:
- `main.tex`
- `references.bib`
- 任意アップロードファイル（画像等）
- コンパイル成果物: `.build/{main_stem}.pdf`

補足:
- プロジェクト作成時に `main.tex` / `references.bib` の初期ファイルを自動作成
- `.build/` は一覧APIでは除外される

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/projects/{project_id}/tex/files` | ファイル一覧 |
| `GET` | `/api/v1/projects/{project_id}/tex/file?path=...` | テキストファイル取得 |
| `GET` | `/api/v1/projects/{project_id}/tex/file/raw?path=...` | バイナリ取得 |
| `POST` | `/api/v1/projects/{project_id}/tex/file` | テキスト保存 |
| `DELETE` | `/api/v1/projects/{project_id}/tex/file?path=...` | ファイル削除 |
| `POST` | `/api/v1/projects/{project_id}/tex/upload` | ファイルアップロード |
| `POST` | `/api/v1/projects/{project_id}/tex/compile` | コンパイル実行 |
| `GET` | `/api/v1/projects/{project_id}/tex/preview` | プレビューURL取得 |
| `GET` | `/api/v1/projects/{project_id}/tex/preview/pdf` | PDF本体取得 |

### 主要レスポンス

`TexCompileResponse`

```json
{
  "pdf_path": "projects/{owner_uid}/{project_id}/tex/.build/main.pdf",
  "pdf_url": "https://...",
  "log": "string | null"
}
```

## 実装挙動

### F-1001 ファイル管理

- `path` に `..` を含む場合は 400
- テキスト取得は UTF-8 デコード不可なら 400
- プロジェクト所有者検証に失敗した場合は 404

### F-1002 Bib同期

- トリガー:
  - プロジェクト作成（seed papersあり）
  - プロジェクトへの論文追加/削除
  - コンパイル前
- 参照論文からBibエントリを生成して `references.bib` を上書き
- `main.tex` に `biblatex` / `\addbibresource{references.bib}` がなければ補完

### F-1003 コンパイル

- 実行手順:
  1. Storage からローカル作業ディレクトリへ同期
  2. `pdflatex` 1回
  3. `.bcf` があれば `biber`
  4. `pdflatex` を追加2回
  5. 生成PDFを `.build/` へアップロード
- Unicodeタイトルで `pdflatex` 失敗時は `\title{}` をASCII安全化して再試行
- 失敗時は `HTTP 400` でログ末尾を返却
- `pdflatex` 未インストール時は `HTTP 501`

### F-1004 プレビュー

- `/preview`: PDFがあれば署名URL、なければ `pdf_url=null`
- `/preview/pdf`: PDFが無ければ404

## 現状の注意点

- `app.modules.tex` の `texdocs` APIは雛形のみで、`main.py` で未マウント
- 現行の実運用APIはすべて `projects/{project_id}/tex/*`
- Bibエントリ生成は現状 `@article` 固定

## 実装ステータス

- 実装済み: TeXワークスペース初期化
- 実装済み: ファイル一覧/読取/保存/削除/アップロード
- 実装済み: `references.bib` 自動同期
- 実装済み: TeXコンパイルとPDFプレビュー
- 未実装: `texdocs` 系エンドポイントの本実装・公開
