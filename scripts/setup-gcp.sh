#!/bin/bash
# ========================================
# GCPプロジェクト初期セットアップスクリプト
# ========================================
# 初回のみ実行: API有効化、Artifact Registry作成、サービスアカウント作成
# ========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env.deploy" ]; then
  source "$ROOT_DIR/.env.deploy"
fi

PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID が設定されていません}"
REGION="${GCP_REGION:-asia-northeast1}"
REPO="${GAR_REPO:-docker}"

echo "===== GCPプロジェクトセットアップ: ${PROJECT_ID} ====="

# 1. 必要なAPIを有効化
echo "📌 API有効化中..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com \
  storage.googleapis.com \
  --project "$PROJECT_ID"

# 2. Artifact Registry リポジトリ作成
echo "📦 Artifact Registryリポジトリ作成..."
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --project "$PROJECT_ID" \
  --quiet 2>/dev/null || echo "  (既に存在します)"

# 3. Docker認証設定
echo "🔑 Docker認証設定..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# 4. Pub/Subトピック作成
echo "📮 Pub/Subトピック作成..."
for topic in paper.ingest.requested paper.ingest.completed paper.ingest.failed; do
  gcloud pubsub topics create "$topic" --project "$PROJECT_ID" --quiet 2>/dev/null || echo "  トピック '$topic' は既に存在します"
done

# 5. サービスアカウント作成
echo "👤 サービスアカウント作成..."
for sa in api-sa worker-sa; do
  gcloud iam service-accounts create "$sa" \
    --display-name="${sa}" \
    --project "$PROJECT_ID" \
    --quiet 2>/dev/null || echo "  SA '${sa}' は既に存在します"
done

# 6. IAMロール付与
echo "🔐 IAMロール付与..."
for role in roles/datastore.user roles/storage.objectAdmin roles/pubsub.publisher roles/aiplatform.user roles/run.invoker; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:api-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$role" \
    --quiet 2>/dev/null || true
done

for role in roles/datastore.user roles/storage.objectAdmin roles/aiplatform.user; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:worker-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="$role" \
    --quiet 2>/dev/null || true
done

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "次のステップ:"
echo "  1. cp .env.deploy.example .env.deploy"
echo "  2. .env.deploy を編集して値を設定"
echo "  3. ./scripts/deploy.sh で全サービスをデプロイ"
