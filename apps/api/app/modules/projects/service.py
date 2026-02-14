"""D-02: プロジェクト - サービス"""

import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote
import re

from firebase_admin import storage
from fastapi import HTTPException, status
from app.core.config import settings
from app.modules.projects.repository import ProjectRepository
from app.modules.papers.repository import PaperRepository


class ProjectService:
    """プロジェクトビジネスロジック"""

    def __init__(self):
        self.repository = ProjectRepository()
        self.paper_repository = PaperRepository()

    async def create_project(self, owner_uid: str, data: dict) -> dict:
        """プロジェクト作成（seed papers対応）"""
        project = await self.repository.create({
            "owner_uid": owner_uid,
            "title": data["title"],
            "description": data.get("description", ""),
        })

        await self._ensure_tex_workspace_defaults(
            owner_uid=owner_uid,
            project_id=project["id"],
            title=data.get("title", "My Project"),
        )

        # seedPaperIdsがある場合、参照論文も追加
        seed_ids = data.get("seed_paper_ids", [])
        for paper_id in seed_ids:
            await self.repository.add_paper(project["id"], {"paper_id": paper_id})

        if seed_ids:
            project["paper_count"] = len(seed_ids)
            await self._sync_project_references_bib(project["id"], owner_uid)

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

        return project

    async def get_project(self, project_id: str, owner_uid: str) -> dict:
        """プロジェクト詳細取得"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return project

    async def list_projects(self, owner_uid: str) -> list[dict]:
        """プロジェクト一覧"""
        return await self.repository.list_by_owner(owner_uid)

    async def update_project(self, project_id: str, owner_uid: str, data: dict) -> dict:
        """プロジェクト更新"""
        project = await self.repository.update(project_id, owner_uid, data)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return project

    async def delete_project(self, project_id: str, owner_uid: str) -> None:
        """プロジェクト削除"""
        deleted = await self.repository.delete(project_id, owner_uid)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

    async def add_paper(self, project_id: str, paper_id: str, owner_uid: str, note: str = "", role: str = "reference") -> dict:
        """参照論文追加"""
        # オーナー検証
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        result = await self.repository.add_paper(project_id, {
            "paper_id": paper_id,
            "note": note,
            "role": role,
        })
        
        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)
        
        await self._sync_project_references_bib(project_id, owner_uid)
        return result

    async def remove_paper(self, project_id: str, paper_id: str, owner_uid: str) -> None:
        """参照論文削除"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        removed = await self.repository.remove_paper(project_id, paper_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="論文が見つかりません。",
            )
        await self._sync_project_references_bib(project_id, owner_uid)

        # Invalidate Graph Cache
        from app.modules.related.service import related_service
        await related_service.invalidate_user_graph_cache(owner_uid)

    async def get_project_papers(self, project_id: str, owner_uid: str) -> list[dict]:
        """プロジェクトの参照論文一覧"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        return await self.repository.get_project_papers(project_id)

    def _project_tex_prefix(self, owner_uid: str, project_id: str) -> str:
        return f"projects/{owner_uid}/{project_id}/tex/"

    def _bucket(self):
        return storage.bucket(settings.gcs_bucket_name)

    async def _ensure_tex_workspace_defaults(
        self, owner_uid: str, project_id: str, title: str = "My Project"
    ) -> None:
        """TeXワークスペースの初期ファイルを作成（存在しない場合のみ）"""
        prefix = self._project_tex_prefix(owner_uid, project_id)
        bucket = self._bucket()

        main_blob = bucket.blob(f"{prefix}main.tex")
        if not main_blob.exists():
            main_tex = (
                "\\documentclass{article}\n"
                "\\usepackage[utf8]{inputenc}\n"
                "\\usepackage[T1]{fontenc}\n"
                "\\usepackage{lmodern}\n"
                "\\usepackage{biblatex}\n"
                "\\addbibresource{references.bib}\n\n"
                f"\\title{{{title}}}\n"
                "\\author{}\n"
                "\\date{}\n\n"
                "\\begin{document}\n"
                "\\maketitle\n\n"
                "\\section{Introduction}\n\n"
                "Write your draft here.\n\n"
                "\\printbibliography\n"
                "\\end{document}\n"
            )
            main_blob.upload_from_string(main_tex, content_type="text/x-tex")

        bib_blob = bucket.blob(f"{prefix}references.bib")
        if not bib_blob.exists():
            bib_blob.upload_from_string(
                "% Auto-generated bibliography for this project.\n",
                content_type="text/x-bibtex",
            )

    async def _ensure_main_tex_bibliography_setup(
        self, owner_uid: str, project_id: str
    ) -> None:
        """既存main.texにbiblatex設定が無ければ自動補完する"""
        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}main.tex"
        blob = self._bucket().blob(blob_name)
        if not blob.exists():
            return

        raw = blob.download_as_bytes()
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            return

        updated = content
        changed = False

        if "\\usepackage{biblatex}" not in updated:
            changed = True
            if "\\begin{document}" in updated:
                updated = updated.replace(
                    "\\begin{document}",
                    "\\usepackage{biblatex}\n\\addbibresource{references.bib}\n\n\\begin{document}",
                    1,
                )
            else:
                updated = (
                    "\\usepackage{biblatex}\n\\addbibresource{references.bib}\n\n"
                    + updated
                )
        elif "\\addbibresource{references.bib}" not in updated:
            changed = True
            if "\\usepackage{biblatex}" in updated:
                updated = updated.replace(
                    "\\usepackage{biblatex}",
                    "\\usepackage{biblatex}\n\\addbibresource{references.bib}",
                    1,
                )

        if "\\printbibliography" not in updated:
            changed = True
            if "\\end{document}" in updated:
                updated = updated.replace(
                    "\\end{document}",
                    "\n\\printbibliography\n\\end{document}",
                    1,
                )
            else:
                updated += "\n\n\\printbibliography\n"

        if changed:
            blob.upload_from_string(updated.encode("utf-8"), content_type="text/x-tex")

    def _make_bib_key(self, paper: dict, used: set[str]) -> str:
        paper_id = re.sub(r"[^a-zA-Z0-9:_-]", "", str(paper.get("id") or ""))
        if paper_id:
            key = paper_id
        else:
            title = (paper.get("title") or "").lower()
            year = str(paper.get("year") or "")
            first = re.sub(r"[^a-z0-9]", "", (title.split(" ")[0] if title else "paper"))
            key = f"{first or 'paper'}{year}"
        if key not in used:
            used.add(key)
            return key
        idx = 2
        while f"{key}{idx}" in used:
            idx += 1
        final = f"{key}{idx}"
        used.add(final)
        return final

    def _paper_to_bib_entry(self, key: str, paper: dict) -> str:
        title = (paper.get("title") or "").replace("{", "\\{").replace("}", "\\}")
        authors = paper.get("authors") or []
        author_str = " and ".join(authors) if authors else "Unknown"
        year = str(paper.get("year") or "")
        venue = paper.get("venue") or ""
        doi = paper.get("doi") or ""
        arxiv_id = paper.get("arxiv_id") or ""

        fields = [
            f"  title = {{{title}}}",
            f"  author = {{{author_str}}}",
        ]
        if year:
            fields.append(f"  year = {{{year}}}")
        if venue:
            fields.append(f"  journal = {{{venue}}}")
        if doi:
            fields.append(f"  doi = {{{doi}}}")
        if arxiv_id:
            fields.append(f"  eprint = {{{arxiv_id}}}")
            fields.append("  archivePrefix = {arXiv}")

        return "@article{" + key + ",\n" + ",\n".join(fields) + "\n}"

    async def _sync_project_references_bib(self, project_id: str, owner_uid: str) -> None:
        """プロジェクト参照論文から references.bib を再生成する"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            return

        await self._ensure_tex_workspace_defaults(
            owner_uid=owner_uid,
            project_id=project_id,
            title=project.get("title", "My Project"),
        )
        await self._ensure_main_tex_bibliography_setup(owner_uid, project_id)

        project_papers = await self.repository.get_project_papers(project_id)
        paper_ids = [p.get("paper_id") for p in project_papers if p.get("paper_id")]
        papers = await self.paper_repository.get_papers_by_ids(paper_ids)
        papers.sort(key=lambda p: ((p.get("year") or 0), p.get("title") or ""))

        used_keys: set[str] = set()
        entries = [self._paper_to_bib_entry(self._make_bib_key(p, used_keys), p) for p in papers]
        content = (
            "% Auto-generated bibliography for this project.\n\n"
            + ("\n\n".join(entries) if entries else "")
            + ("\n" if entries else "")
        )

        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}references.bib"
        self._bucket().blob(blob_name).upload_from_string(
            content,
            content_type="text/x-bibtex",
        )

    async def list_tex_files(self, project_id: str, owner_uid: str) -> list[dict]:
        """プロジェクトのTeXワークスペース内ファイル一覧"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )

        prefix = self._project_tex_prefix(owner_uid, project_id)
        bucket = self._bucket()
        blobs = bucket.list_blobs(prefix=prefix)
        files: list[dict] = []
        for blob in blobs:
            if blob.name.endswith("/"):
                continue
            rel_path = blob.name.removeprefix(prefix)
            if rel_path.startswith(".build/"):
                continue
            files.append(
                {
                    "path": rel_path,
                    "size": blob.size,
                    "content_type": blob.content_type,
                    "updated_at": blob.updated,
                }
            )
        files.sort(key=lambda f: f["path"])
        return files

    async def get_tex_file_content(
        self, project_id: str, owner_uid: str, path: str
    ) -> dict:
        """TeXファイル（テキスト）の内容を取得"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        if not path or ".." in path:
            raise HTTPException(status_code=400, detail="Invalid file path")

        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}{path}"
        bucket = self._bucket()
        blob = bucket.blob(blob_name)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="ファイルが見つかりません。")

        raw = blob.download_as_bytes()
        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="テキストファイルではありません。")
        return {"path": path, "content": content}

    async def save_tex_file_content(
        self, project_id: str, owner_uid: str, path: str, content: str
    ) -> dict:
        """TeXファイル（テキスト）を保存"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        if not path or ".." in path:
            raise HTTPException(status_code=400, detail="Invalid file path")

        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}{path}"
        bucket = self._bucket()
        blob = bucket.blob(blob_name)
        blob.upload_from_string(content.encode("utf-8"), content_type="text/plain")
        return {"path": path}

    async def delete_tex_file(self, project_id: str, owner_uid: str, path: str) -> None:
        """TeXワークスペースのファイルを削除"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        if not path or ".." in path:
            raise HTTPException(status_code=400, detail="Invalid file path")

        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}{path}"
        bucket = self._bucket()
        blob = bucket.blob(blob_name)
        if not blob.exists():
            raise HTTPException(status_code=404, detail="ファイルが見つかりません。")
        blob.delete()

    async def upload_tex_file(
        self,
        project_id: str,
        owner_uid: str,
        path: str,
        content: bytes,
        content_type: str | None = None,
    ) -> dict:
        """TeXワークスペースにバイナリファイルをアップロード"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        if not path or ".." in path:
            raise HTTPException(status_code=400, detail="Invalid file path")

        blob_name = f"{self._project_tex_prefix(owner_uid, project_id)}{path}"
        bucket = self._bucket()
        blob = bucket.blob(blob_name)
        blob.upload_from_string(
            content,
            content_type=content_type or "application/octet-stream",
        )
        return {"path": path}

    async def get_tex_preview_url(
        self, project_id: str, owner_uid: str, main_file: str = "main.tex"
    ) -> dict:
        """最新コンパイル済みPDFの署名付きURLを返す"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        stem = Path(main_file).stem or "main"
        pdf_blob_name = (
            f"{self._project_tex_prefix(owner_uid, project_id)}.build/{stem}.pdf"
        )
        bucket = self._bucket()
        blob = bucket.blob(pdf_blob_name)
        if not blob.exists():
            return {"pdf_path": pdf_blob_name, "pdf_url": None}
        return {
            "pdf_path": pdf_blob_name,
            "pdf_url": self._generate_signed_url(blob),
        }

    async def get_tex_preview_pdf(
        self, project_id: str, owner_uid: str, main_file: str = "main.tex"
    ) -> bytes:
        """最新コンパイル済みPDFのバイナリを返す"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        stem = Path(main_file).stem or "main"
        pdf_blob_name = (
            f"{self._project_tex_prefix(owner_uid, project_id)}.build/{stem}.pdf"
        )
        blob = self._bucket().blob(pdf_blob_name)
        if not blob.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プレビューPDFが見つかりません。",
            )
        return blob.download_as_bytes()

    async def compile_tex(
        self, project_id: str, owner_uid: str, main_file: str = "main.tex"
    ) -> dict:
        """Storage上のTeXワークスペースをコンパイルしてPDFを返す"""
        project = await self.repository.get_by_id(project_id, owner_uid)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="プロジェクトが見つかりません。",
            )
        if not main_file or ".." in main_file:
            raise HTTPException(status_code=400, detail="Invalid main file path")

        # コンパイル直前に references.bib と main.tex の最小要件を同期
        await self._sync_project_references_bib(project_id, owner_uid)

        prefix = self._project_tex_prefix(owner_uid, project_id)
        bucket = self._bucket()
        blobs = list(bucket.list_blobs(prefix=prefix))
        if not blobs:
            raise HTTPException(status_code=400, detail="TeXファイルがありません。")

        with tempfile.TemporaryDirectory(prefix="texbuild-") as temp_dir:
            src_dir = Path(temp_dir) / "src"
            out_dir = Path(temp_dir) / "out"
            src_dir.mkdir(parents=True, exist_ok=True)
            out_dir.mkdir(parents=True, exist_ok=True)

            for blob in blobs:
                if blob.name.endswith("/"):
                    continue
                rel_path = blob.name.removeprefix(prefix)
                if rel_path.startswith(".build/"):
                    continue
                target = src_dir / rel_path
                target.parent.mkdir(parents=True, exist_ok=True)
                blob.download_to_filename(str(target))

            main_path = src_dir / main_file
            if not main_path.exists():
                raise HTTPException(
                    status_code=400,
                    detail=f"main file not found: {main_file}",
                )

            main_stem = Path(main_file).stem
            try:
                compile_logs: list[str] = []

                def run_pdflatex() -> subprocess.CompletedProcess[str]:
                    return subprocess.run(
                        [
                            "pdflatex",
                            "-interaction=nonstopmode",
                            "-halt-on-error",
                            "-output-directory",
                            str(out_dir),
                            main_file,
                        ],
                        cwd=str(src_dir),
                        capture_output=True,
                        text=True,
                        timeout=120,
                        check=False,
                    )

                proc = run_pdflatex()
                compile_logs.append(
                    (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
                )
                if proc.returncode != 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"LaTeXコンパイル失敗\n{compile_logs[-1][-4000:]}",
                    )

                bcf_path = out_dir / f"{main_stem}.bcf"
                if bcf_path.exists():
                    biber_proc = subprocess.run(
                        [
                            "biber",
                            "--input-directory",
                            str(out_dir),
                            "--output-directory",
                            str(out_dir),
                            main_stem,
                        ],
                        cwd=str(src_dir),
                        capture_output=True,
                        text=True,
                        timeout=120,
                        check=False,
                    )
                    compile_logs.append(
                        (biber_proc.stdout or "")
                        + ("\n" + biber_proc.stderr if biber_proc.stderr else "")
                    )
                    if biber_proc.returncode != 0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Biber実行失敗\n{compile_logs[-1][-4000:]}",
                        )

                # Bib/参照解決のために最終2パス
                for _ in range(2):
                    proc = run_pdflatex()
                    compile_logs.append(
                        (proc.stdout or "")
                        + ("\n" + proc.stderr if proc.stderr else "")
                    )
                    if proc.returncode != 0:
                        break
            except FileNotFoundError:
                raise HTTPException(
                    status_code=501,
                    detail="pdflatex がインストールされていません。",
                )
            except subprocess.TimeoutExpired:
                raise HTTPException(
                    status_code=408,
                    detail="LaTeXコンパイルがタイムアウトしました。",
                )

            compile_log = "\n".join(compile_logs)
            if proc.returncode != 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"LaTeXコンパイル失敗\n{compile_log[-4000:]}",
                )

            pdf_name = f"{main_stem}.pdf"
            pdf_path = out_dir / pdf_name
            if not pdf_path.exists():
                raise HTTPException(status_code=500, detail="PDF生成に失敗しました。")

            pdf_blob_name = f"{prefix}.build/{pdf_name}"
            pdf_blob = bucket.blob(pdf_blob_name)
            pdf_blob.upload_from_filename(str(pdf_path), content_type="application/pdf")

            return {
                "pdf_path": pdf_blob_name,
                "pdf_url": self._generate_signed_url(pdf_blob),
                "log": compile_log[-8000:] if compile_log else None,
            }

    def _generate_signed_url(self, blob) -> str | None:
        """Storage Blobの署名付きURLを生成（失敗時はNone）"""
        try:
            return blob.generate_signed_url(
                version="v4",
                expiration=datetime.now(timezone.utc) + timedelta(hours=1),
                method="GET",
                response_disposition=f'inline; filename="{quote(blob.name)}"',
            )
        except Exception:
            return None


project_service = ProjectService()
