# D-01: 認証 & ユーザー（Auth & User）

## ドメイン概要

Firebase Auth ベースのログイン/セッション管理と、`users/{uid}` のプロフィール管理を担当するドメイン。

## 責務境界

- Firebase Auth によるログイン/会員登録（Email / OAuth）
- ユーザープロフィール（表示名、研究分野、設定情報）の管理
- サーバーサイド権限検査ミドルウェア

## 機能一覧

| 機能ID | 機能名                | 説明                               |
| ------ | --------------------- | ---------------------------------- |
| F-0101 | ログイン/会員登録     | Email/Password + Google OAuth 認証 |
| F-0102 | プロフィール照会/修正 | `/api/v1/me` でプロフィール取得/更新 |
| F-0103 | 権限検査              | FastAPI Depends で Firebase JWT 検証 |

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
- **説明**: 現在のユーザー情報を取得。`users/{uid}` が未作成なら初回アクセス時に自動作成
- **レスポンス**: `UserResponse`

### `PATCH /api/v1/me`

- **認証**: 必須
- **説明**: ユーザー情報を部分更新（`display_name` / `research_fields` / `preferences`）
- **リクエスト**: `UserUpdate`
- **レスポンス**: `UserResponse`

## スキーマ（Pydantic）

```python
class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: str = ""
    research_fields: list[str] = []
    created_at: datetime | None = None
    preferences: dict = {}

class UserUpdate(BaseModel):
    display_name: str | None = None
    research_fields: list[str] | None = None
    preferences: dict | None = None
```

## フロントエンド

### ページ

- `/login` — ログイン/新規登録ページ（Email/Password + Google OAuth）

### コンポーネント

- `AuthProvider` (`components/auth/auth-context.tsx`) — 認証状態とログイン/ログアウト操作を提供
- `AppSidebar` — サイドバー下部にユーザー情報表示とログアウトボタンを表示
- `/login` ページ内フォーム — ログインと新規登録の切替 UI

### フック

- `useAuth()` — Firebase認証状態管理（ログイン/ログアウト/ユーザー情報）

## 実装ステータス

- 実装済み: Firebase Auth連携（Email/Password、Google OAuth）
- 実装済み: JWT検証ミドルウェア（無効トークン時401）
- 実装済み: `/api/v1/me` 取得/更新 API
- 未実装（UI）: プロフィール編集画面（`PATCH /api/v1/me` をフロントから直接操作する画面）

## 備考

- プロジェクト共有機能は1次MVPでは除外（オーナーのみ）
- プロフィール画像はCloud Storage連携（後順位）
