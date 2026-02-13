"""
Firebase Auth JWT検証モジュール

FastAPIのDepends経由でJWTトークンを検証し、ユーザーIDを抽出します。
Firebase Admin SDKでIDトークンを検証します。
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

# Firestore初期化（Firebase Admin SDKのシングルトン初期化を含む）
import app.core.firestore  # noqa: F401 — side-effect import

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Firebase Auth JWTトークンを検証し、ユーザー情報を返す。

    Returns:
        dict: {"uid": str, "email": str, "name": str, "picture": str}

    Raises:
        HTTPException: トークンが無効な場合は401
    """
    token = credentials.credentials

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email", ""),
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
        }
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンが期限切れです。再ログインしてください。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンが無効化されています。再ログインしてください。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        import traceback
        print(f"Auth Error Detail: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"認証エラー: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
