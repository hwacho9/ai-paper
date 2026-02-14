#!/bin/bash
set -e  # エラー発生時に即停止

# 設定
# 強制的に ai-paper-be4fc を使用
PROJECT_ID="ai-paper-be4fc"
REGION="asia-northeast1"
REPO_NAME="paper-ingest"
IMAGE_NAME="paper-worker"
TAG="latest"

echo "Using Project ID: $PROJECT_ID"

# 1. Artifact Registry リポジトリ作成（なければ作成）
echo "Creating Artifact Registry repository if not exists..."
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for Paper Ingestion Worker" \
    --project=$PROJECT_ID || echo "Repository likely exists, continuing..."

# 2. Docker認証設定
# echo "Skipping Docker authentication (already configured in ~/.docker/config.json)..."
# gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
# gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://${REGION}-docker.pkg.dev

# 3. Cloud Build でビルド & プッシュ (ローカルDocker依存排除)
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${TAG}"

echo "Submitting build to Cloud Build: $IMAGE_URI"
# apiディレクトリでビルド実行
cd apps/api
gcloud builds submit --config cloudbuild.worker.yaml --substitutions=_IMAGE_URI=$IMAGE_URI .

echo "========================================"
echo "Build & Push Completed via Cloud Build!"
echo "Image URL: $IMAGE_URI"
echo "========================================"
