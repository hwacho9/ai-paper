"""
Core Storage Module
Wrapper for Firebase Cloud Storage operations.
"""
import logging
from fastapi import UploadFile
from firebase_admin import storage
from app.core.config import settings

logger = logging.getLogger(__name__)

def upload_file(file: UploadFile, destination_blob_name: str, content_type: str = "application/pdf") -> str:
    """
    Uploads a file to the configured Firebase Storage bucket.
    
    Args:
        file: The FastAPI UploadFile object.
        destination_blob_name: The path/name of the object in the bucket.
        content_type: The MIME type of the content.
        
    Returns:
        The public URL or authenticated URL of the uploaded blob.
    """
    try:
        bucket = storage.bucket(settings.gcs_bucket_name)
        blob = bucket.blob(destination_blob_name)
        
        # Reset file pointer just in case
        file.file.seek(0)
        
        logger.info(f"Starting upload to {destination_blob_name}")
        
        # Upload from file-like object
        blob.upload_from_file(file.file, content_type=content_type)
        
        logger.info(f"Upload complete: {destination_blob_name}")
        
        # Make public if needed, or return authenticated URL.
        # For now, we return the gs:// path or a public URL if readable.
        # Since this is an internal/private app, we might just want to return the path.
        # However, the frontend might need a way to view it.
        # For simple ingestion pipeline, we just need it in the crate.
        
        return f"gs://{settings.gcs_bucket_name}/{destination_blob_name}"

    except Exception as e:
        logger.error(f"Failed to upload file {destination_blob_name}: {e}")
        raise e
