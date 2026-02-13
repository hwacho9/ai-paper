"""
論文管理サービス - FastAPI メインアプリケーション

このモジュールはFastAPIアプリケーションのエントリーポイントです。
CORS設定、ルーターマウント、ヘルスチェックエンドポイントを含みます。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.auth.router import router as auth_router

# TODO: 各ドメインルーターのインポートを追加
# from app.modules.papers.router import router as papers_router
# from app.modules.projects.router import router as projects_router
# from app.modules.search.router import router as search_router
# from app.modules.memos.router import router as memos_router
# from app.modules.keywords.router import router as keywords_router
# from app.modules.related.router import router as related_router
# from app.modules.reading.router import router as reading_router
# from app.modules.tex.router import router as tex_router

app = FastAPI(
    title="論文管理サービス API",
    description="論文検索/保存/メモ/関連研究管理のためのAPI",
    version="0.1.0",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["ヘルスチェック"])
async def healthz():
    """ヘルスチェックエンドポイント（認証不要）"""
    return {"status": "ok"}


# --- ルーターマウント ---
app.include_router(auth_router, prefix="/api/v1", tags=["認証"])
# TODO: 各ドメインルーターをマウント
# app.include_router(papers_router, prefix="/api/v1", tags=["論文"])
# app.include_router(projects_router, prefix="/api/v1", tags=["プロジェクト"])
# app.include_router(search_router, prefix="/api/v1", tags=["検索"])
# app.include_router(memos_router, prefix="/api/v1", tags=["メモ"])
# app.include_router(keywords_router, prefix="/api/v1", tags=["キーワード"])
# app.include_router(related_router, prefix="/api/v1", tags=["関連"])
# app.include_router(reading_router, prefix="/api/v1", tags=["読解サポート"])
# app.include_router(tex_router, prefix="/api/v1", tags=["TeX"])
