"""D-05: チャンク生成"""

import uuid
import logging

logger = logging.getLogger(__name__)

# 定数
CHUNK_SIZE = 1000  # 文字数ベース（トークン数ではないが簡易実装）
CHUNK_OVERLAP = 200

def create_chunks(pages_data: list[dict]) -> list[dict]:
    """
    ページデータから重複チャンクを生成する。
    
    Args:
        pages_data: parse_pdfの戻り値
        
    Returns:
        list[dict]: チャンクリスト
        [
            {
                "chunk_id": "uuid",
                "text": "...",
                "page_number": 1,
                "start_char_idx": 0,
                "end_char_idx": 1000
            }
        ]
    """
    chunks = []
    
    for page in pages_data:
        text = page["text"]
        page_num = page["page_number"]
        
        # テキストが短い場合はそのまま
        if len(text) <= CHUNK_SIZE:
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": text,
                "page_number": page_num,
                "start_char_idx": 0,
                "end_char_idx": len(text)
            })
            continue

        # スライディングウィンドウ
        start = 0
        while start < len(text):
            end = start + CHUNK_SIZE
            chunk_text = text[start:end]
            
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": chunk_text,
                "page_number": page_num,
                "start_char_idx": start,
                "end_char_idx": min(end, len(text))
            })
            
            start += (CHUNK_SIZE - CHUNK_OVERLAP)

    logger.info(f"チャンク生成完了: 全{len(chunks)}チャンク")
    return chunks
