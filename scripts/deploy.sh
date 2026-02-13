#!/bin/bash
# ========================================
# Cloud Run デプロイスクリプト
# ========================================
# 使用方法:
#   ./scripts/deploy.sh            # 全サービスデプロイ
#   ./scripts/deploy.sh api        # APIのみ
#   ./scripts/deploy.sh web        # Webのみ
#   ./scripts/deploy.sh worker     # Workerのみ
# ========================================

set -euo pipefail

# ===== 設定 =====
# .env.deploy から読み込み、なければ環境変数を使用
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env.deploy" ]; then
  source "$ROOT_DIR/.env.deploy"
fi

PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID が設定されていません}"
REGION="${GCP_REGION:-asia-northeast1}"
REPO="${GAR_REPO:-docker}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

# ===== 関数 =====

deploy_api() {
  echo "🚀 APIサービスをデプロイ中..."
  local IMAGE="${REGISTRY}/api-service:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # ビルド + プッシュ
  docker build -t "$IMAGE" -f "$ROOT_DIR/apps/api/Dockerfile" "$ROOT_DIR/apps/api"
  docker push "$IMAGE"

  # Cloud Run デプロイ
  gcloud run deploy api-service \
    --image "$IMAGE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --platform managed \
    --port 8080 \
    --cpu 1 \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 60s \
    --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID},GCP_REGION=${REGION}" \
    --allow-unauthenticated \
    --quiet

  echo "✅ APIデプロイ完了"
  gcloud run services describe api-service --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)'
}

deploy_web() {
  echo "🚀 Webフロントエンドをデプロイ中..."
  local IMAGE="${REGISTRY}/web-service:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # APIのURLを取得
  local API_URL
  API_URL=$(gcloud run services describe api-service --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)' 2>/dev/null || echo "")

  # ビルド + プッシュ
  docker build \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    -t "$IMAGE" \
    -f "$ROOT_DIR/apps/web/Dockerfile" "$ROOT_DIR/apps/web"
  docker push "$IMAGE"

  # Cloud Run デプロイ
  gcloud run deploy web-service \
    --image "$IMAGE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --platform managed \
    --port 3000 \
    --cpu 1 \
    --memory 512Mi \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 60s \
    --allow-unauthenticated \
    --quiet

  echo "✅ Webデプロイ完了"
  gcloud run services describe web-service --region "$REGION" --project "$PROJECT_ID" --format 'value(status.url)'
}

deploy_worker() {
  echo "🚀 Workerジョブをデプロイ中..."
  local IMAGE="${REGISTRY}/ingest-worker:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # ビルド + プッシュ
  docker build -t "$IMAGE" -f "$ROOT_DIR/apps/api/Dockerfile.worker" "$ROOT_DIR/apps/api"
  docker push "$IMAGE"

  # Cloud Run Jobs デプロイ
  gcloud run jobs create ingest-worker \
    --image "$IMAGE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --cpu 2 \
    --memory 2Gi \
    --task-timeout 1800s \
    --max-retries 3 \
    --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID},GCP_REGION=${REGION}" \
    --quiet 2>/dev/null || \
  gcloud run jobs update ingest-worker \
    --image "$IMAGE" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --cpu 2 \
    --memory 2Gi \
    --task-timeout 1800s \
    --max-retries 3 \
    --set-env-vars "GCP_PROJECT_ID=${PROJECT_ID},GCP_REGION=${REGION}" \
    --quiet

  echo "✅ Workerデプロイ完了"
}

# ===== メイン =====
TARGET="${1:-all}"

case "$TARGET" in
  api)    deploy_api ;;
  web)    deploy_web ;;
  worker) deploy_worker ;;
  all)
    deploy_api
    deploy_web
    deploy_worker
    echo ""
    echo "🎉 全サービスデプロイ完了！"
    ;;
  *)
    echo "使用方法: $0 [api|web|worker|all]"
    exit 1
    ;;
esac
