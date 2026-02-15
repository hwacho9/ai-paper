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

## 関連度スコアリング（top-N再ランク）

- 目的: ベクトル検索の精度を維持しつつ、再ランク計算コストを抑える。

### ステップ1: ベクトル候補抽出
- 入力テキストは `Title + Keywords + Abstract` を連結。
- Vector Search で上位 `VECTOR_FETCH_K` 件（初期値: 50）を取得。
- この段階は粗い候補の取得として扱う。

### ステップ2: 補助特徴の算出（再ランク対象のみ）
- 候補内の上位 `TOP_RERANK_CANDIDATES` 件（初期値: 30）に対してのみ再計算。
- `keyword_overlap`: Jaccard で算出。
  - `overlap = |A ∩ B| / |A ∪ B|`
- `citation_score`: 引用数を 0〜1 に正規化。
  - `citation_score = min(citationCount, 100) / 100`
  - データ欠損時は `0`。

### ステップ3: 再ランクリアルライス
- 連結スコア:
  - `final_score = 0.60 * vector_score + 0.25 * keyword_overlap + 0.15 * citation_score`
- 最終返却候補は `TOP_N` で上限（既定: 5）。

### 運用ルール
- 全候補の二次評価を避けるため `VECTOR_FETCH_K -> TOP_RERANK_CANDIDATES -> TOP_N` の 3段階で収束させる。
- 同点時は `citationCount` 降順、次いで出版年降順で tie-break。
- エッジ値は最終 `final_score` を利用し、重複エッジは既存仕様に従い除外。

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
- 上記 top-N 再ランクを導入すると、推薦とグラフ生成ともコスト/遅延が上がりにくくなる。
- UIからは複数の関連論文を選択し、`POST /projects/:id/papers` を繰り返し呼んで紐付け

## TODO一覧

```python
# TODO(F-0701): 関連論文推薦 | AC: ベクトル再取得(top-N) + キーワード重ね合わせ + 引用補正で関連論文を返却 | owner:@
# TODO(F-0702): グラフデータ | AC: ノード/エッジJSONの生成・返却 | owner:@
# TODO(F-0703): グラフ再構成 | AC: フィルター基準によるグラフ再構成 | owner:@
# TODO(F-0704): プロジェクト追加 | AC: 関連論文をプロジェクト参照に追加 | owner:@
```
