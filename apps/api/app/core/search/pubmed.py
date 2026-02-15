import httpx
import xml.etree.ElementTree as ET
from app.core.search.base import BaseSearchClient, SearchResult
from app.core.search.rate_limiter import FirestoreRateLimiter

from app.core.config import settings

class PubmedClient(BaseSearchClient):
    BASE_URL_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    BASE_URL_SUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    DB = "pubmed"
    SERVICE_KEY = "pubmed"

    def __init__(self, rate_limiter: FirestoreRateLimiter = None):
        # PubMed API Limit: 3 req/s without key, 10 req/s with key.
        # Global Firestore Lock limits us to ~1 write/s.
        # We enforce 1.0s interval globally to prevent blocking and ensure safety.
        self.api_key = settings.pubmed_api_key
        # interval = 0.1 if self.api_key else 0.34
        # Force 1.0s for global safety
        super().__init__(interval=1.0, rate_limiter=rate_limiter)

    async def search(self, query: str, limit: int = 10) -> list[SearchResult]:
        await self._wait_for_rate_limit()
        
        # 1. Search for IDs (esearch)
        ids = await self._search_ids(query, limit)
        if not ids:
            return []
        
        # 2. Get details (esummary)
        # Note: We should ideally rate limit this second call too, 
        # but our simple lock handles "search" as one unit. 
        # If we split calls, we should call wait logic again.
        await self._wait_for_rate_limit() 
        return await self._get_details(ids)

    async def _search_ids(self, query: str, limit: int) -> list[str]:
        params = {
            "db": self.DB,
            "term": query,
            "retmax": limit,
            "retmode": "json"
        }
        if self.api_key:
            params["api_key"] = self.api_key
        async with httpx.AsyncClient() as client:
            response = await client.get(self.BASE_URL_SEARCH, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data.get("esearchresult", {}).get("idlist", [])

    async def _get_details(self, ids: list[str]) -> list[SearchResult]:
        if not ids:
            return []
            
        params = {
            "db": self.DB,
            "id": ",".join(ids),
            "retmode": "xml"  # Use XML to get full abstract and structured data
        }
        if self.api_key:
            params["api_key"] = self.api_key
            
        # Use EFETCH instead of ESUMMARY for details
        url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=15.0)
            response.raise_for_status()
            
            # Parse XML
            try:
                root = ET.fromstring(response.content)
            except ET.ParseError as e:
                print(f"PubMed XML Parse Error: {e}")
                return []
            
            results = []
            
            # PubmedArticleSet -> PubmedArticle
            for article in root.findall(".//PubmedArticle"):
                medline = article.find("MedlineCitation")
                if medline is None:
                    continue
                
                article_data = medline.find("Article")
                if article_data is None:
                    continue
                
                # Title
                title_elem = article_data.find("ArticleTitle")
                title = title_elem.text if title_elem is not None else ""
                
                # Abstract
                abstract_text = ""
                abstract_elem = article_data.find("Abstract")
                if abstract_elem is not None:
                    texts = []
                    for text_elem in abstract_elem.findall("AbstractText"):
                        if text_elem.text:
                            label = text_elem.get("Label")
                            txt = text_elem.text
                            if label:
                                texts.append(f"{label}: {txt}")
                            else:
                                texts.append(txt)
                    abstract_text = "\n".join(texts)
                
                # Authors
                authors = []
                author_list = article_data.find("AuthorList")
                if author_list is not None:
                    for author in author_list.findall("Author"):
                        # Try parsing various name formats
                        last_name = author.find("LastName")
                        fore_name = author.find("ForeName")
                        collective_name = author.find("CollectiveName")
                        
                        name_parts = []
                        if fore_name is not None and fore_name.text:
                            name_parts.append(fore_name.text)
                        if last_name is not None and last_name.text:
                            name_parts.append(last_name.text)
                        
                        if name_parts:
                            authors.append(" ".join(name_parts))
                        elif collective_name is not None and collective_name.text:
                            authors.append(collective_name.text)

                # Date
                year = None
                journal = article_data.find("Journal")
                if journal is not None:
                    journal_issue = journal.find("JournalIssue")
                    if journal_issue is not None:
                        pub_date = journal_issue.find("PubDate")
                        if pub_date is not None:
                            year_elem = pub_date.find("Year")
                            if year_elem is not None and year_elem.text:
                                try:
                                    year = int(year_elem.text)
                                except ValueError:
                                    pass
                
                # Venue/Journal Title
                venue = ""
                if journal is not None:
                    iso_abbrev = journal.find("ISOAbbreviation")
                    if iso_abbrev is not None and iso_abbrev.text:
                        venue = iso_abbrev.text
                    else:
                        j_title = journal.find("Title")
                        if j_title is not None and j_title.text:
                            venue = j_title.text

                # IDs (DOI, PMID, PMC)
                external_ids = {}
                pmid_elem = medline.find("PMID")
                if pmid_elem is not None and pmid_elem.text:
                    external_ids["PubMed"] = pmid_elem.text

                # Check PubmedData for other IDs
                pubmed_data = article.find("PubmedData")
                id_list = pubmed_data.find("ArticleIdList") if pubmed_data is not None else None
                
                pmc_id = None
                if id_list is not None:
                    for aid in id_list.findall("ArticleId"):
                        id_type = aid.get("IdType")
                        id_val = aid.text
                        if id_type == "doi" and id_val:
                            external_ids["DOI"] = id_val
                        elif id_type == "pmc" and id_val:
                            pmc_id = id_val # e.g. "PMC1234567"
                            # external_ids["PMC"] = pmc_id # Optional to store

                # PDF URL (Only if PMC ID exists)
                pdf_url = None
                if pmc_id:
                    # Construct PMC PDF URL (Standardized format)
                    pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmc_id}/pdf/"
                
                # Fallback URL (Prioritize DOI as requested by user)
                url = None
                if "DOI" in external_ids:
                    url = f"https://doi.org/{external_ids['DOI']}"
                elif "PubMed" in external_ids:
                    url = f"https://pubmed.ncbi.nlm.nih.gov/{external_ids['PubMed']}/"

                citation_count = None # efetch XML doesn't contain citation count usually

                results.append(SearchResult(
                    title=title,
                    authors=authors,
                    year=year,
                    venue=venue,
                    abstract=abstract_text,
                    external_ids=external_ids,
                    pdf_url=pdf_url,
                    url=url,
                    citation_count=citation_count,
                    source="pubmed"
                ))
            return results
