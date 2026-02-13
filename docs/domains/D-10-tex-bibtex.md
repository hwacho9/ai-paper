# D-10: TeX & BibTeX

## ドメイン概要

TeXエディタ、プロジェクト/論文ベースのBibTeX export、引用注釈の管理を担当。

## 責務境界

- TeX文書の作成/保存
- 論文をTeXに引用追加（プレースホルダー）
- BibTeX export（プロジェクト単位 or 論文単位）
- BibTeX項目に注釈（根拠/メモ）を含める

## 機能一覧

| 機能ID | 機能名        | 説明                                |
| ------ | ------------- | ----------------------------------- |
| F-1001 | TeX文書CRUD   | TeX文書の作成/保存/更新             |
| F-1002 | 引用追加      | 論文をTeX文書に引用（cite key生成） |
| F-1003 | BibTeX export | プロジェクト/論文のBibTeX出力       |
| F-1004 | 引用注釈      | BibTeX項目に根拠/メモを含める       |

## 主要エンティティ

### TexDoc

```
tex_docs/{texDocId}
{
  "id": "string",
  "ownerUid": "string",
  "projectId": "string",
  "title": "string",
  "body": "string",       // TeXソースコード
  "updatedAt": "timestamp",
  "createdAt": "timestamp"
}
```

### Citation

```
tex_docs/{texDocId}/citations/{citationId}
{
  "texDocId": "string",
  "paperId": "string",
  "citeKey": "string",     // 例: "kim2024deep"
  "note": "string | null", // 引用理由/根拠
  "addedAt": "timestamp"
}
```

## API仕様

| メソッド | パス                                 | 説明                               |
| -------- | ------------------------------------ | ---------------------------------- |
| `POST`   | `/api/v1/texdocs`                    | TeX文書作成                        |
| `GET`    | `/api/v1/texdocs`                    | TeX文書一覧（projectIdフィルター） |
| `GET`    | `/api/v1/texdocs/:id`                | TeX文書取得                        |
| `PATCH`  | `/api/v1/texdocs/:id`                | TeX文書更新                        |
| `POST`   | `/api/v1/texdocs/:id/citations`      | 引用追加                           |
| `GET`    | `/api/v1/projects/:id/export/bibtex` | BibTeX export                      |

## スキーマ（Pydantic）

```python
class TexDocCreate(BaseModel):
    project_id: str
    title: str
    body: str = ""

class TexDocResponse(BaseModel):
    id: str
    owner_uid: str
    project_id: str
    title: str
    body: str
    created_at: datetime
    updated_at: datetime
    citations: list[CitationResponse] = []

class CitationCreate(BaseModel):
    paper_id: str
    cite_key: str | None = None  # 自動生成可能
    note: str | None = None

class CitationResponse(BaseModel):
    id: str
    paper_id: str
    cite_key: str
    note: str | None
    added_at: datetime

class BibTexExportResponse(BaseModel):
    bibtex: str                # BibTeXテキスト全体
    entry_count: int
    entries: list[BibTexEntry]

class BibTexEntry(BaseModel):
    cite_key: str
    paper_title: str
    entry_type: str            # "article", "inproceedings" など
    bibtex_text: str
    note: str | None           # 引用注釈
```

## BibTeX生成ルール

1. **cite key**: `{第一著者姓}{年}{タイトル最初の単語}` 形式（例: `kim2024deep`）
2. **エントリタイプ**: venue情報から自動判定（conference → `@inproceedings`, journal → `@article`）
3. **注釈**: `note` フィールドが存在すれば `annote = {...}` として含める

## フロントエンド（後順位）

### コンポーネント

- `TexEditor` — TeXソースエディタ（CodeMirror etc.）
- `CitationManager` — 引用管理パネル
- `BibTexPreview` — BibTeX出力プレビュー
- `ExportButton` — BibTeX/TeX exportボタン

## TODO一覧

```python
# TODO(F-1001): TeX文書CRUD | AC: 作成/保存/更新が動作 | owner:@
# TODO(F-1002): 引用追加 | AC: cite key自動生成+TeX文書に紐付け | owner:@
# TODO(F-1003): BibTeX export | AC: プロジェクト参照論文からBibTeX生成 | owner:@
# TODO(F-1004): 引用注釈 | AC: BibTeX項目にannoteフィールド含む | owner:@
```

## D-02との連携

- `GET /projects/:id/export/bibtex` はD-02（Project）とD-10（TeX）の共有エンドポイント
- TeX文書は常にプロジェクトに紐付く（`projectId` 必須）
