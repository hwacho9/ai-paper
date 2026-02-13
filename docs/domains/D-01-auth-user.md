# D-01: 認証 & ユーザー（Auth & User）

## ドメイン概要

Firebase Auth ベースのログイン/セッション管理、およびユーザープロフィール管理を担当するドメイン。

## 責務境界

- Firebase Auth によるログイン/会員登録（Email / OAuth）
- ユーザープロフィル（表示名、研究分野タグ等）の管理
- サーバーサイド権限検査ミドルウェア

## 機能一覧

| 機能ID | 機能名                | 説明                               |
| ------ | --------------------- | ---------------------------------- |
| F-0101 | ログイン/会員登録     | Email/OAuthによるFirebase Auth認証 |
| F-0102 | プロフィール照会/修正 | 表示名、研究分野タグ等の管理       |
| F-0103 | 権限検査              | サーバーミドルウェアでのJWT検証    |

## 主要エンティティ

### User

```
users/{uid}
{
  "uid": "string",
  "displayName": "string",
  "email": "string",
  "researchFields": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "preferences": {
    "language": "string",
    "theme": "string"
  }
}
```

## API仕様

### `GET /api/v1/me`

- **認証**: 必須
- **説明**: 現在のユーザー情報を取得
- **レスポンス**: `UserResponse`

### `PATCH /api/v1/me`

- **認証**: 必須
- **説明**: ユーザー情報を更新
- **リクエスト**: `UserUpdate`
- **レスポンス**: `UserResponse`

## スキーマ（Pydantic）

```python
class UserResponse(BaseModel):
    uid: str
    display_name: str
    email: str
    research_fields: list[str] = []
    created_at: datetime
    preferences: dict = {}

class UserUpdate(BaseModel):
    display_name: str | None = None
    research_fields: list[str] | None = None
    preferences: dict | None = None
```

## フロントエンド

### ページ

- `/login` — ログインページ（Firebase Auth UI）

### コンポーネント

- `LoginForm` — メール/パスワード + OAuthボタン
- `UserProfileMenu` — ヘッダーのプロフィールメニュー

### フック

- `useAuth()` — 認証状態管理（ログイン/ログアウト/ユーザー情報）

## TODO一覧

```python
# TODO(F-0101): Firebase Auth連携 | AC: Email/OAuthログイン成功 | owner:@
# TODO(F-0102): プロフィールCRUD | AC: 表示名/研究分野の更新反映 | owner:@
# TODO(F-0103): JWT検証ミドルウェア | AC: 無効トークン→401、有効→uid抽出 | owner:@
```

## 備考

- プロジェクト共有機能は1次MVPでは除外（オーナーのみ）
- プロフィール画像はCloud Storage連携（後順位）
