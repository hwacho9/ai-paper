# API仕様書（Contract）

## 概要

本ドキュメントはバックエンドAPIの全エンドポイントを一覧化する。詳細は各ドメインドキュメントを参照。

## 共通仕様

### ベースURL

```
/api/v1
```

### 認証

- Firebase Auth JWT トークンを `Authorization: Bearer <token>` ヘッダーで送信
- `/healthz` のみ認証不要

### エラーレスポンス

```json
{
  "detail": "エラーメッセージ",
  "code": "ERROR_CODE"
}
```

### ページネーション

```
?limit=20&offset=0
```

---

## エンドポイント一覧

### ヘルスチェック

| メソッド | パス       | 認証 | ドメイン |
| -------- | ---------- | ---- | -------- |
| `GET`    | `/healthz` | —    | —        |

### D-01: 認証/ユーザー

| メソッド | パス         | 説明             |
| -------- | ------------ | ---------------- |
| `GET`    | `/api/v1/me` | ユーザー情報取得 |
| `PATCH`  | `/api/v1/me` | ユーザー情報更新 |

### D-02: プロジェクト

| メソッド | パス                                   | 説明                     |
| -------- | -------------------------------------- | ------------------------ |
| `POST`   | `/api/v1/projects`                     | 作成（seedPaperIds対応） |
| `GET`    | `/api/v1/projects`                     | 一覧                     |
| `GET`    | `/api/v1/projects/:id`                 | 詳細                     |
| `PATCH`  | `/api/v1/projects/:id`                 | 更新                     |
| `DELETE` | `/api/v1/projects/:id`                 | 削除                     |
| `POST`   | `/api/v1/projects/:id/papers`          | 参照論文追加             |
| `DELETE` | `/api/v1/projects/:id/papers/:paperId` | 参照論文削除             |
| `GET`    | `/api/v1/projects/:id/export/bibtex`   | BibTeX export            |
| `GET`    | `/api/v1/projects/:id/graph`           | グラフデータ             |

### D-03: ペーパーライブラリ

| メソッド | パス                      | 説明       |
| -------- | ------------------------- | ---------- |
| `POST`   | `/api/v1/papers`          | 論文保存   |
| `POST`   | `/api/v1/papers/:id/pdf`  | PDF登録    |
| `GET`    | `/api/v1/papers`          | 一覧       |
| `GET`    | `/api/v1/papers/:id`      | 詳細       |
| `PATCH`  | `/api/v1/papers/:id`      | 更新       |
| `DELETE` | `/api/v1/papers/:id`      | 削除       |
| `POST`   | `/api/v1/papers/:id/like` | いいね     |
| `DELETE` | `/api/v1/papers/:id/like` | いいね解除 |

### D-04: 検索

| メソッド | パス                    | 説明     |
| -------- | ----------------------- | -------- |
| `GET`    | `/api/v1/search/papers` | 論文検索 |

### D-06: キーワード

| メソッド | パス                                     | 説明     |
| -------- | ---------------------------------------- | -------- |
| `POST`   | `/api/v1/keywords`                       | 作成     |
| `GET`    | `/api/v1/keywords`                       | 一覧     |
| `PATCH`  | `/api/v1/keywords/:id`                   | 更新     |
| `DELETE` | `/api/v1/keywords/:id`                   | 削除     |
| `POST`   | `/api/v1/papers/:id/keywords`            | タグ付け |
| `DELETE` | `/api/v1/papers/:id/keywords/:keywordId` | タグ解除 |
| `POST`   | `/api/v1/papers/:id/keywords/suggest`    | 自動推薦 |

### D-07: 関連グラフ

| メソッド | パス                         | 説明     |
| -------- | ---------------------------- | -------- |
| `GET`    | `/api/v1/papers/:id/related` | 関連論文 |

### D-08: メモ

| メソッド | パス                | 説明 |
| -------- | ------------------- | ---- |
| `POST`   | `/api/v1/memos`     | 作成 |
| `GET`    | `/api/v1/memos`     | 一覧 |
| `GET`    | `/api/v1/memos/:id` | 詳細 |
| `PATCH`  | `/api/v1/memos/:id` | 更新 |
| `DELETE` | `/api/v1/memos/:id` | 削除 |

### D-09: 読解サポート

| メソッド | パス                            | 説明           |
| -------- | ------------------------------- | -------------- |
| `GET`    | `/api/v1/papers/:id/outline`    | 目次           |
| `GET`    | `/api/v1/papers/:id/chunks`     | チャンク一覧   |
| `POST`   | `/api/v1/papers/:id/explain`    | テキスト解釈   |
| `POST`   | `/api/v1/papers/:id/highlights` | ハイライト保存 |
| `GET`    | `/api/v1/papers/:id/highlights` | ハイライト一覧 |

### D-10: TeX/BibTeX

| メソッド | パス                            | 説明        |
| -------- | ------------------------------- | ----------- |
| `POST`   | `/api/v1/texdocs`               | TeX文書作成 |
| `GET`    | `/api/v1/texdocs`               | 一覧        |
| `GET`    | `/api/v1/texdocs/:id`           | 取得        |
| `PATCH`  | `/api/v1/texdocs/:id`           | 更新        |
| `POST`   | `/api/v1/texdocs/:id/citations` | 引用追加    |
