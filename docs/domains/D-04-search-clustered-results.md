# D-04拡張: 論文検索結果のLLM再整理（重要論文ハブ型）

## 目的

従来の「検索結果リスト」を、LLMで再整理した以下の構造で返す。

- 根幹の重要論文（Hub paper）
- その重要論文から発展した論文（Children）
- 重要論文に対する関連論文（Related）
- 上記を複数グループで提示（Queryによっては1件以上）

これにより、ユーザーが「分野の中心」と「派生」を同時に把握できる検索体験にする。

## ユースケース

- 「このテーマの中核論文を知りたい」
- 「中核論文から何が発展したかを追いたい」
- 「複数潮流（グループ）を並列比較したい」

## スコープ

- 対象: `/search` の検索結果表示
- 非対象: ライブラリ保存、PDF取り込み、メモ機能の挙動変更
- 既存 `GET /api/v1/search/papers` は互換維持（フォールバック用途）

## 新API（提案）

### `POST /api/v1/search/papers/recluster`

- 認証: 必須
- 目的: クエリに対する検索結果を取得し、LLMで「重要論文中心」に再整理して返す

### リクエスト例

```json
{
  "query": "graph neural networks for molecule property prediction",
  "source": "semantic_scholar",
  "top_k": 60,
  "group_target": 4,
  "include_related": true
}
```

### レスポンス例

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
        "source": "semantic_scholar",
        "score": 0.93
      },
      "children": [
        {
          "paper_id": "paper-010",
          "title": "Improved Message Passing ...",
          "year": 2019,
          "relation_type": "extends",
          "score": 0.88
        }
      ],
      "related": [
        {
          "paper_id": "paper-099",
          "title": "A Survey on Molecular GNNs",
          "year": 2021,
          "relation_type": "survey",
          "score": 0.81
        }
      ]
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

## データモデル（Pydantic案）

```python
class ReclusterSearchRequest(BaseModel):
    query: str
    source: Literal["semantic_scholar", "arxiv"] = "semantic_scholar"
    top_k: int = 60
    group_target: int = 4
    include_related: bool = True

class ClusterPaperItem(BaseModel):
    paper_id: str
    title: str
    year: int | None
    source: str
    score: float
    relation_type: str | None = None  # extends / applies / compares / survey ...

class SearchCluster(BaseModel):
    cluster_id: str
    label: str
    summary: str
    hub_paper: ClusterPaperItem
    children: list[ClusterPaperItem]
    related: list[ClusterPaperItem]

class ReclusterSearchResponse(BaseModel):
    query: str
    clusters: list[SearchCluster]
    uncertain_items: list[ClusterPaperItem]
    meta: dict[str, Any]
```

## バックエンド実装方針

1. 候補取得（既存検索の再利用）
2. 候補を軽量整形（title/abstract/year/citation_count 等）
3. LLMへ構造化出力を要求（hub/children/related/group label）
4. JSONスキーマでバリデーション
5. 不正データを除去し `uncertain_items` へ退避
6. 最終レスポンスを返却

### 既存AI検索との噛み合わせ

- 入口は既存 `search` モジュールの候補取得ロジックを使う
- 再整理のみ新サービス `recluster_service.py` で実施（LLM呼び出し）
- LLM障害時は既存のフラット検索結果を `clusters=[]` + `fallback_used=true` で返す

## フロントエンド実装方針

- `/search` に表示モードを追加
  - `list`（既存）
  - `organized`（新規）
- `organized` ではグループごとに以下を表示
  - Hubカード（強調）
  - Childrenリスト
  - Relatedリスト
- 「保存（Like）」導線は既存カード操作を共通利用

## APIモジュール変更案（web）

- `apps/web/src/lib/api/search.ts`
  - `searchPapersReclustered(data)` を追加
  - 既存 `searchPapers` は維持

## APIモジュール変更案（api）

- `apps/api/app/modules/search/router.py`
  - `POST /api/v1/search/papers/recluster` を追加
- `apps/api/app/modules/search/service.py`
  - 既存検索取得 + 再整理パイプラインを呼ぶ
- `apps/api/app/modules/search/schemas.py`
  - Request/Responseスキーマを追加

## 段階導入（推奨）

1. Step 1: 新APIを追加し、LLMで hub/children/related を生成
2. Step 2: 失敗時フォールバック（既存list）を実装
3. Step 3: UIで `list` / `organized` を切替可能にする
4. Step 4: relation_type の安定化（プロンプト調整）

## 受け入れ基準（AC）

- クエリ実行時、1件以上のグループが返る（0件時は空配列）
- 各グループに `hub_paper` が必ず1件ある
- 既存検索APIのレスポンス互換を壊さない
- フロントで `list` / `organized` を切替可能
- 失敗時にフォールバック（list表示）できる

## TODO

```python
# TODO(F-0404, MIRO:UI-SEARCH-CLUSTER-01): LLM再整理検索API | AC: hub/children/related を返却 | owner:@
# TODO(F-0405, MIRO:UI-SEARCH-CLUSTER-02): 検索UI再整理表示 | AC: list/organized切替、Like導線維持 | owner:@
# TODO(F-0406, MIRO:UI-SEARCH-CLUSTER-03): フォールバック設計 | AC: API失敗時に既存リストへ自動退避 | owner:@
```
