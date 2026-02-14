"""
Firestoreクライアント管理モジュール

Firestoreクライアントのシングルトンインスタンスを提供します。
Firebase Admin SDKを初期化し、Firestoreクライアントを管理します。
"""

import firebase_admin
from firebase_admin import credentials
from google.cloud import firestore

from app.core.config import settings

# Firebase Admin SDK初期化（シングルトン）
try:
    if not firebase_admin._apps:
        # 開発環境でCredentialが必要な場合 (Google Cloud以外で実行時)
        # しかし、ADC (Application Default Credentials) があれば自動で読まれる
        cred = None
        # settings.google_application_credentials があれば使うロジックなど
        
        firebase_admin.initialize_app(
            credential=cred,
            options={"projectId": settings.gcp_project_id}
        )
        print(f"Firebase Admin Initialized: {settings.gcp_project_id}")
except Exception as e:
    print(f"Firebase Admin Init Error: {e}")

_client: firestore.AsyncClient | None = None


def get_firestore_client() -> firestore.AsyncClient:
    """
    Firestoreクライアントのシングルトンインスタンスを返す。

    Returns:
        firestore.AsyncClient: Firestoreクライアント
    """
    global _client
    if _client is None:
        _client = firestore.AsyncClient(
            project=settings.gcp_project_id,
            database=settings.firestore_db,
        )
        print(f"Firestore Client Created: {settings.gcp_project_id}")
    return _client
