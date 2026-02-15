# D-12: キーワード起点ライブラリ関連（Keyword-driven Library Related）

## ドメイン概要

対象論文のキーワードを軸に、ユーザーのライブラリ内論文から関連候補をキーワード別グループで返すドメイン。

## 責務境界

- 対象論文キーワード（paper + prerequisite）の抽出
- ライブラリ内候補論文とのキーワード照合
- キーワード単位のグルーピング
- キーワード間の重複排除（先出し優先）
- 関連理由・スコアの返却

## 機能一覧（現行）

| 機能ID | 機能名 | 説明 |
| ------ | ------ | ---- |
| F-1201 | キーワード別関連取得 | キーワードごとに候補論文を返却 |
| F-1202 | キーワード間重複排除 | 先に採用された論文を後続グループから除外 |
| F-1203 | 関連理由生成 | 一致種別に応じた `reason` を返却 |
| F-1204 | スコアリング | ルールベース一致で `score` を付与 |

## API仕様（現行）

| メソッド | パス | 説明 |
| -------- | ---- | ---- |
| `GET` | `/api/v1/papers/{paper_id}/library-related-by-keywords` | キーワード別ライブラリ関連取得 |

クエリ:
- `per_keyword_limit` (default: 15, min: 1, max: 20)
- `max_keywords` (default: 8, min: 1, max: 20)

## レスポンスモデル（実装）

### `LibraryRelatedByKeywordResponse`

```json
{
  "paper_id": "target-paper-id",
  "groups": [
    {
      "keyword": "self-attention",
      "items": [
        {
          "paper_id": "lib-paper-1",
          "title": "Longformer",
          "authors": ["..."],
          "year": 2020,
          "paper_keywords": ["Transformer"],
          "prerequisite_keywords": ["Deep Learning"],
          "matched_tag": "self attention",
          "candidate_tag": null,
          "reason": "self-attentionキーワード一致",
          "score": 1.0
        }
      ]
    }
  ],
  "meta": {
    "library_size": 42,
    "keywords_used": 6,
    "deduped_count": 4
  }
}
```

## マッチング仕様（実装）

### キーワード抽出

- 対象論文から次の順で抽出
  - `keywords`
  - `prerequisite_keywords`
  - `prerequisiteKeywords`
- 正規化後の重複を除去し、最大 `max_keywords` 件を採用
- 順序は元配列順を維持

### 正規化

- 小文字化
- `(...)` 除去
- `-` を空白へ置換
- 連続空白圧縮

### 一致判定とスコア

1. 完全一致
- 条件: 正規化キーワード == 候補タグ
- `score = 1.0`
- `reason = "{keyword}キーワード一致"`

2. 部分一致（包含）
- 条件: 正規化キーワードが候補タグを包含、またはその逆
- `score = 0.7`
- `reason = "{keyword}概念近接"`
- `candidate_tag` を設定

3. タイトル一致
- 条件: 正規化キーワードが候補タイトルに含まれる
- `score = 0.6`
- `reason = "{keyword}主題一致"`

4. 一致なし
- 除外

同一キーワード内の並び順:
- `score desc`
- `year desc`

## 重複排除

- 1つの論文は最初に採用されたキーワードグループにのみ出現
- 後続キーワードでは候補から除外

## 実装挙動の注意点

- 対象論文が存在しない場合は 404 ではなく空結果を返す
  - `groups=[]`
  - `meta.library_size=0`
- 候補は「ユーザーのライブラリ（likes）」に限定
- 対象論文そのもの（`paper_id`）は候補から除外

## 実装ステータス

- 実装済み: キーワード別ライブラリ関連取得
- 実装済み: キーワード間重複排除
- 実装済み: ルールベース理由/スコア付与
- 実装済み: クエリでの上限制御（`per_keyword_limit`, `max_keywords`）
- 未実装: 埋め込み類似ベースの再ランク
