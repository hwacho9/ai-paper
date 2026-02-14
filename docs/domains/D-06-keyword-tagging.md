# D-06: キーワード & タグ付け（Keyword & Tagging）

## ドメイン概要

ユーザー定義および自動推薦キーワードの管理、論文へのキーワード付与を担当。

## 責務境界

- キーワードのCRUD（ユーザー定義 + 自動推薦）
- 論文へのキーワードタグ付け
- キーワードによる関連論文/文段検索
- 自動キーワード推薦（LLM/埋め込みベース）

## 機能一覧

| 機能ID | 機能名                 | 説明                               |
| ------ | ---------------------- | ---------------------------------- |
| F-0601 | キーワードCRUD         | 作成/修正/削除                     |
| F-0602 | 論文キーワードタグ付け | 論文にキーワードを付与             |
| F-0603 | 自動キーワード推薦     | LLM/埋め込みベースの推薦           |
| F-0604 | 適合性判断             | キーワードが論文に該当するかの判断 |

## 主要エンティティ

### Keyword

```
keywords/{keywordId}
{
  "id": "string",
  "ownerUid": "string",
  "label": "string",
  "description": "string",
  "createdAt": "timestamp"
}
```

### PaperKeyword

```
papers/{paperId}/keywords/{keywordId}
{
  "paperId": "string",
  "keywordId": "string",
  "confidence": 0.95,
  "source": "manual" | "auto",
  "reason": "llm_paper_keyword" | "llm_prerequisite_keyword" | ""
}
```

## API仕様

| メソッド | パス                                     | 説明                 |
| -------- | ---------------------------------------- | -------------------- |
| `POST`   | `/api/v1/keywords`                       | キーワード作成       |
| `GET`    | `/api/v1/keywords`                       | キーワード一覧       |
| `PATCH`  | `/api/v1/keywords/:id`                   | キーワード更新       |
| `DELETE` | `/api/v1/keywords/:id`                   | キーワード削除       |
| `GET`    | `/api/v1/papers/:id/keywords`            | 論文のキーワード一覧 |
| `POST`   | `/api/v1/papers/:id/keywords`            | 論文にキーワード付与 |
| `DELETE` | `/api/v1/papers/:id/keywords/:keywordId` | キーワード解除       |
| `POST`   | `/api/v1/papers/:id/keywords/suggest`    | 自動キーワード推薦   |

## TODO一覧

```python
# TODO(F-0601): キーワードCRUD | AC: 作成/読取/更新/削除が動作 | owner:@
# TODO(F-0602): 論文タグ付け | AC: 論文とキーワードの紐付け/解除 | owner:@
# TODO(F-0603): 自動推薦 | AC: LLM/埋め込みベースのキーワード候補返却 | owner:@
# TODO(F-0604): 適合性判断 | AC: キーワード-論文の適合度スコア返却 | owner:@
# TODO(F-0602): ownerUidベースACLへの移行 | AC: papers.ownerUid導入後、likes依存チェックをownerUid照合に置換 | owner:@
```

## 実装メモ（F-0603 暫定）

- 現在の `POST /api/v1/papers/:id/keywords/suggest` は **LLMベースの自動推薦** を実装している（Gemini 1.5使用）。
- Gemini API が利用不可の場合は、**ルールベースのフォールバック** が実行される。
  - 論文キーワード: タイトル/要旨のテキストマッチングと既定ルール（Transformer, NLP, Computer Vision等）で補完
  - 事前知識キーワード: Machine Learning, Deep Learning, Neural Networks等の一般的な基盤キーワード
- 推薦結果は `papers/{paperId}/keywords/{keywordId}` に保存される。
  - `source="auto"`: 自動生成されたタグ。
  - `reason="llm_paper_keyword"`: その論文自体を表すキーワード。
  - `reason="llm_prerequisite_keyword"`: その論文を読むために必要な事前知識キーワード。
- `manual` タグは保持し、`auto` タグのみ再計算時に一括置換する。
- ライブラリ追加（Like ON）時にも同じ推薦ロジックを呼び出し、自動タグ付けを行う。

### フロントエンド実装（F-0602関連）

**コンポーネント構成:**

- `KeywordTagsEditor` — キーワード全体レイアウト
  - `KeywordTagsToolbar` — 削除/保護モードトグル
  - 📄 **論文キーワード** セクション
    - キーワードタグ表示（sky色: `border-sky-400/40 bg-sky-400/20 text-sky-200`）
    - 追加ボタン（+ アイコン）— フォーカスで入力フィールドに変化
      - `KeywordInputControl (type="paper")`
      - Enter で `reason="llm_paper_keyword"` を指定して登録
  - 📚 **事前知識キーワード** セクション
    - キーワードタグ表示（amber色: `border-amber-400/40 bg-amber-400/20 text-amber-200`）
    - 追加ボタン（+ アイコン）— フォーカスで入力フィールドに変化
      - `KeywordInputControl (type="prerequisite")`
      - Enter で `reason="llm_prerequisite_keyword"` を指定して登録

**ユーザー操作フロー:**

1. 論文詳細ページでキーワードセクションを表示
2. 各キーワード型の + ボタンをクリック → 該当色の入力フィールドが出現
3. テキスト入力 → Enter で登録（適切な reason を自動指定）、Escape でキャンセル
4. 入力フィールド外フォーカス喪失 → 自動的に入力フォーム閉じる
5. 削除モード有効時 → タグをクリックして削除

**タグ表示分類:**

- `reason` フィールドに基づいて自動分類（フロントエンド側）
  - `reason == "llm_prerequisite_keyword"` → 📚 事前知識セクションに表示
  - その他（`llm_paper_keyword` または空文字）→ 📄 論文キーワードセクションに表示

**手動タグ付け時の reason 指定:**

- UI側で reason を明示的に指定（論文キーワード用ハンドラー vs 事前知識キーワード用ハンドラー）
- API側でも `reason` パラメータをサポート（`PaperKeywordTagCreate.reason`）
- 指定がない場合のデフォルト: `"llm_paper_keyword"`

## 実装メモ（ACL移行）

- 現在のF-0602実装では `KeywordService._ensure_paper_access` が **likesベース** でアクセス可否を判定している。
- `papers.ownerUid` 導入後は、この関数の判定ロジックを **ownerUid照合ベース** に置換すること。
- 置換対象をこの関数に集約しているため、移行時の修正箇所は原則ここ1箇所を想定。
