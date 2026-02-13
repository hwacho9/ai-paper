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
if not firebase_admin._apps:
    firebase_admin.initialize_app(
        options={"projectId": settings.gcp_project_id}
    )

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
    return _client
