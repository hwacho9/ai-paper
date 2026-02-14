"""
Related Papers Service
"""
from typing import List
from google.cloud import aiplatform, firestore
from app.core.config import settings
from app.core.embedding import generate_embedding
from app.core.firestore import get_firestore_client
from app.modules.related.schemas import RelatedPaper, Node, Edge, GraphData
from app.modules.papers.repository import PaperRepository
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class RelatedService:
    def __init__(self):
        self.db = get_firestore_client()
        self.paper_repo = PaperRepository()
        # Initialize AI Platform if needed (usually handled by gcloud auth or env vars)
        aiplatform.init(
            project=settings.gcp_project_id,
            location=settings.gcp_region
        )
        self.index_endpoint_name = (
            f"projects/{settings.gcp_project_id}/locations/{settings.gcp_region}/indexEndpoints/{settings.vector_index_endpoint_id}"
        )
        self.executor = ThreadPoolExecutor(max_workers=3)

    async def get_related_papers(self, paper_id: str, limit: int = 5) -> List[RelatedPaper]:
        """
        Get related papers for a given paper ID using Vector Search.
        """
        # 1. Get paper details (abstract)
        paper_ref = self.db.collection("papers").document(paper_id)
        paper_doc = await paper_ref.get()
        
        if not paper_doc.exists:
            logger.warning(f"Paper not found: {paper_id}")
            return []
            
        paper_data = paper_doc.to_dict()
        
        # Construct rich query for better semantic matching
        title = paper_data.get("title", "")
        abstract = paper_data.get("abstract", "")
        keywords = paper_data.get("keywords", [])
        
        query_text = f"Title: {title}\n"
        if keywords:
            query_text += f"Keywords: {', '.join(keywords)}\n"
        query_text += f"Abstract: {abstract}"
        
        if not query_text.strip():
             limit = 0 # No query possible
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
            # Run synchronous call in executor
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                self.executor,
                self._query_vector_search,
                query_vector,
                limit
            )
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []

        if not response:
            return []

        neighbors = response[0] # First query results
        
        related_papers = []
        for neighbor in neighbors:
            neighbor_id = neighbor.id
            similarity = neighbor.distance
            
            # Skip self
            if neighbor_id == paper_id:
                continue

            # Fetch paper details
            # TODO: Batch get would be better
            n_doc = await self.db.collection("papers").document(neighbor_id).get()
            if n_doc.exists:
                n_data = n_doc.to_dict()
                related_papers.append(RelatedPaper(
                    paperId=n_data.get("paperId", neighbor_id),
                    title=n_data.get("title", "No Title"),
                    authors=[a.get("name") if isinstance(a, dict) else str(a) for a in n_data.get("authors", [])],
                    year=n_data.get("year"),
                    venue=n_data.get("venue"),
                    abstract=n_data.get("abstract"),
                    similarity=float(similarity), # distance is similarity (dot product)
                    citationCount=n_data.get("citationCount", 0)
                ))

        return related_papers[:limit]

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
        Edges = Project -> Paper
        """
        # 1. Get Project Papers (IDs)
        project_ref = self.db.collection("projects").document(project_id)
        project_doc = await project_ref.get()
        if not project_doc.exists:
            return GraphData(nodes=[], edges=[])
        
        project_data = project_doc.to_dict() or {}
        project_title = project_data.get("title", "프로ジェクト")

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

        # 2. Fetch Paper Details in Batch (or parallel)
        # Firestore supports getAll but we need async version or manual parallel
        # Let's do parallel get
        tasks = []
        for pid in paper_ids:
            tasks.append(self.db.collection("papers").document(pid).get())
        
        paper_docs = await asyncio.gather(*tasks)

        for doc in paper_docs:
            if not doc.exists:
                continue
            data = doc.to_dict()
            nodes.append(Node(
                id=doc.id,
                label=data.get("title", doc.id)[:30] + "..." if len(data.get("title", "")) > 30 else data.get("title", doc.id),
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
            existing_edges = set() # Track to avoid duplicates (A-B and B-A)

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
                edges.append(Edge(source=p_id, target=paper_id, value=1.0))
        
        # 2. Fetch User's Library
        # library_ref = self.db.collection("users").document(user_id).collection("library")
        # async for lib_doc in library_ref.stream():
        #     unique_paper_ids.add(lib_doc.id)
        
        # Use PaperRepository to get likes (correct source of truth)
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
             # Use repository (or direct DB access if repo doesn't support batch get well yet)
             # Repository has get_papers_by_ids but let's stick to direct for now to match exist code style 
             # or better, use Repo.
             # existing logic used direct DB get. Let's keep it for now to minimize change, 
             # or update to use self.paper_repo.get_papers_by_ids(unique_paper_list) if we want to be clean.
             # The existing code did manual gather.
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
        
        import random
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
                 
                 if is_existing:
                     # Add edge between existing nodes (My Library <-> My Library / Project)
                     edges.append(Edge(source=pid, target=r.paperId, value=r.similarity))
                 else:
                     # It's a new external paper
                     # Only add if we haven't already added it as a 'node' in this loop
                     if not any(n.id == r.paperId for n in nodes):
                        nodes.append(Node(
                            id=r.paperId,
                            label=r.title[:30] + "...",
                            group="related", # External related papers are also 'related'
                            val=1
                        ))
                     
                     edges.append(Edge(source=pid, target=r.paperId, value=r.similarity))

                     
                     edges.append(Edge(source=pid, target=r.paperId, value=r.similarity))

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
        try:
            cache_ref = self.db.collection("users").document(user_id).collection("cache").document("graph_global")
            await cache_ref.delete()
            logger.info(f"Invalidated graph cache for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to invalidate graph cache: {e}")

related_service = RelatedService()
