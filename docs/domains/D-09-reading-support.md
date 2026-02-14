# D-09: 読解サポート（Reading Support）

## ドメイン概要

PDFビューア、セクション/セグメントナビゲーション、文章/構文ベースのハイライト機能を担当。LLM出力は根拠リンク必須。

## 責務境界

- PDF レンダリング（Web）
- セクション/セグメント（例: 100単位分割）ナビゲーション
- 文章解釈/ハイライト（選択テキストベース）
- 根拠（原文位置、chunk ID）の添付

## 機能一覧

| 機能ID | 機能名                   | 説明                                |
| ------ | ------------------------ | ----------------------------------- |
| F-0901 | PDFレンダリング          | WebでのPDF表示                      |
| F-0902 | セクションナビゲーション | セクション/セグメント間の移動       |
| F-0903 | 文章解釈/ハイライト      | 選択テキストの解釈+ハイライト保存   |
| F-0904 | 根拠添付                 | 原文位置（chunkId/pageRange）の返却 |
| F-0905 | ライブラリRAG質問        | ライブラリ論文を横断して根拠付き回答 |

## 主要エンティティ

### Highlight

```
papers/{paperId}/highlights/{highlightId}
{
  "id": "string",
  "ownerUid": "string",
  "paperId": "string",
  "chunkId": "string | null",
  "textSpan": "string",
  "startOffset": "number",
  "endOffset": "number",
  "pageNumber": "number",
  "note": "string",
  "color": "yellow" | "green" | "blue" | "red",
  "createdAt": "timestamp"
}
```

## API仕様

| メソッド | パス                            | 説明                                 |
| -------- | ------------------------------- | ------------------------------------ |
| `GET`    | `/api/v1/papers/:id/outline`    | PDFの目次/セクション構造             |
| `GET`    | `/api/v1/papers/:id/chunks`     | チャンク一覧（セクションフィルター） |
| `POST`   | `/api/v1/papers/:id/explain`    | 選択テキストの解釈（LLM）            |
| `POST`   | `/api/v1/papers/:id/highlights` | ハイライト保存                       |
| `GET`    | `/api/v1/papers/:id/highlights` | ハイライト一覧                       |
| `POST`   | `/api/v1/library/ask`           | ライブラリRAG質問                    |

### ライブラリRAG (`POST /api/v1/library/ask`)

- `question`: 質問文
- `paper_ids`: 回答対象を絞る論文ID（省略可、未指定時はライブラリ全件）
- `top_k`: 参照候補チャンク数（既定5, 最大20）

## スキーマ（Pydantic）

```python
class ExplainRequest(BaseModel):
    selected_text: str | None = None
    chunk_id: str | None = None

class ExplainResponse(BaseModel):
    explanation: str
    source_chunk_id: str
    page_range: list[int]
    confidence: float

class HighlightCreate(BaseModel):
    chunk_id: str | None = None
    text_span: str
    start_offset: int
    end_offset: int
    page_number: int
    note: str = ""
    color: str = "yellow"

class LibraryAskRequest(BaseModel):
    question: str
    paper_ids: list[str] = []
    top_k: int = 5

class LibraryAskResponse(BaseModel):
    answer: str
    confidence: float
    citations: list[dict]
```

## 安全装置

- LLMレスポンスは必ず `sourceChunkId` または `pageRange` 等の **根拠を含む** こと
- 根拠が提供できない場合は明示的に `confidence: low` を返却

## フロントエンド

### コンポーネント（後順位）

- `PdfViewer` — PDFレンダリング
- `SectionNavigator` — セクション間ナビゲーション
- `HighlightOverlay` — ハイライト表示
- `ExplainPopover` — 選択テキスト解釈ポップオーバー
- `Library Q&A` — `apps/web/src/app/library/page.tsx` の実装（`/api/v1/library/ask`）

## TODO一覧

```python
# TODO(F-0901): PDFレンダリング | AC: ページ移動、ロード状態表示 | owner:@
# TODO(F-0902): セクションナビ | AC: セクション一覧+クリック移動 | owner:@
# TODO(F-0903): 文章解釈/ハイライト | AC: 選択テキスト→LLM解釈+ハイライト保存 | owner:@
# TODO(F-0904): 根拠添付 | AC: sourceChunkId/pageRange付きレスポンス | owner:@
# TODO(F-0905): ライブラリRAG質問 | AC: 根拠付き回答+信頼度付与 | owner:@
```
