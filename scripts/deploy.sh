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
API_CORS_ORIGINS="${CORS_ALLOW_ORIGINS:-*}"
API_SERVICE_ACCOUNT="${API_SERVICE_ACCOUNT:-api-sa@${PROJECT_ID}.iam.gserviceaccount.com}"
WEB_SERVICE_ACCOUNT="${WEB_SERVICE_ACCOUNT:-${API_SERVICE_ACCOUNT}}"
WORKER_SERVICE_ACCOUNT="${WORKER_SERVICE_ACCOUNT:-worker-sa@${PROJECT_ID}.iam.gserviceaccount.com}"

get_service_url() {
  local SERVICE_NAME="$1"
  gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format 'value(status.url)'
}

# ===== 関数 =====

deploy_api() {
  echo "🚀 APIサービスをデプロイ中..."
  local IMAGE="${REGISTRY}/api-service:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # ビルド + プッシュ（Cloud RunはAMD64のみ対応、provenance無効でOCI互換性確保）
  docker build --platform linux/amd64 --provenance=false -t "$IMAGE" -f "$ROOT_DIR/apps/api/Dockerfile" "$ROOT_DIR/apps/api"
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
    --set-env-vars "^@@^GCP_PROJECT_ID=${PROJECT_ID}@@GCP_REGION=${REGION}@@CORS_ALLOW_ORIGINS=${API_CORS_ORIGINS}" \
    --service-account "$API_SERVICE_ACCOUNT" \
    --ingress all \
    --allow-unauthenticated \
    --quiet

  echo "✅ APIデプロイ完了"
  get_service_url api-service
}

deploy_web() {
  echo "🚀 Webフロントエンドをデプロイ中..."
  local IMAGE="${REGISTRY}/web-service:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # APIのURLを取得
  local API_URL
  API_URL=$(get_service_url api-service 2>/dev/null || echo "")
  if [ -z "$API_URL" ]; then
    API_URL="${GCP_API_URL:-}"
  fi

  if [ -z "$API_URL" ]; then
    echo "❌ APIサービスのURLを取得できませんでした。先にAPIをデプロイするか、.env.deploy の GCP_API_URL を設定してください。"
    exit 1
  fi

  # ビルド + プッシュ（Cloud RunはAMD64のみ対応、provenance無効でOCI互換性確保）
  # NEXT_PUBLIC_* はビルド時にインライン化されるためbuild-argで渡す
  docker build --platform linux/amd64 --provenance=false \
    --build-arg NEXT_PUBLIC_API_URL="${API_URL}" \
    --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID:-}" \
    --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:-}" \
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
    --ingress all \
    --allow-unauthenticated \
    --service-account "$WEB_SERVICE_ACCOUNT" \
    --quiet

  echo "✅ Webデプロイ完了"
  get_service_url web-service
}

deploy_worker() {
  echo "🚀 Workerジョブをデプロイ中..."
  local IMAGE="${REGISTRY}/ingest-worker:$(git rev-parse --short HEAD 2>/dev/null || echo latest)"

  # ビルド + プッシュ（Cloud RunはAMD64のみ対応、provenance無効でOCI互換性確保）
  docker build --platform linux/amd64 --provenance=false -t "$IMAGE" -f "$ROOT_DIR/apps/api/Dockerfile.worker" "$ROOT_DIR/apps/api"
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
    --service-account "$WORKER_SERVICE_ACCOUNT" \
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
    --service-account "$WORKER_SERVICE_ACCOUNT" \
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
