import os
import asyncio
import sys

# プロジェクトルートをパスに追加
sys.path.append(os.path.join(os.path.dirname(__file__), "../apps/api"))

from worker.main import main

if __name__ == "__main__":
    # テスト用環境変数設定 (必要に応じて書き換えてください)
    os.environ["PAPER_ID"] = "test-paper-id"
    os.environ["OWNER_UID"] = "test-owner-uid"
    os.environ["REQUEST_ID"] = "local-test-run"
    
    # .env読み込み (python-dotenvがインストールされていれば)
    try:
        from dotenv import load_dotenv
        load_dotenv("apps/api/.env")
    except ImportError:
        print("python-dotenv not found, skipping .env load")

    print(f"--- Local Ingest Test Start ---")
    print(f"PAPER_ID: {os.environ.get('PAPER_ID')}")
    print(f"OWNER_UID: {os.environ.get('OWNER_UID')}")
    
    try:
        asyncio.run(main())
        print("--- Local Ingest Test Completed Successfully ---")
    except SystemExit as e:
        if e.code != 0:
            print(f"--- Local Ingest Test Failed with exit code {e.code} ---")
        else:
            print("--- Local Ingest Test Completed (SystemExit 0) ---")
    except Exception as e:
        print(f"--- Local Ingest Test Failed: {e} ---")
