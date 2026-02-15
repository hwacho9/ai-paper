# D-02: プロジェクト（My Paper プロジェクト）

## ドメイン概要

ユーザーのプロジェクト作成・管理、参照論文の紐付け、プロジェクト配下の TeX ワークスペース管理を担当するドメイン。

## 責務境界

- マイペーパープロジェクトのCRUD
- プロジェクトへの参照論文の追加/削除
- Seed Paper 指定付きのプロジェクト作成
- TeX 機能との連携（詳細仕様は D-10）

## 機能一覧

| 機能ID | 機能名                        | 説明 |
| ------ | ----------------------------- | ---- |
| F-0201 | プロジェクト作成/修正/削除    | 基本CRUDオペレーション |
| F-0202 | 参照論文 追加/削除/一覧       | プロジェクトに論文を紐付け |
| F-0203 | Seed Papersでプロジェクト生成 | `seed_paper_ids` 指定で初期論文を追加 |
| F-0204 | TeX/BibTeX連携                | プロジェクト配下の TeX 機能を利用（詳細は D-10） |
| F-0205 | BibTeX 同期                   | 参照論文と BibTeX の整合性を維持（詳細は D-10） |
| F-0206 | プロジェクトグラフ参照        | `/api/v1/projects/{id}/graph` でグラフ取得 |

## 主要エンティティ

### Project

```
projects/{projectId}
{
  "id": "string",
  "ownerUid": "string",
  "title": "string",
  "description": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "paperCount": "number",
  "status": "active" | "archived"
}
```

### ProjectPaper

```
projects/{projectId}/papers/{paperId}
{
  "paperId": "string",
  "addedAt": "timestamp",
  "note": "string",
  "role": "reference" | "related"
}
```

## API仕様

### プロジェクト・参照論文

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `POST` | `/api/v1/projects` | プロジェクト作成（`seed_paper_ids[]` 対応） |
| `GET` | `/api/v1/projects` | プロジェクト一覧 |
| `GET` | `/api/v1/projects/{project_id}` | プロジェクト詳細 |
| `PATCH` | `/api/v1/projects/{project_id}` | プロジェクト更新 |
| `DELETE` | `/api/v1/projects/{project_id}` | プロジェクト削除 |
| `POST` | `/api/v1/projects/{project_id}/papers` | 参照論文追加 |
| `DELETE` | `/api/v1/projects/{project_id}/papers/{paper_id}` | 参照論文削除 |
| `GET` | `/api/v1/projects/{project_id}/papers` | 参照論文一覧 |

### TeX/BibTeX（D-10 参照）

- プロジェクト配下の TeX/BibTeX API は利用するが、詳細仕様は D-10 に集約する。

## スキーマ（Pydantic）

```python
class ProjectCreate(BaseModel):
    title: str
    description: str = ""
    seed_paper_ids: list[str] = []

class ProjectResponse(BaseModel):
    id: str
    owner_uid: str
    title: str
    description: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    paper_count: int = 0
    status: str = "active"

class ProjectPaperAdd(BaseModel):
    paper_id: str
    note: str | None = None
    role: str = "reference"  # "reference" | "related"

class ProjectPaperResponse(BaseModel):
    paper_id: str
    note: str = ""
    role: str = "reference"
    added_at: datetime | None = None
```

## フロントエンド

### ページ

- `/projects` — プロジェクト一覧 + 作成 + 削除
- `/projects/[id]` — プロジェクト詳細（参照論文管理、LaTeX編集、メモ管理、BibTeX表示）

### コンポーネント

- `/projects` ページ内でカード一覧と作成ダイアログを実装
- `/projects/[id]` ページ内で文献追加/削除、BibTeX表示/コピー、TeX操作UIを実装

## 実装ステータス

- 実装済み: プロジェクト CRUD
- 実装済み: 参照論文の追加/削除/一覧
- 実装済み: `seed_paper_ids` 指定での作成
- 実装済み: TeX/BibTeX 連携（詳細は D-10 管轄）
- 未実装: `GET /api/v1/projects/{id}/export/bibtex` 専用エンドポイント
- 注意: 論文追加時に Library 存在検証・自動保存はサーバー側では行っていない

## 備考

- プロジェクト単位グラフは D-07 の API として提供される（`GET /api/v1/projects/{project_id}/graph`）
- TeX/BibTeX の詳細仕様・UI仕様は D-10 を正本とする

## 権限

- `ownerUid` のみアクセス可能（メンバー拡張は後順位）
