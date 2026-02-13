---
description: フロントエンド開発ルール（Next.js + shadcn/ui + Tailwind）
---

# フロントエンド開発スキル

## 技術スタック

- **フレームワーク**: Next.js (App Router) + TypeScript
- **UIライブラリ**: shadcn/ui + Tailwind CSS
- **状態管理**: React hooks + Context（必要に応じてZustand）
- **API通信**: typed fetch wrapper (`src/lib/api-client.ts`)
- **バリデーション**: zod スキーマ
- **認証**: Firebase Auth SDK

## ディレクトリ構成

```
apps/web/src/
├── app/                    # App Router ページ
│   ├── layout.tsx          # 共通レイアウト + AuthProvider
│   ├── page.tsx            # ランディング/ダッシュボード
│   ├── (auth)/login/       # ログインページ
│   ├── search/             # 検索ページ
│   ├── papers/[id]/        # 論文詳細
│   ├── library/            # マイペーパーライブラリ
│   ├── memos/              # メモ一覧
│   ├── projects/           # プロジェクト一覧
│   ├── projects/[id]/      # プロジェクト詳細
│   └── projects/[id]/graph/ # グラフビュー
├── components/
│   ├── ui/                 # shadcn/ui（自動生成）
│   ├── common/             # サービス共通（Toast, Skeleton, EmptyState）
│   ├── search/             # 検索関連
│   ├── papers/             # 論文カード/詳細
│   ├── library/            # ライブラリ関連
│   ├── memos/              # メモ関連
│   ├── projects/           # プロジェクト関連
│   └── graph/              # グラフビュー
├── lib/
│   ├── api-client.ts       # API fetch wrapper
│   ├── firebase.ts         # Firebase初期化
│   └── utils.ts            # ユーティリティ
├── hooks/
│   ├── use-auth.ts         # 認証フック
│   └── use-api.ts          # API呼び出しフック
└── types/
    └── index.ts            # 型定義
```

## 開発ルール

### コンポーネント設計

1. UIは **shadcn/ui** を基本とする。カスタムコンポーネントは `components/common/` にのみ作成
2. 各ページは `loading.tsx` と `error.tsx` を持つ（App Router規約）
3. 状態表現は統一パターンを使用:
   - ローディング: `<LoadingSkeleton />`
   - エラー: `<ErrorBoundary />` + Toast通知
   - 空状態: `<EmptyState />`

### API通信

1. すべてのAPI呼び出しは `src/lib/api-client.ts` の単一クライアントを使用
2. レスポンスはzodスキーマでバリデーション
3. 認証トークンは自動的にヘッダーに付与

### スタイリング

1. Tailwind CSSを基本とする
2. 画面別スタイルはコンポーネントにカプセル化
3. テーマトークンは `tailwind.config.ts` で一元管理

### アクセシビリティ

1. キーボードフォーカス管理（tabIndex, aria属性）
2. レスポンシブ対応（モバイル〜デスクトップ）
3. shadcn/uiのアクセシビリティ機能を活用

## TODOフォーマット

```
// TODO(F-xxxx, MIRO:ノードID): 作業要約 | AC:完了条件 | owner:@
```

## ページ実装手順

1. `app/` にページファイル作成
2. 必要なshadcn/uiコンポーネントをインストール（`npx shadcn@latest add <component>`）
3. ページ固有コンポーネントを `components/<domain>/` に作成
4. API呼び出しフックを `hooks/` に作成
5. ローディング/エラー/空状態のハンドリングを追加
6. レスポンシブ対応を確認

## shadcn/uiコンポーネント追加手順

// turbo

```bash
cd apps/web && npx shadcn@latest add <component-name>
```
