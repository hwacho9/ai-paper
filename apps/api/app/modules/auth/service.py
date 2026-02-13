"""
D-01: 認証 & ユーザー - サービス

Firebase Auth認証情報とFirestoreユーザードキュメントを連携するサービスです。
初回ログイン時にユーザードキュメントを自動作成します。
"""

from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import UserResponse, UserUpdate


class AuthService:
    """認証・ユーザーサービス"""

    def __init__(self):
        self.repository = AuthRepository()

    async def get_or_create_user(self, token_data: dict) -> UserResponse:
        """
        ユーザーを取得。存在しなければ新規作成（初回ログイン時）。

        Args:
            token_data: Firebase JWTから取得したユーザー情報
                        {"uid", "email", "name", "picture"}

        Returns:
            UserResponse: ユーザー情報
        """
        uid = token_data["uid"]

        # Firestoreからユーザードキュメントを取得
        user_doc = await self.repository.get_by_uid(uid)

        if user_doc is None:
            # 初回ログイン: ユーザードキュメントを作成
            user_doc = await self.repository.create(uid, token_data)

        return UserResponse(
            uid=user_doc["uid"],
            email=user_doc.get("email", ""),
            display_name=user_doc.get("display_name", ""),
            photo_url=user_doc.get("photo_url", ""),
            research_fields=user_doc.get("research_fields", []),
            created_at=user_doc.get("created_at"),
            preferences=user_doc.get("preferences", {}),
        )

    async def update_user(self, uid: str, update: UserUpdate) -> UserResponse:
        """ユーザー情報を更新"""
        update_data = update.model_dump(exclude_none=True)
        user_doc = await self.repository.update(uid, update_data)

        return UserResponse(
            uid=user_doc["uid"],
            email=user_doc.get("email", ""),
            display_name=user_doc.get("display_name", ""),
            photo_url=user_doc.get("photo_url", ""),
            research_fields=user_doc.get("research_fields", []),
            created_at=user_doc.get("created_at"),
            preferences=user_doc.get("preferences", {}),
        )
