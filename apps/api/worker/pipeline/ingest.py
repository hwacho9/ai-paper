"""
D-05: パイプライン オーケストレーター

パース→チャンク→埋め込み→インデックスの順にパイプラインを実行する。
冪等（同じpaperIdで再実行可能）。
"""

import logging
import asyncio
from datetime import datetime, timezone
from google.cloud import firestore

from app.core.firestore import get_firestore_client
from app.core.config import settings
from worker.pipeline import parser, chunker, embedder, indexer

logger = logging.getLogger(__name__)

async def run_ingest(paper_id: str, owner_uid: str, request_id: str = "", pdf_url: str | None = None) -> None:
    """
    取り込みパイプラインを実行する。

    ステップ:
    1. Firestoreのstatus=INGESTINGに更新
    2. Firebase StorageからPDFダウンロード & パース
    3. チャンク生成
    4. Vertex AI Embedding生成
    5. Vector Searchインデックス更新
    6. Firestoreにチャンクデータ保存
    7. Firestoreのstatus=READYに更新
    """
    logger.info(f"[{request_id}] インジェスト開始: {paper_id}")
    db = get_firestore_client()
    
    # 1. Status Update: INGESTING
    await _update_status(db, paper_id, "INGESTING", request_id)

    try:
        # PDF Storage Path (定数化または引数で受けるのが理想だが、ここではルールベース)
        # 規則: papers/{uid}/{paperId}.pdf
        pdf_storage_path = f"papers/{owner_uid}/{paper_id}.pdf"

        # Auto-Ingest: Storageにファイルがなく、URLがある場合はダウンロードしてStorageに保存
        # parser.parse_pdf 内でダウンロードロジックを持つか、ここでやるか。
        # ここで「StorageになければURLから取得してStorageに保存」を行い、parserは常にStorageから読むのが綺麗。
        if pdf_url:
            await _ensure_pdf_in_storage(pdf_storage_path, pdf_url)

        # 2. Parse (Storageから)
        pages_data = parser.parse_pdf(paper_id, pdf_storage_path)
        logger.info(f"[{request_id}] Parse完了: {len(pages_data)} pages")

        # 3. Chunk
        chunks = chunker.create_chunks(pages_data)
        logger.info(f"[{request_id}] Chunk完了: {len(chunks)} chunks")

        # 4. Embed
        enriched_chunks = embedder.generate_embeddings(chunks)
        # Note: Embeddingコスト節約のため、ローカル開発ではMock化することもある
        logger.info(f"[{request_id}] Embed完了")

        # 5. Index
        indexer.upsert_index(paper_id, enriched_chunks, owner_uid)
        logger.info(f"[{request_id}] Index完了")

        # 6. Save Chunks to Firestore
        batch = db.batch()
        chunks_ref = db.collection("papers").document(paper_id).collection("chunks")
        
        # 既存チャンク削除はコストが高いので、上書きまたは追記とする。
        # 厳密にはDelete All -> Insertだが、ここでは追記(ID指定)のみ。
        count = 0
        for chunk in enriched_chunks:
            doc_ref = chunks_ref.document(chunk["chunk_id"])
            chunk_data = {
                "paperId": paper_id,
                "chunkId": chunk["chunk_id"],
                "text": chunk["text"],
                "pageNumber": chunk["page_number"],
                # embeddingはFirestoreには保存しない（サイズ制限回避 & Vector Searchにあるため）
                "tokenCount": len(chunk["text"]), # 簡易計算
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            batch.set(doc_ref, chunk_data)
            count += 1
            if count >= 400: # Firestore Batch Limit
                await batch.commit()
                batch = db.batch()
                count = 0
        
        if count > 0:
            await batch.commit()
            
        logger.info(f"[{request_id}] Firestore Save完了")

        # 7. Status Update: READY
        await _update_status(db, paper_id, "READY", request_id)
        logger.info(f"[{request_id}] インジェスト成功完了")

    except Exception as e:
        logger.error(f"[{request_id}] インジェスト失敗: {e}", exc_info=True)
        await _update_status(db, paper_id, "FAILED", request_id, error=str(e))
        raise e


async def _update_status(db, paper_id: str, status: str, request_id: str, error: str | None = None):
    """Firestoreのステータス更新"""
    doc_ref = db.collection("papers").document(paper_id)
    update_data = {
        "status": status,
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "lastRequestId": request_id
    }
    
    if status == "INGESTING":
        update_data["startedAt"] = firestore.SERVER_TIMESTAMP
    
    if error:
        update_data["error"] = error
        
    await doc_ref.update(update_data)


async def _ensure_pdf_in_storage(storage_path: str, pdf_url: str) -> None:
    """
    Storageにファイルが存在しない場合、URLからダウンロードして保存する。
    """
    from firebase_admin import storage
    import httpx
    
    bucket_name = settings.gcs_bucket_name
    logger.info(f"Target Bucket: {bucket_name}, Path: {storage_path}")
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(storage_path)

    # 既に存在するかチェック
    if blob.exists():
        logger.info(f"PDFは既にStorageに存在します: {storage_path}")
        return

    logger.info(f"PDFを外部URLからダウンロード開始: {pdf_url}")
    
    async with httpx.AsyncClient() as client:
        # User-Agentを設定しないと拒否されるサイトがあるため設定
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/pdf,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        response = await client.get(pdf_url, headers=headers, follow_redirects=True, timeout=30.0)
        response.raise_for_status()
        pdf_content = response.content

    logger.info(f"PDFをStorageにアップロード開始: {len(pdf_content)} bytes")
    
    # 同期アップロード (blob.upload_from_string is sync)
    # 完全に非同期にするなら run_in_executor だが、Workerなので許容
    blob.upload_from_string(pdf_content, content_type="application/pdf")
    
    logger.info(f"PDFアップロード完了: {storage_path}")
