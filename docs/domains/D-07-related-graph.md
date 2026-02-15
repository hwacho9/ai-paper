# D-07: 関連グラフ（Related Graph / Connected Papers）

## ドメイン概要

論文の関連度推定と、グラフUI用のノード/エッジ生成を担当するドメイン。
`related` モジュールは「関連論文取得」「プロジェクトグラフ」「グローバルグラフ」を提供する。

## 責務境界

- 単一論文の関連論文推薦（Vector Search + 再ランク）
- プロジェクト単位グラフの生成
- ユーザー全体グローバルグラフの生成とキャッシュ
- 接続モード（`embedding` / `keyword` / `hybrid`）によるブリッジエッジ制御

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-0701 | 関連論文推薦 | ベクトル検索結果をキーワード・引用で再ランク |
| F-0702 | プロジェクトグラフ生成 | `project -> paper` とキーワード重複エッジを返却 |
| F-0703 | グローバルグラフ生成 | projects/library を統合して返却 |
| F-0704 | 接続モード切替 | `connection_mode` により edge 構築方式を切替 |
| F-0705 | グラフキャッシュ | モード別キャッシュ保存・無効化 |

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/related` | 論文の関連論文リスト取得 |
| `GET` | `/api/v1/projects/{project_id}/graph` | プロジェクトグラフ取得 |
| `GET` | `/api/v1/graph` | グローバルグラフ取得 |

`GET /api/v1/graph` クエリ:
- `connection_mode` (optional): `embedding` / `keyword` / `hybrid`
- 未指定または不正値は `keyword` 扱い

## データモデル（レスポンス）

### `RelatedPaper`

```json
{
  "paperId": "string",
  "title": "string",
  "authors": ["string"],
  "year": 2024,
  "venue": "string",
  "abstract": "string",
  "similarity": 0.82,
  "citationCount": 12
}
```

### `GraphData`

```json
{
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "group": "project | owned | related | paper",
      "val": 1
    }
  ],
  "edges": [
    {
      "source": "string",
      "target": "string",
      "value": 0.65
    }
  ]
}
```

## 関連論文推薦（F-0701）

### フロー

1. `papers/{paperId}` からタイトル・要旨・キーワード取得
2. `Title + Keywords + Abstract` でクエリ文を組み立て
3. 埋め込みを生成して Vector Search を実行
4. 候補上位のみ再ランク
5. `RelatedPaper[]` を返却

### スコアリング（実装値）

- 1次候補取得: `vector_fetch_k = 50`
- 再ランク対象: `rerank_top_k = 30`
- 最終スコア:
  - `final = 0.60 * vector + 0.25 * keyword_jaccard + 0.15 * citation_score`
- tie-break:
  - `final_score desc`
  - `citation_score desc`
  - `year desc`

補足:
- `citation_score = min(max(citationCount, 0), 100) / 100`
- source論文にキーワードが無い場合はタイトル+要旨をトークン化して代用

## プロジェクトグラフ（F-0702）

- ノード:
  - プロジェクトノード（`group=project`, `val=5`）
  - プロジェクト配下論文ノード（`group=paper`, `val=2`）
- エッジ:
  - `project -> paper` を `value=1.0` で接続
  - 論文同士はキーワード句の重複数で接続（embeddingは使わない）
  - 重み: `min(0.9, 0.35 + 0.15 * overlap_count)`

## グローバルグラフ（F-0703/F-0704/F-0705）

### ノード構成

- `projects`（ownerUid一致）を取得し `group=project`
- project配下論文は `group=related`
- ライブラリのみの論文は `group=owned`

### ブリッジエッジ

- `embedding` モード:
  - `owned <-> related` のみ対象
  - `get_related_papers` の結果を使って接続
- `keyword` モード:
  - `owned -> related` の共通キーワード句で接続
  - 1ノードあたり上限 `keyword_bridge_max_edges_per_node = 5`
- `hybrid` モード:
  - 上記2方式を併用

### キャッシュ

- 保存先: `users/{uid}/cache/graph_global_{mode}`
  - `mode`: `keyword` / `embedding` / `hybrid`
- 保存内容:
  - `nodes`, `edges`, `updatedAt`, `connectionMode`
- 無効化API（内部利用）:
  - `invalidate_user_graph_cache(uid)`
  - 対象: `graph_global`, `graph_global_keyword`, `graph_global_embedding`, `graph_global_hybrid`

## 現状の注意点

- `paper_relations` や `graph_snapshots` の独立コレクションは現行実装では未採用
- グローバルグラフはユーザー文脈の都度計算 + キャッシュで、事前バッチ生成は行っていない
- D-07+ のキーワードブリッジ拡張は一部反映済みだが、D-06のキーワード更新時に必ずキャッシュ無効化する連携は未実装

## 実装ステータス

- 実装済み: 関連論文推薦（Vector Search + 再ランク）
- 実装済み: プロジェクトグラフ生成
- 実装済み: グローバルグラフ生成（モード切替）
- 実装済み: モード別グラフキャッシュ
- 実装済み: projects/papers 更新時のグラフキャッシュ無効化
- 未実装: キーワード操作（D-06）起点のグラフキャッシュ無効化連携
