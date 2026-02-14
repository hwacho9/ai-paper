# D-07: 関連グラフ（Related Graph / Connected Papers）

## ドメイン概要

論文間の関連度計算、グラフUIに必要なノード/エッジの提供、関連研究の選択によるプロジェクトへの紐付けを担当。

## 責務境界

- 論文間の関連度計算（ベクトル類似度 + キーワード共有 + 引用メタ）
- グラフデータ生成/照会
- ユーザー基準によるグラフ再構成
- 関連研究の選択 → プロジェクト参照への追加

## 機能一覧

| 機能ID | 機能名                    | 説明                                     |
| ------ | ------------------------- | ---------------------------------------- |
| F-0701 | 関連論文推薦              | ベクトル類似度+キーワード+引用メタで推薦 |
| F-0702 | グラフデータ生成/照会     | ノード/エッジデータの生成と取得          |
| F-0703 | グラフ再構成              | キーワード中心/論文中心でのグラフ再構成  |
| F-0704 | 関連研究→プロジェクト追加 | 選択リストからプロジェクト参照に追加     |
| F-0705 | グローバルナレッジグラフ  | 全プロジェクト・ライブラリの統合可視化   |

## 主要エンティティ

### PaperRelation

```
paper_relations/{relationId}
{
  "fromPaperId": "string",
  "toPaperId": "string",
  "score": 0.85,
  "reasons": [
    {"type": "vector_similarity", "score": 0.9},
    {"type": "keyword_overlap", "keywords": ["deep learning"]},
    {"type": "citation", "direction": "cites"}
  ]
}
```

### GraphSnapshot

```
graph_snapshots/{snapshotId}
{
  "ownerUid": "string",
  "projectId": "string | null",
  "nodes": [
    {"id": "paperId", "label": "論文タイトル", "x": 0, "y": 0}
  ],
  "edges": [
    {"source": "paperId1", "target": "paperId2", "weight": 0.85}
  ],
  "createdAt": "timestamp"
}
```

## API仕様

| メソッド | パス                          | 説明                              |
| -------- | ----------------------------- | --------------------------------- |
| `GET`    | `/api/v1/papers/:id/related`  | 論文の関連論文リスト              |
| `GET`    | `/api/v1/projects/:id/graph`  | プロジェクトのグラフデータ        |
| `GET`    | `/api/v1/graph`               | グローバルナレッジグラフ (F-0705) |
| `POST`   | `/api/v1/projects/:id/papers` | 関連研究をプロジェクト参照に追加  |

## フロントエンド

### ページ

- `/projects/[id]/graph` — グラフビュー

### コンポーネント

- `GraphView` — グラフ可視化（ノード/エッジ描画）
- `RelatedPaperList` — 関連論文リスト
- `RelatedPaperCard` — 関連論文カード（プロジェクト追加ボタン付き）

## 実装ノート

- 1次: オンデマンド（要求時に計算/キャッシュ）
- 2次: パイプライン完了イベント（`paper.ingest.completed`）で事前計算
- UIからは複数の関連論文を選択し、`POST /projects/:id/papers` を繰り返し呼んで紐付け

## TODO一覧

```python
# TODO(F-0701): 関連論文推薦 | AC: ベクトル類似度ベースの関連論文リスト返却 | owner:@
# TODO(F-0702): グラフデータ | AC: ノード/エッジJSONの生成・返却 | owner:@
# TODO(F-0703): グラフ再構成 | AC: フィルター基準によるグラフ再構成 | owner:@
# TODO(F-0704): プロジェクト追加 | AC: 関連論文をプロジェクト参照に追加 | owner:@
```
