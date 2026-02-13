---
description: バックエンド開発ルール（FastAPI + Cloud Run + Firestore）
---

# バックエンド開発スキル

## 技術スタック

- **フレームワーク**: FastAPI (Python 3.11+)
- **デプロイ**: Docker コンテナ → Cloud Run Service
- **認証**: Firebase Auth JWT 検証（ミドルウェア/Depends）
- **データベース**: Firestore（ownerUid ベースACL）
- **ストレージ**: Cloud Storage（PDF・パース成果物）
- **イベント**: Pub/Sub（非同期パイプラインへの通知）
- **AI**: Vertex AI（Gemini / Embeddings）

## ディレクトリ構成

```
apps/api/
├── app/
│   ├── main.py                 # FastAPIアプリ + CORS + ルーターマウント + /healthz
│   ├── core/
│   │   ├── config.py           # 環境変数/設定（Pydantic Settings）
│   │   ├── firebase_auth.py    # JWT検証 Depends
│   │   └── firestore.py        # Firestoreクライアント（シングルトン）
│   ├── modules/
│   │   ├── auth/               # D-01: 認証/ユーザー
│   │   ├── projects/           # D-02: マイペーパープロジェクト
│   │   ├── papers/             # D-03: ペーパーライブラリ
│   │   ├── search/             # D-04: 論文検索
│   │   ├── memos/              # D-08: メモ/ノート
│   │   ├── keywords/           # D-06: キーワード/タグ
│   │   ├── related/            # D-07: 関連グラフ
│   │   ├── reading/            # D-09: 読解サポート
│   │   └── tex/                # D-10: TeX/BibTeX
│   └── __init__.py
├── worker/                     # D-05: パイプラインワーカー
├── tests/
├── Dockerfile
├── Dockerfile.worker
├── requirements.txt
├── pyproject.toml
└── .env.example
```

## モジュール構成（各ドメイン共通）

各ドメインモジュールは以下の4ファイルで構成:

| ファイル        | 責務                                    |
| --------------- | --------------------------------------- |
| `router.py`     | APIエンドポイント定義（FastAPI Router） |
| `service.py`    | ビジネスロジック                        |
| `schemas.py`    | Pydantic DTO（Request/Response）        |
| `repository.py` | Firestore CRUD操作                      |

## 開発ルール

### API設計

1. すべてのエンドポイントは `/api/v1/` プレフィックスを使用
2. `/healthz` は認証不要で `200` を返す
3. エラーレスポンスは統一フォーマット:
   ```json
   { "detail": "エラーメッセージ", "code": "ERROR_CODE" }
   ```

### 認証・権限

1. Firebase Auth JWT を `Depends(get_current_user)` で検証
2. すべてのデータは `ownerUid` ベースでアクセス制御
3. 他ユーザーのデータへのアクセスは `403 Forbidden`

### Firestoreルール

1. コレクション名は小文字スネークケース（例: `papers`, `project_papers`）
2. ドキュメントIDはFirestore自動生成を基本とする
3. 複合クエリが必要な場合は `infra/firestore-indexes.json` にインデックス定義

### Pydanticスキーマ

1. Request: `XxxCreate`, `XxxUpdate`
2. Response: `XxxResponse`, `XxxListResponse`
3. 共通: `PaginationParams`, `ErrorResponse`

### 非同期連携

1. PDF登録時は `paper.ingest.requested` イベントをPub/Subに発行
2. ペイロード: `{"paperId": "...", "ownerUid": "...", "pdfUrl": "..."}`

## Docker設定

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

## Cloud Run配備パラメータ

- CPU: 1 vCPU / メモリ: 512MB〜1GB
- 同時実行数: 20〜80
- タイムアウト: 30〜60秒
- 最小インスタンス: 開発=0, 本番=0〜1

## TODOフォーマット

```python
# TODO(F-xxxx, MIRO:ノードID): 作業要約 | AC:完了条件 | owner:@
```

## テスト実行手順

// turbo

```bash
cd apps/api && pip install -r requirements.txt && pytest tests/ -v
```

## ローカル起動手順

// turbo

```bash
cd apps/api && uvicorn app.main:app --reload --port 8000
```
