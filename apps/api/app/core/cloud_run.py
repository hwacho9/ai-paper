"""
Cloud Run Jobs 実行ヘルパー
"""

import logging
from google.cloud import run_v2
from app.core.config import settings

logger = logging.getLogger(__name__)

async def execute_ingest_job(paper_id: str, owner_uid: str, request_id: str, pdf_url: str | None = None) -> None:
    """
    Cloud Run Jobs (Worker) を非同期実行する。
    
    Args:
        paper_id: 論文ID
        owner_uid: 所有者UID
        request_id: リクエストID
        pdf_url: 外部PDF URL (Auto-Ingest用)
    """
    if settings.run_ingest_locally:
        try:
            from worker.pipeline.ingest import run_ingest
            import asyncio
            # バックグラウンドで実行（FastAPIのイベントループをブロックしないように）
            asyncio.create_task(run_ingest(paper_id, owner_uid, request_id, pdf_url))
            logger.info(f"Local Ingest Job Started: {paper_id}")
            return
        except ImportError as e:
            logger.error(f"Local Ingest Failed: worker module not found. {e}")
            return
        except Exception as e:
            logger.error(f"Local Ingest Failed: {e}")
            return

    project_id = settings.gcp_project_id
    location = settings.gcp_region
    job_name = settings.cloud_run_job_name

    # ローカル開発などで設定がない場合はスキップ
    if not project_id or not job_name:
        logger.warning("Cloud Run Jobsの設定が不足しているため、Job実行をスキップします。")
        return

    try:
        # run_v2.JobsClient calls are synchronous gRPC calls usually, 
        # but we can run them in a thread if needed. 
        # For now, keeping it simple as it's just an API call.
        client = run_v2.JobsClient()
        
        # Jobのフルパス名: projects/{project}/locations/{location}/jobs/{job_name}
        name = client.job_path(project_id, location, job_name)
        
        env_vars = [
            {"name": "PAPER_ID", "value": paper_id},
            {"name": "OWNER_UID", "value": owner_uid},
            {"name": "REQUEST_ID", "value": request_id},
        ]
        
        if pdf_url:
            env_vars.append({"name": "PDF_URL", "value": pdf_url})
        
        # 環境変数の上書き設定
        overrides = {
            "container_overrides": [
                {
                    "env": env_vars
                }
            ]
        }

        request = run_v2.RunJobRequest(
            name=name,
            overrides=overrides
        )

        operation = client.run_job(request=request)
        logger.info(f"Cloud Run Job 実行開始: {operation.operation.name}")
        
    except Exception as e:
        logger.error(f"Cloud Run Job 実行失敗: {e}")
        # Job起動失敗はログに残すが、APIレスポンス自体は成功として返す（非同期のため）
