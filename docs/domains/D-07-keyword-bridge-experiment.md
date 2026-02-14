# D-07+ 開発計画: キーワードブリッジによるグラフ接続改善

## ドメイン概要

`D-07 関連グラフ` の拡張として、論文キーワードを使った補助エッジを導入し、`owned`（ライブラリ保存論文）と `related`（関連研究）ノードの分断を減らす。

既存のベクトル類似ベース接続は維持し、キーワードは「不足接続を埋める補助線」として扱う。

## ユースケース

- 「ライブラリの論文が、どの関連研究と繋がるのかを一目で見たい」
- 「プロジェクト外の保存論文が孤立せず、探索導線の中に入っていてほしい」
- 「関連理由がキーワード軸で説明可能な接続を優先したい」

## 目的と非目的

### 目的

- `GET /api/v1/graph` の接続性を改善する
- `owned ↔ related` 間のエッジ欠損をキーワード一致で補完する
- 既存キャッシュ/描画仕様を壊さず段階導入できる形で実装する

### 非目的

- 力学レイアウトやグラフ描画コンポーネントの刷新
- 関連論文推薦（`/papers/:id/related`）のスコア式改変
- 埋め込み再計算や新しいインデックス基盤の導入

## スコープ

- 対象API: `GET /api/v1/graph`
- 対象サービス: `apps/api/app/modules/related/service.py`
- 対象ルーター: `apps/api/app/modules/related/router.py`
- 対象設定: `apps/api/app/core/config.py`
- 対象フロント: `apps/web/src/app/graph/page.tsx`, `apps/web/src/lib/api/related.ts`
- 対象データ: `papers.keywords` / `papers.prerequisiteKeywords`
- 関連更新: キーワード更新時のグラフキャッシュ無効化

## 機能一覧

| 機能ID | 機能名                           | 説明 |
| ------ | -------------------------------- | ---- |
| F-0706 | キーワードブリッジエッジ生成     | `owned` と `related` の共通キーワードで補助エッジを追加 |
| F-0707 | ブリッジ重複/過密制御            | 既存エッジ重複排除、上限設定で可読性を維持 |
| F-0708 | キーワード変更時キャッシュ連携   | キーワード更新時に `graph_global` を無効化 |
| F-0709 | 接続改善メトリクスの観測ログ整備 | 孤立ノード数・追加エッジ数などをログ出力 |

## 実装方針

### 1. キーワード正規化

- 小文字化
- `(...)` の除去
- `-` を空白化
- 連続空白圧縮

`D-12` で採用している正規化方針と揃え、保守性を確保する。

### 2. エッジ追加ロジック

1. 既存グラフ生成で `nodes` と `edge_set` を作成
2. `owned` / `related` 論文のキーワード集合を抽出
3. ペアごとに共通キーワードを計算
4. 共通キーワードが1件以上なら補助エッジを追加
5. `edge_set` で重複除外（undirected key）

補助エッジ重み（初期案）:
- `value = min(0.9, 0.35 + 0.15 * overlap_count)`

### 3. 過密制御

- 1ノードあたり補助エッジ上限を導入（例: 5）
- 低重みエッジから間引けるように実装

### 4. キャッシュ連携

- `KeywordService` のタグ追加/削除/自動反映後に `related_service.invalidate_user_graph_cache(uid)` を呼ぶ
- これによりキーワード変更が次回 `GET /graph` で反映される
- キャッシュは接続モードごとに分離し、比較時の混線を防ぐ

## API影響

- `GET /api/v1/graph` に `connection_mode` クエリを追加
  - `embedding` / `keyword` / `hybrid`
- `connection_mode` 未指定時は `keyword` を既定値として扱う
- `GET /api/v1/graph` の `edges` はモードに応じて変化（レスポンススキーマ互換は維持）
- `Edge.value` の意味は従来通り「関連強度」とし、補助エッジにも同じ型を使う

## 実装済み仕様（2026-02-14 時点）

- バックエンド
  - `connection_mode` による接続戦略切替を実装
  - モード別キャッシュを実装
    - `graph_global_embedding`
    - `graph_global_keyword`
    - `graph_global_hybrid`
  - キャッシュ無効化時に上記モード別キャッシュを一括削除
  - ログ出力を追加
    - キャッシュヒット時のモード
    - ブリッジ追加件数（embedding / keyword）

- フロントエンド
  - `/graph?mode=embedding|keyword|hybrid` で比較可能
  - `mode` 未指定時は `keyword` を使用

- 検証ログ例
  - `global graph keyword edges added ... count=62 owned=23 related=18`

## 開発ステップ

1. Step 1: ブリッジ生成のユーティリティ関数を `related/service.py` に追加（完了）
2. Step 2: `get_global_graph` に補助エッジ追加処理を組み込み（完了）
3. Step 3: 過密制御（上限・重み制御）を導入（完了）
4. Step 4: `keywords/service.py` にキャッシュ無効化連携を追加（進行中）
5. Step 5: 接続改善メトリクスのログを追加（完了）
6. Step 6: `connection_mode` で embedding/keyword/hybrid を比較可能にする（完了）

## 受け入れ基準（AC）

- AC1: 既存グラフで孤立していた `owned` ノードの一部が接続される
- AC2: `GET /api/v1/graph` レスポンススキーマ互換が維持される
- AC3: 同一ペアの重複エッジが生成されない
- AC4: キーワード更新後にグラフキャッシュが無効化される
- AC5: エッジ増加でUIが破綻しない（描画可能）

## リスクと対策

- リスク: 誤接続が増える
  - 対策: 初期は完全一致ベース、部分一致は次フェーズ
- リスク: エッジ過多で読みにくくなる
  - 対策: ノードごとの補助エッジ上限を設定
- リスク: 反映遅延
  - 対策: キーワード操作時に `graph_global` キャッシュを確実に無効化

## TODO一覧

```python
# TODO(F-0706, MIRO:GRAPH-KW-BRIDGE-01): キーワードブリッジエッジ生成 | AC: owned↔relatedを共通keywordで接続 | owner:@
# TODO(F-0707, MIRO:GRAPH-KW-BRIDGE-02): 過密制御 | AC: 1ノードあたり補助エッジ上限導入 | owner:@
# TODO(F-0708, MIRO:GRAPH-KW-BRIDGE-03): キャッシュ無効化連携 | AC: keyword変更時にgraph_globalをinvalidate | owner:@
# TODO(F-0709, MIRO:GRAPH-KW-BRIDGE-04): 観測ログ追加 | AC: 追加エッジ数/孤立ノード数をログ出力 | owner:@
```
