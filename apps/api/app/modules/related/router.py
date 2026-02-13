"""
D-07: 関連グラフ - ルーター

TODO(F-0701): 関連論文推薦 | AC: ベクトル類似度ベース関連論文リスト | owner:@
TODO(F-0702): グラフデータ | AC: ノード/エッジJSONの生成・返却 | owner:@
"""

from fastapi import APIRouter, Depends
from app.core.firebase_auth import get_current_user
from app.modules.related.schemas import RelatedPaperResponse, GraphDataResponse

router = APIRouter()


@router.get("/papers/{paper_id}/related")
async def get_related_papers(paper_id: str, current_user: dict = Depends(get_current_user)):
    """関連論文リスト"""
    # TODO(F-0701): ベクトル類似度 + キーワード共有 + 引用メタで推薦
    return []


@router.get("/projects/{project_id}/graph", response_model=GraphDataResponse)
async def get_project_graph(project_id: str, current_user: dict = Depends(get_current_user)):
    """プロジェクトグラフデータ"""
    # TODO(F-0702): ノード/エッジデータ生成
    return GraphDataResponse(nodes=[], edges=[])
