"""
Related Papers Service
"""
from typing import List, Set
from google.cloud import aiplatform, firestore
from app.core.config import settings
from app.core.embedding import generate_embedding
from app.core.firestore import get_firestore_client
from app.modules.related.schemas import (
    GraphData,
    Node,
    Edge,
    RelatedPaper,
)
from app.modules.papers.repository import PaperRepository
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
import random
import re

logger = logging.getLogger(__name__)


class RelatedService:
    def __init__(self):
        self.db = None
        self.paper_repo = PaperRepository()
        self.index_endpoint_name = ""
        self.executor = ThreadPoolExecutor(max_workers=3)
        self.vector_fetch_k = 50
        self.rerank_top_k = 30

    def _ensure_initialized(self):
        """
        外部クライアントの遅延初期化。
        起動時ではなく、実際にrelated機能が呼ばれたタイミングで初期化する。
        """
        if self.db is None:
            self.db = get_firestore_client()

        if not self.index_endpoint_name:
            vector_index_endpoint_id = getattr(settings, "vector_index_endpoint_id", "")
            if not vector_index_endpoint_id:
                raise RuntimeError("vector_index_endpoint_id is not configured")
            aiplatform.init(
                project=settings.gcp_project_id,
                location=settings.gcp_region,
            )
            self.index_endpoint_name = (
                f"projects/{settings.gcp_project_id}/locations/{settings.gcp_region}"
                f"/indexEndpoints/{vector_index_endpoint_id}"
            )

    async def get_related_papers(self, paper_id: str, limit: int = 5) -> List[RelatedPaper]:
        """
        Get related papers for a given paper ID using Vector Search.
        """
        self._ensure_initialized()
        # 1. Get paper details (abstract)
        paper_ref = self.db.collection("papers").document(paper_id)
        paper_doc = await paper_ref.get()

        if not paper_doc.exists:
            logger.warning(f"Paper not found: {paper_id}")
            return []

        paper_data = paper_doc.to_dict() or {}
        source_keywords = self._extract_keyword_set(paper_data)

        # Construct rich query for better semantic matching
        title = paper_data.get("title", "")
        abstract = paper_data.get("abstract", "")
        keywords = paper_data.get("keywords", [])

        query_text = f"Title: {title}\n"
        keyword_text = self._format_keywords_for_query(keywords)
        if keyword_text:
            query_text += f"Keywords: {keyword_text}\n"
        query_text += f"Abstract: {abstract}"

        if not query_text.strip():
            limit = 0  # No query possible
            return []

        # 2. Generate Embedding
        # In a real scenario, we should cache embeddings or retrieve stored ones.
        # But we don't store them in Firestore (only in Vector Search), so we regenerate query vector.
        # Cost optimization: Store embedding in specialized storage or Firestore (if size permits).
        query_vector = generate_embedding(query_text)
        if not query_vector:
            return []

        # 3. Query Vector Search
        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                self.executor,
                self._query_vector_search,
                query_vector,
                max(self.vector_fetch_k, limit),
            )
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

        if not response:
            return []

        neighbors = response[0]  # First query results

        # Build initial candidate list (vector score only)
        raw_candidates = []
        for neighbor in neighbors:
            neighbor_id = neighbor.id
            similarity = float(neighbor.distance)

            # Skip self
            if neighbor_id == paper_id:
                continue

            raw_candidates.append(
                {
                    "paper_id": neighbor_id,
                    "vector_score": similarity,
                }
            )

            if len(raw_candidates) >= max(self.vector_fetch_k, self.rerank_top_k, limit):
                break

        if not raw_candidates:
            return []

        # Re-rank only on top candidates for cost safety
        rerank_candidates = raw_candidates[: self.rerank_top_k]
        tasks = [
            self.db.collection("papers").document(item["paper_id"]).get()
            for item in rerank_candidates
        ]
        snapshots = await asyncio.gather(*tasks)

        scored_candidates = []
        for item, doc in zip(rerank_candidates, snapshots):
            if not doc.exists:
                continue

            paper_info = doc.to_dict() or {}
            target_keywords = self._extract_keyword_set(paper_info)
            keyword_score = self._keyword_jaccard(source_keywords, target_keywords)
            citation_score = self._citation_score(paper_info)
            final_score = (
                0.6 * item["vector_score"]
                + 0.25 * keyword_score
                + 0.15 * citation_score
            )

            scored_candidates.append(
                {
                    "paper_id": doc.id,
                    "paper_info": paper_info,
                    "vector_score": item["vector_score"],
                    "keyword_score": keyword_score,
                    "citation_score": citation_score,
                    "final_score": final_score,
                }
            )

        scored_candidates.sort(
            key=lambda x: (
                -x["final_score"],
                -x["citation_score"],
                -RelatedService._safe_year(x["paper_info"].get("year")),
            )
        )

        related_papers = []
        for item in scored_candidates[:limit]:
            paper_info = item["paper_info"]
            related_papers.append(
                RelatedPaper(
                    paperId=item["paper_id"],
                    title=paper_info.get("title", "No Title"),
                    authors=[a.get("name") if isinstance(a, dict) else str(a) for a in paper_info.get("authors", [])],
                    year=paper_info.get("year"),
                    venue=paper_info.get("venue"),
                    abstract=paper_info.get("abstract"),
                    similarity=float(item["final_score"]),
                    citationCount=paper_info.get("citationCount", 0),
                )
            )

        return related_papers

    def _extract_keyword_set(self, paper_data: dict) -> Set[str]:
        raw_keywords = paper_data.get("keywords", [])
        normalized: Set[str] = set()

        if isinstance(raw_keywords, list):
            for raw in raw_keywords:
                if isinstance(raw, str):
                    normalized.update(self._tokenize(raw))
                elif isinstance(raw, dict):
                    for key in ("name", "keyword", "term"):
                        value = raw.get(key)
                        if isinstance(value, str):
                            normalized.update(self._tokenize(value))
                            break
                elif isinstance(raw, (int, float)):
                    normalized.update(self._tokenize(str(raw)))

        elif isinstance(raw_keywords, str):
            normalized.update(self._tokenize(raw_keywords))

        if not normalized:
            title = paper_data.get("title", "")
            abstract = paper_data.get("abstract", "")
            normalized.update(self._tokenize(f"{title} {abstract}"))

        return normalized

    @staticmethod
    def _tokenize(text: str) -> Set[str]:
        if not isinstance(text, str):
            return set()
        return {
            token.strip().lower()
            for token in re.findall(r"\w+", text.lower())
            if token.strip()
        }

    @staticmethod
    def _keyword_jaccard(a: Set[str], b: Set[str]) -> float:
        if not a or not b:
            return 0.0
        union = a | b
        if not union:
            return 0.0
        return len(a & b) / len(union)

    @staticmethod
    def _citation_score(paper_data: dict) -> float:
        raw = paper_data.get("citationCount", paper_data.get("citation_count", 0))
        if raw is None:
            return 0.0

        try:
            count = int(raw)
        except (TypeError, ValueError):
            return 0.0

        return min(max(count, 0), 100) / 100

    @staticmethod
    def _safe_year(value) -> int:
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip():
            try:
                return int(value.strip())
            except ValueError:
                return 0
        return 0

    @staticmethod
    def _format_keywords_for_query(keywords) -> str:
        if not keywords:
            return ""

        if isinstance(keywords, str):
            return keywords.strip()

        if not isinstance(keywords, list):
            return str(keywords)

        parts = []
        for item in keywords:
            if isinstance(item, str):
                parts.append(item.strip())
            elif isinstance(item, dict):
                if item.get("name"):
                    parts.append(str(item.get("name")).strip())
                elif item.get("keyword"):
                    parts.append(str(item.get("keyword")).strip())
            else:
                parts.append(str(item).strip())

        return ", ".join([p for p in parts if p])

    def _query_vector_search(self, query_vector: list[float], limit: int):
        """Helper for running in executor"""
        try:
            index_endpoint_cls = getattr(
                aiplatform,
                "MatchingEngineIndexEndpoint",
                getattr(aiplatform, "IndexEndpoint", None),
            )
            if index_endpoint_cls is None:
                raise AttributeError(
                    "No matching index endpoint client found in aiplatform"
                )

            my_index_endpoint = index_endpoint_cls(
                index_endpoint_name=self.index_endpoint_name
            )
            response = my_index_endpoint.find_neighbors(
                deployed_index_id="ai_paper_deployed_index",
                queries=[query_vector],
                num_neighbors=limit + 1
            )
            return response
        except Exception as e:
            logger.error(f"Sync Vector search error: {e}")
            raise e

    async def get_project_graph(self, project_id: str) -> GraphData:
        """
        Construct a graph for a project.
        Nodes = Project node + Papers in Project
        Edges = Project -> Paper + Paper -> Paper (relatedness)
        """
        self._ensure_initialized()
        # 1. Get Project Papers (IDs)
        project_ref = self.db.collection("projects").document(project_id)
        project_doc = await project_ref.get()
        if not project_doc.exists:
            return GraphData(nodes=[], edges=[])

        project_data = project_doc.to_dict() or {}
        project_title = project_data.get("title", "프로젝트")

        papers_ref = project_ref.collection("papers")

        # Stream paper IDs from subcollection
        paper_ids = []
        async for doc in papers_ref.stream():
            paper_ids.append(doc.id)

        nodes = [
            Node(
                id=project_id,
                label=project_title,
                group="project",
                val=5,
            )
        ]
        edges = []

        if not paper_ids:
            return GraphData(nodes=nodes, edges=edges)

        # 2. Fetch Paper Details in Parallel
        tasks = []
        for pid in paper_ids:
            tasks.append(self.db.collection("papers").document(pid).get())

        paper_docs = await asyncio.gather(*tasks)

        for doc in paper_docs:
            if not doc.exists:
                continue
            data = doc.to_dict() or {}
            nodes.append(Node(
                id=doc.id,
                label=(data.get("title", doc.id)[:30] + "..." if len(data.get("title", "")) > 30 else data.get("title", doc.id)),
                group="paper", # For now simple group
                val=2
            ))
            edges.append(Edge(source=project_id, target=doc.id, value=1.0))

        # 3. Find relationships between papers in the project
        # Limit to avoid too many requests if project is huge
        if len(paper_ids) > 0:
            target_ids = paper_ids[:20]  # Cap at 20 for now to be safe
            related_tasks = []
            for pid in target_ids:
                related_tasks.append(self.get_related_papers(pid, limit=10))

            results = await asyncio.gather(*related_tasks)

            project_paper_set = set(paper_ids)
            existing_edges = set()  # Track to avoid duplicates (A-B and B-A)

            for i, related_papers in enumerate(results):
                source_id = target_ids[i]
                for rp in related_papers:
                    if rp.paperId in project_paper_set and rp.paperId != source_id:
                        # Create a consistent key for undirected edge check
                        edge_key = tuple(sorted((source_id, rp.paperId)))
                        if edge_key not in existing_edges:
                            edges.append(Edge(source=source_id, target=rp.paperId, value=rp.similarity))
                            existing_edges.add(edge_key)

        return GraphData(nodes=nodes, edges=edges)

    async def get_global_graph(self, user_id: str) -> GraphData:
        """
        Construct a global graph for the user.
        Nodes: Projects, Papers
        Edges: Project -> Paper (and Paper -> Paper)
        """
        self._ensure_initialized()
        # 0. Check Cache
        cache_ref = self.db.collection("users").document(user_id).collection("cache").document("graph_global")
        cache_doc = await cache_ref.get()
        if cache_doc.exists:
            data = cache_doc.to_dict()
            logger.info(f"Graph cache hit for user {user_id}")
            # Reconstruct objects (Firestore stores dicts)
            return GraphData(
                nodes=[Node(**n) for n in data.get("nodes", [])],
                edges=[Edge(**e) for e in data.get("edges", [])]
            )

        nodes = []
        edges = []
        edge_set = set()

        # Track papers in projects to identify orphans and apply "related" group
        project_paper_ids = set()

        # 1. Fetch User's Projects
        projects_query = self.db.collection("projects").where(filter=firestore.FieldFilter("ownerUid", "==", user_id))
        project_docs = [doc async for doc in projects_query.stream()]

        unique_paper_ids = set()

        for p_doc in project_docs:
            p_data = p_doc.to_dict()
            p_id = p_doc.id
            nodes.append(Node(
                id=p_id,
                label=p_data.get("title", "Untitled Project"),
                group="project",
                val=4
            ))

            # Fetch papers in this project
            papers_ref = p_doc.reference.collection("papers")
            async for pp_doc in papers_ref.stream():
                paper_id = pp_doc.id
                unique_paper_ids.add(paper_id)
                project_paper_ids.add(paper_id)
                edge_key = (p_id, paper_id)
                if edge_key not in edge_set:
                    edges.append(Edge(source=p_id, target=paper_id, value=1.0))
                    edge_set.add(edge_key)

        # 2. Fetch User's Library
        liked_paper_ids = await self.paper_repo.get_user_likes(user_id)
        for pid in liked_paper_ids:
            unique_paper_ids.add(pid)

        if not unique_paper_ids:
            return GraphData(nodes=nodes, edges=edges)

        # 3. Fetch Paper Details
        tasks = []
        # Convert set to list for indexing
        unique_paper_list = list(unique_paper_ids)
        for pid in unique_paper_list:
            tasks.append(self.db.collection("papers").document(pid).get())

        paper_snapshots = await asyncio.gather(*tasks)

        existing_paper_ids = []
        for snap in paper_snapshots:
            if snap.exists:
                data = snap.to_dict() or {}
                pid = snap.id
                existing_paper_ids.append(pid)

                # Determine Group:
                # User says: "Papers registered in the current project are related research"
                # So if in project -> 'related'. If only in library -> 'owned' (or 'paper')
                group = "related" if pid in project_paper_ids else "owned"

                nodes.append(Node(
                    id=pid,
                    label=data.get("title", pid)[:30] + "..." if len(data.get("title", "")) > 30 else data.get("title", pid),
                    group=group,
                    val=2 if group == "related" else 1
                ))

        # 4. Expand Related Papers & Inter-Library Connections
        # "It must be related to My Library"
        # We try to find connections for ALL visible papers to ensure density,
        # but limit the *new* external nodes to avoid clutter.

        # We want to check connections for a good number of papers
        # especially orphaned ones to see if they relate to anything
        orphaned_ids = [pid for pid in existing_paper_ids if pid not in project_paper_ids]

        # Check allorphaned IDs + sample of project IDs
        targets = orphaned_ids + random.sample(list(project_paper_ids), min(len(project_paper_ids), 5)) if project_paper_ids else orphaned_ids

        # Safety cap on targets to prevent API timeout
        if len(targets) > 10:
            targets = random.sample(targets, 10)

        for pid in targets:
            # Limit to 3 related papers per target
            related = await self.get_related_papers(pid, limit=3)
            for r in related:
                # Logic:
                # 1. If related paper IS in our graph (Library or Project), DRAW EDGE! (Inter-library connection)
                # 2. If related paper is NEW, add Node + Edge (External suggestion)

                is_existing = r.paperId in unique_paper_ids
                edge_key = tuple(sorted((pid, r.paperId)))

                if is_existing:
                    # Add edge between existing nodes (My Library / Project)
                    if edge_key not in edge_set:
                        edges.append(Edge(source=pid, target=r.paperId, value=r.similarity))
                        edge_set.add(edge_key)
                else:
                    # It's a new external paper
                    # Only add if we haven't already added it as a 'node' in this loop
                    if not any(n.id == r.paperId for n in nodes):
                        nodes.append(Node(
                            id=r.paperId,
                            label=r.title[:30] + "...",
                            group="related",  # External related papers are also 'related'
                            val=1
                        ))

                    if edge_key not in edge_set:
                        edges.append(Edge(source=pid, target=r.paperId, value=r.similarity))
                        edge_set.add(edge_key)

        # 5. Save to Cache
        try:
            cache_data = {
                "nodes": [n.model_dump() for n in nodes],
                "edges": [e.model_dump() for e in edges],
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            await cache_ref.set(cache_data)
        except Exception as e:
            logger.error(f"Failed to save graph cache: {e}")

        return GraphData(nodes=nodes, edges=edges)

    async def invalidate_user_graph_cache(self, user_id: str):
        """Invalidate the global graph cache for a user."""
        self._ensure_initialized()
        try:
            cache_ref = self.db.collection("users").document(user_id).collection("cache").document("graph_global")
            await cache_ref.delete()
            logger.info(f"Invalidated graph cache for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to invalidate user graph cache: {e}")


related_service = RelatedService()
