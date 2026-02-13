# 論文管理サービス（Research Paper Manager）

論文検索/保存(いいね)/メモ/関連研究選択を通じて、ユーザーが「マイペーパープロジェクト」を作成・管理するWebサービス。

## 技術スタック

| レイヤー       | 技術                                            |
| -------------- | ----------------------------------------------- |
| フロントエンド | Next.js (TypeScript) + shadcn/ui + Tailwind CSS |
| バックエンド   | FastAPI (Python) → Docker → Cloud Run           |
| データベース   | Firestore                                       |
| ストレージ     | Cloud Storage                                   |
| 非同期処理     | Pub/Sub + Cloud Run Jobs                        |
| AI/検索        | Vertex AI (Gemini/Embeddings) + Vector Search   |
| 認証           | Firebase Auth                                   |

## ディレクトリ構成

```
├── apps/
│   ├── web/          # Next.js フロントエンド
│   └── api/          # FastAPI バックエンド + Worker
├── packages/
│   └── shared/       # 共有型/スキーマ
├── infra/            # Cloud Run/Jobs/PubSub/GCS/Firestore/IAM スペック
├── scripts/          # デプロイ/セットアップスクリプト
├── docs/             # ドメイン別機能書・設計ドキュメント
├── docker-compose.yml  # ローカル開発用
└── .agent/workflows/ # 開発スキル/ワークフロー
```

## ローカル起動（Docker Compose）

```bash
# 全サービス起動（API + Web）
docker compose up

# バックグラウンド起動
docker compose up -d

# ログ確認
docker compose logs -f api

# 停止
docker compose down
```

- Web: http://localhost:3000
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

> ℹ️ ホットリロード有効: `apps/web/src` と `apps/api/app` の変更は自動反映されます。

## Cloud Run デプロイ

```bash
# 初回のみGCPセットアップ
./scripts/setup-gcp.sh

# 全サービスデプロイ
./scripts/deploy.sh

# 個別デプロイ
./scripts/deploy.sh api
./scripts/deploy.sh web
./scripts/deploy.sh worker
```

> ⚠️ 事前に `.env.deploy.example` → `.env.deploy` をコピーして `GCP_PROJECT_ID` を設定してください。

## ドキュメント

- [ドキュメントポータル](./docs/README.md)
- [Firestoreスキーマ設計](./docs/firestore-schema.md)
- [API仕様書](./docs/api-contracts.md)
- [プロジェクト仕様書](./プロジェクト_サービス_構造_及び_ドメイン別_機能書.md)
