# D-12: キーワード起点ライブラリ関連（Keyword-driven Library Related）

## ドメイン概要

論文詳細の「関連研究」タブにおいて、対象論文に付与されたキーワードごとに、ユーザーの「マイライブラリ」内から関連論文を列挙する。

目的は、単なる類似論文一覧ではなく、「どのキーワード軸で関連するか」を明示して読解導線を作ること。

## 目的と非目的

### 目的

- キーワード単位で関連論文を見せる
- 関連論文は「マイライブラリ」内に限定する
- 一度表示された論文は後続キーワードで再表示しない（重複排除）

### 非目的

- グローバル推薦（ライブラリ外まで広げること）
- 論文間の完全グラフ可視化（D-07が担当）

## ユースケース

- 「この論文の `self-attention` に関連する、手元保存済み論文だけ見たい」
- 「キーワードごとに発展元を追い、重複なく読み進めたい」

## 機能一覧

| 機能ID | 機能名                         | 説明                                                         |
| ------ | ------------------------------ | ------------------------------------------------------------ |
| F-1201 | キーワード別ライブラリ関連取得 | 対象論文のキーワードごとにマイライブラリ内関連論文を返却     |
| F-1202 | キーワード間重複排除           | 先に採用された論文は後続キーワードの候補から除外             |
| F-1203 | 関連理由表示                   | 論文ごとに「なぜ関連か」を短く返却（体言止め推奨）           |
| F-1204 | タブUI表示                     | 論文詳細「関連研究」内でキーワードセクション単位のリスト表示 |

## 画面仕様（論文詳細 > 関連研究）

- 画面: `/papers/[id]?tab=related`
- 表示形式:
  - キーワード見出し
  - その下に関連論文リスト
- 重複排除:
  - 前のキーワードで表示済みの論文は次のキーワードでは表示しない
- 0件時:
  - キーワード見出しは表示し、本文に「該当なし」

### キーワード処理順

- 既定: 論文キーワードの並び順を尊重
- 代替: 優先度スコア（今後拡張）

## API案（新規）

### `GET /api/v1/papers/:id/library-related-by-keywords`

- 認証: 必須
- 対象: ログインユーザーのマイライブラリのみ

#### クエリパラメータ

- `per_keyword_limit` (int, 任意, default: 3, max: 10)
- `max_keywords` (int, 任意, default: 8, max: 20)

#### レスポンス例

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
          "reason": "長文文脈処理への拡張",
          "score": 0.82
        }
      ]
    },
    {
      "keyword": "pretraining",
      "items": []
    }
  ],
  "meta": {
    "library_size": 42,
    "keywords_used": 6,
    "deduped_count": 4
  }
}
```

## スキーマ案（Pydantic）

```python
class KeywordRelatedItem(BaseModel):
    paper_id: str
    title: str
    authors: list[str]
    year: int | None = None
    reason: str | None = None
    score: float = 0.0

class KeywordRelatedGroup(BaseModel):
    keyword: str
    items: list[KeywordRelatedItem]

class LibraryRelatedByKeywordResponse(BaseModel):
    paper_id: str
    groups: list[KeywordRelatedGroup]
    meta: dict[str, Any]
```

## バックエンド実装方針

1. 対象論文のキーワード取得
2. ユーザーのライブラリ論文一覧取得（対象論文自身は除外）
3. キーワード順に候補スコア計算（keyword overlap + 埋め込み類似）
4. 各キーワードで上位 `per_keyword_limit` 件採用
5. 採用済み論文IDを `seen` セットで管理し、後続キーワードから除外
6. 各採用論文に `reason`（体言止めの短文）を生成

## フロントエンド実装方針

- `related-panel.tsx` に「キーワード別マイライブラリ関連」セクションを追加
- 既存「類似度ランキング」表示とは並列表示または切替表示
- 各論文アイテムは `Link` で既存論文詳細へ遷移

## ドメイン境界

- D-07（Related Graph）:
  - グローバル関連/グラフ/類似度中心
- D-12（本ドメイン）:
  - キーワード軸 + マイライブラリ限定 + キーワード間重複排除

## 受け入れ基準（AC）

- キーワードごとの関連論文セクションが表示される
- 同一論文が複数キーワードに重複表示されない
- 結果はログインユーザーのライブラリ内に限定される
- 各論文に関連理由（短文）が表示される

## TODO

```python
# TODO(F-1201, MIRO:REL-KW-01): キーワード別ライブラリ関連API | AC: groups配列返却、per_keyword_limit対応 | owner:@
# TODO(F-1202, MIRO:REL-KW-02): キーワード間重複排除 | AC: 先出し優先で同一paper_idを再表示しない | owner:@
# TODO(F-1203, MIRO:REL-KW-03): 関連理由生成 | AC: 各アイテムに体言止めreasonを付与 | owner:@
# TODO(F-1204, MIRO:REL-KW-04): 関連研究タブUI | AC: キーワード見出しごとのリスト表示 | owner:@
```
