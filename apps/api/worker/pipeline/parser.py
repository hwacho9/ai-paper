"""D-05: PDFパーサー"""
# TODO(F-0502): PDFパース | AC: テキスト+セクション抽出成功 | owner:@
def parse_pdf(paper_id: str) -> list[dict]:
    """GCSからPDFをダウンロードし、テキスト/セクションを抽出"""
    # TODO: PyMuPDF(fitz)でPDF→テキスト変換
    pass
