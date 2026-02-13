# IAMポリシー / サービスアカウント設計

## サービスアカウント

### api-sa（APIサービス用）

| ロール                      | 用途                                      |
| --------------------------- | ----------------------------------------- |
| `roles/datastore.user`      | Firestoreアクセス                         |
| `roles/storage.objectAdmin` | Cloud Storage（開発時、本番は最小権限に） |
| `roles/pubsub.publisher`    | Pub/Subメッセージ発行                     |
| `roles/aiplatform.user`     | Vertex AI呼び出し                         |
| `roles/run.invoker`         | Cloud Run Jobs実行（APIからWorker起動時） |

### worker-sa（Workerジョブ用）

| ロール                      | 用途                         |
| --------------------------- | ---------------------------- |
| `roles/datastore.user`      | Firestoreアクセス            |
| `roles/storage.objectAdmin` | Cloud Storage（PDF読み取り） |
| `roles/aiplatform.user`     | Vertex AI Embeddings呼び出し |

## 作成コマンド

```bash
# サービスアカウント作成
gcloud iam service-accounts create api-sa --display-name="API Service Account"
gcloud iam service-accounts create worker-sa --display-name="Worker Service Account"

# ロール付与（例）
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:api-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```
