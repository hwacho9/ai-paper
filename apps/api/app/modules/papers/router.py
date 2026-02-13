"""
D-03: ペーパーライブラリ - ルーター

TODO(F-0301): 論文保存API | AC: ownerUid検証、重複防止 | owner:@
TODO(F-0302): PDF登録 | AC: GCSアップロード、Pub/Sub発行 | owner:@
TODO(F-0303): ライブラリ照会 | AC: ソート/フィルター/ページネーション | owner:@
TODO(F-0304): 論文詳細 | AC: メタ+状態+関連情報表示 | owner:@
TODO(F-0305): メモ自動生成 | AC: いいね時にメモ自動作成 | owner:@
"""

from fastapi import APIRouter, Depends

from app.core.firebase_auth import get_current_user
from app.modules.papers.schemas import PaperCreate, PaperResponse

router = APIRouter()


@router.post("/papers", response_model=PaperResponse)
async def create_paper(
    body: PaperCreate,
    current_user: dict = Depends(get_current_user),
):
    """論文メタデータ保存"""
    # TODO(F-0301): Firestoreに論文保存
    pass


@router.get("/papers")
async def list_papers(current_user: dict = Depends(get_current_user)):
    """ライブラリ一覧（いいね済み論文）"""
    # TODO(F-0303): ownerUidでフィルター、ソート/ページネーション
    return []


@router.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """論文詳細"""
    # TODO(F-0304): Firestoreから論文取得
    pass


@router.patch("/papers/{paper_id}", response_model=PaperResponse)
async def update_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """論文メタデータ更新"""
    # TODO(F-0301): Firestoreの論文更新
    pass


@router.delete("/papers/{paper_id}")
async def delete_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """論文削除"""
    # TODO(F-0301): Firestoreの論文削除
    pass


@router.post("/papers/{paper_id}/pdf")
async def upload_pdf(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """PDF登録（アップロードまたはURL）"""
    # TODO(F-0302): GCSにPDFアップロード→Pub/Subでingestイベント発行
    pass


@router.post("/papers/{paper_id}/like")
async def like_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """いいね保存"""
    # TODO(F-0305): いいね記録作成 + メモ自動生成
    return {"status": "liked"}


@router.delete("/papers/{paper_id}/like")
async def unlike_paper(
    paper_id: str,
    current_user: dict = Depends(get_current_user),
):
    """いいね解除"""
    # TODO: いいね記録削除
    return {"status": "unliked"}
