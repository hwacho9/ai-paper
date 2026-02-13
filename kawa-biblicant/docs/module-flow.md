# 機能説明と処理フロー（詳細版）

## 1. 研究UI（検索/メモ）

### 1.1 役割（何ができるか）
- 研究メモを入力して「重要論文（派生関係を含む）」を表示する。
- メモ済み論文の一覧をグリッドで閲覧できる。
- 論文カードをクリックすると詳細ポップアップが開き、概要/キーワード/事前知識/関連メモを確認できる。
- 「論文を読む」ボタンでPDFビューワへ遷移できる。

### 1.2 主要モジュール（担当一覧）
#### エントリ / アプリ全体
- `index.html` → `src/main.tsx`  
  React のエントリ。`App.tsx` をマウントする。
- `src/App.tsx`  
  タブ切替（検索 / メモ）と UI 全体の組み立てを担当。  
  `MOCK_RESULTS` / `MOCK_MEMO_RESULT` を `RankedPaper` に整形し、`Results` に渡す。

#### 検索UI
- `src/components/search/SearchForm.tsx`  
  研究メモ入力（textarea）と検索ボタン。サジェスト表示も担当。
- `src/components/search/Results.tsx`  
  検索とメモ両方のコンテナ。ヘッダ、リスト、モーダルを組み立てる。
- `src/components/search/ResultsHeader.tsx`  
  タイトルとステータスの表示。
- `src/components/search/ResultsList.tsx`  
  論文の依存関係（木構造）を反映して並び順とインデントを決定する。
- `src/components/search/ResultsItem.tsx`  
  論文カード（サムネ・タイトル・年・概要）を描画。
- `src/components/search/ResultsSkeleton.tsx`  
  ローディング時のプレースホルダ。
- `src/components/search/ResultsEmpty.tsx`  
  検索未実行時の空表示。

#### モーダル（論文詳細）
- `src/components/modal/PaperModal.tsx`  
  詳細ポップアップ本体。スクロール領域、閉じる処理、メモ切替をまとめる。
- `src/components/modal/PaperModalHeader.tsx`  
  タイトル・年・会議名と閉じるボタンを表示。
- `src/components/modal/PaperModalDetails.tsx`  
  サムネ・概要・キーワード・事前知識を表示。
- `src/components/modal/PaperMemoGrid.tsx`  
  メモ済み論文のグリッドを表示（年＋会議名）。クリックでポップアップの論文を切り替える。
- `src/components/modal/PaperModalActions.tsx`  
  「論文を読む」「メモに追加」のアクション群を表示。

#### レイアウト / その他
- `src/components/layout/Footer.tsx`  
  画面下のフッター。
- `src/components/graph/Lineage.tsx`  
  （現在未使用）派生関係の可視化用コンポーネント。

#### データ
- `src/data/mock.ts`
  - `MOCK_RESULTS`: 検索結果のモック。
  - `MOCK_MEMO_RESULT`: メモ済み論文のモック。
  - `LINEAGE_EDGES`: 依存関係（木）を表すエッジ。
  - `SUGGESTED_TOPICS`: サジェスト一覧。

### 1.3 UIの処理フロー（検索タブ）
1. `src/main.tsx` が `App.tsx` をマウント。
2. `App.tsx` でタブ状態が `search` の場合:
   - `SearchForm` が表示される。
   - `Results(mode="search")` が表示される。
3. ユーザーが研究メモを入力して「重要論文を抽出」:
   - `handleSubmit` が走り、`submittedTheme` が更新される。
   - `Results` は `results` を受け取り、`ResultsList` を描画する。
4. `ResultsList` は `LINEAGE_EDGES` を使い、派生関係の順序とインデントを決定。
5. ユーザーが論文カードをクリックすると:
   - `Results` 内の `activePaper` が更新される。
   - `PaperModal` が開く。
6. `PaperModal` 内で:
   - `PaperModalDetails` が概要/キーワード/事前知識を表示。
   - `PaperMemoGrid` が関連メモを表示（クリックで別論文に切り替え可能）。
7. 「論文を読む」ボタンを押すと:
   - `handleOpenPdf` が `viewer.html?src=...` を別タブで開く。

### 1.4 UIの処理フロー（メモタブ）
1. タブが `memo` の場合:
   - `Results(mode="memo")` が表示される。
2. `Results` は `memoPapers` を `PaperMemoGrid` として描画。
3. グリッドの論文をクリックすると:
   - `PaperModal` が開き、詳細が閲覧できる。

## 2. PDFビューワ（翻訳UI）

### 2.1 役割（何ができるか）
- PDFを開き、ページ単位で翻訳を生成する。
- 翻訳結果を元のPDF上に重ねて表示する。
- 可視ページを検知して必要なページだけ翻訳する。

### 2.2 主要モジュール（担当一覧）
#### エントリ / UI
- `viewer.html` → `src/pdfViewerMain.tsx`  
  PDF翻訳UIのエントリ。
- `src/pdf/PdfTranslatorApp.tsx`  
  PDF翻訳UIの全体制御。`PdfTranslatorSession` を生成して読み込みと翻訳を管理。

#### UIコンポーネント
- `src/pdf/components/TranslatorHeader.tsx`  
  ページ番号表示と設定メニュー。
- `src/pdf/components/TranslatorSettings.tsx`  
  API Key / Model / Endpoint の設定UI。
- `src/pdf/components/PdfColumn.tsx`  
  PDFのページ列を描画するコンテナ。
- `src/pdf/components/PdfPage.tsx`  
  Canvas描画＋翻訳オーバーレイを描画し、可視判定を通知する。

#### 翻訳セッション / ロジック
- `src/pdf/lib/PdfTranslatorSession.ts`
  - PDF読み込み、ページ可視判定、翻訳実行を統括。
  - ページが表示されたら「そのページ＋次ページ」を先読み翻訳する。
- `src/pdf/lib/translator.ts`
  - `TranslatorService`: 段落単位で翻訳を呼び出す。
- `src/pdf/lib/openai.ts`
  - `translateWithOpenAI`: Responses APIへ翻訳リクエスト。
- `src/pdf/lib/pdf.ts`
  - `loadPdfDocument`: PDF読み込み。
  - `extractParagraphs`: textContentから段落を抽出してbboxを生成。
  - `renderPageToCanvas`: ページをCanvasに描画。

### 2.3 PDF翻訳の処理フロー
1. `viewer.html` → `src/pdfViewerMain.tsx` が `PdfTranslatorApp` をマウント。
2. `PdfTranslatorApp` が `PdfTranslatorSession` を作成。
3. `PdfTranslatorSession.loadPdf` が PDF を取得し、各ページの段落を抽出。
4. `PdfPage` が表示されると `handlePageVisible` が呼ばれ、ページ内段落の翻訳を開始。
5. 翻訳中は赤枠のみ表示し、翻訳完了後に日本語訳をオーバーレイ表示。

## 3. Chrome拡張
- `public/manifest.json`: 拡張のエントリ定義。
- `public/background.js`: アイコン押下で `index.html` を開く。
