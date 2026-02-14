"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RelatedPaper, relatedApi } from "@/lib/api/related";
import { Loader2 } from "lucide-react";

interface RelatedPanelProps {
    paperId: string;
}

export function RelatedPanel({ paperId }: RelatedPanelProps) {
    const [papers, setPapers] = useState<RelatedPaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRelated = async () => {
            setLoading(true);
            try {
                const data = await relatedApi.getRelatedPapers(paperId);
                setPapers(data);
            } catch (err: unknown) {
                setError("関連論文の取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        if (paperId) {
            fetchRelated();
        }
    }, [paperId]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500 bg-red-500/10 rounded-xl">
                {error}
            </div>
        );
    }

    if (papers.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                関連論文が見つかりませんでした
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {papers.map((paper) => (
                <Link
                    key={paper.paperId}
                    href={`/papers/${paper.paperId}`}
                    className="block glass-card rounded-xl p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                            {paper.similarity.toFixed(2)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                            <h4 className="font-medium leading-tight group-hover:text-primary transition-colors">
                                {paper.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {paper.authors.join(", ")}
                                {paper.venue && ` · ${paper.venue}`}
                                {paper.year && ` · ${paper.year}`}
                            </p>
                            {paper.abstract && (
                                <p className="text-xs text-muted-foreground/80 line-clamp-2">
                                    {paper.abstract}
                                </p>
                            )}
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
