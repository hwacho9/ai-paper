"""D-05: PDFパーサー"""

import logging
import tempfile
import fitz  # PyMuPDF
from firebase_admin import storage
from app.core.config import settings

logger = logging.getLogger(__name__)


def parse_pdf(paper_id: str, pdf_storage_path: str) -> list[dict]:
    """
    Firebase StorageからPDFをダウンロードし、テキストを抽出する。

    Args:
        paper_id: 論文ID
        pdf_storage_path: Storage上のパス (e.g. "papers/{uid}/{paperId}.pdf")

    Returns:
        list[dict]: ページごとのテキストデータ
        [
            {
                "page_number": 1,
                "text": "...",
                "sections": [] # 将来的にはセクション構造も
            },
            ...
        ]
    """
    logger.info(f"PDFパース開始: {paper_id} (path={pdf_storage_path})")

    # バケット取得
    bucket_name = settings.gcs_bucket_name
    logger.info(f"Downloading from Bucket: {bucket_name}, Path: {pdf_storage_path}")
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(pdf_storage_path)

    # 一時ファイルにダウンロード
    with tempfile.NamedTemporaryFile(suffix=".pdf") as temp_pdf:
        logger.info(f"PDFダウンロード中: {bucket_name}/{pdf_storage_path}")
        blob.download_to_filename(temp_pdf.name)
        
        # PyMuPDFで開く
        doc = fitz.open(temp_pdf.name)
        pages_data = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            # 空ページはスキップするか、空文字で残すか。ここでは残す。
            pages_data.append({
                "page_number": page_num + 1,
                "text": text,
            })

    logger.info(f"PDFパース完了: 全{len(pages_data)}ページ")
    return pages_data
