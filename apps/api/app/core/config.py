"""
アプリケーション設定モジュール

環境変数からの設定読み込みをPydantic Settingsで管理します。
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    # GCPプロジェクト設定
    gcp_project_id: str = ""
    gcp_region: str = "asia-northeast1"

    # Firestore
    firestore_db: str = "default"

    # Cloud Storage
    gcs_bucket_pdf: str = ""

    # Pub/Sub
    pubsub_topic_ingest: str = "paper.ingest.requested"

    # Cloud Run Jobs
    cloud_run_job_name: str | None = None
    run_ingest_locally: bool = False

    # Vertex AI
    vertex_location: str = "asia-northeast1"
    vector_index_id: str = ""

    # CORS
    cors_allow_origins: str = "http://localhost:3000"

    # Semantic Scholar
    # semantic_scholar_api_key is explicitly disabled per user request
    # semantic_scholar_api_key: str | None = None

    # Google API Key (Vertex AI / Gemini)
    google_api_key: str | None = None

    # PubMed API Key
    pubmed_api_key: str | None = None

    @property
    def cors_allow_origins_list(self) -> list[str]:
        """CORS許可オリジンをリストで返す"""
        return [origin.strip() for origin in self.cors_allow_origins.split(",")]

    @property
    def gcs_bucket_name(self) -> str:
        """GCSバケット名 (gs:// プレフィックスを除去)"""
        if self.gcs_bucket_pdf.startswith("gs://"):
            return self.gcs_bucket_pdf[5:]
        return self.gcs_bucket_pdf

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# シングルトンインスタンス
settings = Settings()
semantic_scholar_api_key: str | None = None
