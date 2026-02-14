# D-02: プロジェクト（My Paper プロジェクト）

## ドメイン概要

ユーザーが作成中の「マイペーパープロジェクト」の生成/管理を担当。参照論文の紐付け、export方針の管理を行う。

## 責務境界

- マイペーパープロジェクトのCRUD
- プロジェクトへの参照論文の追加/削除
- プロジェクト単位のexport/BibTeX構成
- 関連研究セットからのプロジェクト素早い生成（Seed Papers）

## 機能一覧

| 機能ID | 機能名                        | 説明                                 |
| ------ | ----------------------------- | ------------------------------------ |
| F-0201 | プロジェクト作成/修正/削除    | 基本CRUDオペレーション               |
| F-0202 | 参照論文 追加/削除            | プロジェクトに論文を紐付け           |
| F-0203 | プロジェクトダッシュボード    | 進捗度、最近のアクティビティ         |
| F-0204 | プロジェクトexport            | BibTeX + 注釈付きexport              |
| F-0205 | Seed Papersでプロジェクト生成 | 選択した関連研究からプロジェクト作成 |
| F-0206 | 参照/関連論文の確認と追加     | Connected論文の表示と追加            |

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
  "projectId": "string",
  "paperId": "string",
  "addedAt": "timestamp",
  "note": "string | null",
  "role": "reference" | "related"
}
```

## API仕様

| メソッド | パス                                   | 説明                                           |
| -------- | -------------------------------------- | ---------------------------------------------- |
| `POST`   | `/api/v1/projects`                     | プロジェクト作成（`seedPaperIds[]`オプション） |
| `GET`    | `/api/v1/projects`                     | プロジェクト一覧                               |
| `GET`    | `/api/v1/projects/:id`                 | プロジェクト詳細                               |
| `PATCH`  | `/api/v1/projects/:id`                 | プロジェクト更新                               |
| `DELETE` | `/api/v1/projects/:id`                 | プロジェクト削除                               |
| `POST`   | `/api/v1/projects/:id/papers`          | 参照論文追加                                   |
| `DELETE` | `/api/v1/projects/:id/papers/:paperId` | 参照論文削除                                   |
| `GET`    | `/api/v1/projects/:id/export/bibtex`   | BibTeX export                                  |

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
    created_at: datetime
    updated_at: datetime
    paper_count: int
    status: str

class ProjectPaperAdd(BaseModel):
    paper_id: str
    note: str | None = None
    role: str = "reference"  # "reference" | "related"
```

## フロントエンド

### ページ

- `/projects` — プロジェクト一覧 + 作成ボタン
- `/projects/[id]` — プロジェクト詳細（参照論文 + Connected + export）

### コンポーネント

- `ProjectCard` — プロジェクトカード（一覧用）
- `ProjectCreateDialog` — 新規プロジェクト作成ダイアログ
- `ProjectPapersList` — プロジェクト内の参照論文リスト（クリックで論文詳細へ遷移）
- `ProjectExportButton` — BibTeX exportボタン

## ポリシー（推奨）

- プロジェクトに論文を追加するには、その論文がMy Paper Libraryに存在する必要あり
- 検索結果/関連研究からプロジェクトに追加する場合、サーバーが自動的にLibraryに保存してから紐付け

## TODO一覧

```python
# TODO(F-0201): プロジェクトCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
# TODO(F-0202): 参照論文追加/削除 | AC: プロジェクトと論文の紐付け/解除 | owner:@
# TODO(F-0205): Seed Papers生成 | AC: seedPaperIds[]で初期参照論文付きプロジェクト作成 | owner:@
# TODO(F-0206): Connected論文確認/追加 | AC: 関連論文表示+プロジェクトへの追加 | owner:@
# TODO(F-0204): BibTeX export | AC: プロジェクトの参照論文からBibTeX生成 | owner:@
```

## 権限

- `ownerUid` のみアクセス可能（メンバー拡張は後順位）
