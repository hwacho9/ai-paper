export type Paper = {
  title: string;
  year: string;
  venue: string;
  relevance: number;
  reason: string;
  pdfUrl: string;
  sourceUrl?: string;
  summary: string;
  imageUrl: string;
  keywords: string[];
  prereqKeywords: string[];
};



export type RankedPaper = Paper & {
  rank: number;
};

export type LineageEdge = {
  fromTitle: string;
  toTitle: string;
  improvement: string;
};
