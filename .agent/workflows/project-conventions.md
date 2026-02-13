---
description: プロジェクト共通規約（TODO・PR・命名・言語ルール）
---

# プロジェクト共通規約スキル

## 概要

本プロジェクトは論文検索/保存(いいね)/メモ/関連研究選択を通じて、ユーザーが「マイペーパープロジェクト」を作成・管理できるWebサービスである。

## 言語ルール

- **コード内コメント**: 日本語
- **ドキュメント（.md）**: 日本語
- **変数名/関数名**: 英語（キャメルケース/スネークケース）
- **コミットメッセージ**: 日本語 or 英語（チーム合意）

## TODO フォーマット（必須）

```
TODO(F-xxxx, MIRO:ノードID): 作業要約 | AC:完了条件 | owner:@
```

### 例

```python
# TODO(F-0301, MIRO:ACT-MYPAPER-01): 論文保存API | AC: ownerUid検証、重複防止 | owner:@dev1
```

```typescript
// TODO(F-0401, MIRO:UI-SEARCH-01): 検索入力+結果リスト | AC: 検索ワード→結果表示、ローディング/空状態 | owner:@dev2
```

## PR分割計画

| PR  | 範囲                                          | 完了基準（AC）                              |
| --- | --------------------------------------------- | ------------------------------------------- |
| PR1 | レポスキャフォールド + lint/test + shadcn     | ビルド成功、healthz応答、テスト通過         |
| PR2 | 認証 + Firestoreスケルトン                    | ログインUI、JWT検証、/me動作                |
| PR3 | 検索 + ライブラリいいね + メモ自動生成        | 検索→いいね→メモ生成フロー動作              |
| PR4 | プロジェクト(seed papers) + 関連追加          | プロジェクト作成+参照論文追加+BibTeX export |
| PR5 | パイプラインJob(最小) + READY状態反映         | PDF→INGESTING→READY遷移                     |
| PR6 | 関連グラフ基本リスト + グラフスナップショット | グラフ表示+BibTeX注釈                       |

## PRルール

1. PRには解決したTODOキーを明記: `Resolved: TODO(F-0502, MIRO:...)`
2. API変更時はAPI Contract（`docs/api-contracts.md`）を更新
3. パイプライン変更時はイベント/状態定義を維持
4. レビュー前にlint + テストをパス

## ドメイン構成（D-01〜D-10）

| ID   | ドメイン名         | 責務                                     |
| ---- | ------------------ | ---------------------------------------- |
| D-01 | Auth & User        | ログイン、プロフィール、権限/セッション  |
| D-02 | Project            | マイペーパープロジェクト作成/管理        |
| D-03 | Paper Library      | いいね保存、ライブラリ管理               |
| D-04 | Paper Search       | 外部検索、結果正規化                     |
| D-05 | Ingestion Pipeline | PDFパース/チャンク/埋め込み/インデックス |
| D-06 | Keyword & Tagging  | キーワード管理、自動タグ付け             |
| D-07 | Related Graph      | 関連論文グラフ                           |
| D-08 | Memo & Notes       | メモ/要約/引用根拠                       |
| D-09 | Reading Support    | PDFビューア、ハイライト                  |
| D-10 | TeX & BibTeX       | TeX編集、引用管理、BibTeX export         |

## Firestore設計原則

1. すべてのユーザーデータは `ownerUid` ベースでアクセス制御
2. コレクション名は小文字スネークケース
3. ドキュメントIDはFirestore自動生成を基本

## 環境変数（必須キー）

| 変数名                | 用途                               |
| --------------------- | ---------------------------------- |
| `GCP_PROJECT_ID`      | GCPプロジェクトID                  |
| `GCP_REGION`          | リージョン                         |
| `FIRESTORE_DB`        | Firestoreデータベース名（default） |
| `GCS_BUCKET_PDF`      | PDF用GCSバケット                   |
| `PUBSUB_TOPIC_INGEST` | 取り込みトピック                   |
| `VERTEX_LOCATION`     | Vertex AIロケーション              |
| `VECTOR_INDEX_ID`     | Vector SearchインデックスID        |
| `CORS_ALLOW_ORIGINS`  | CORS許可オリジン                   |
