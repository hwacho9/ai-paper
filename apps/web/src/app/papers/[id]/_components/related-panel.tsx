"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    KeywordRelatedGroup,
    LibraryRelatedByKeywordResponse,
    relatedApi,
} from "@/lib/api/related";
import { Loader2 } from "lucide-react";

interface RelatedPanelProps {
    paperId: string;
}

export function RelatedPanel({ paperId }: RelatedPanelProps) {
    const [groups, setGroups] = useState<KeywordRelatedGroup[]>([]);
    const [meta, setMeta] =
        useState<LibraryRelatedByKeywordResponse["meta"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRelated = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await relatedApi.getLibraryRelatedByKeywords(paperId);
                setGroups(data.groups);
                setMeta(data.meta ?? null);
            } catch {
                setError("関連論文の取得に失敗しました");
                setGroups([]);
                setMeta(null);
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

    if (groups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                関連論文が見つかりませんでした
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {meta && (
                <p className="text-xs text-muted-foreground">
                    キーワード: {meta.keywords_used ?? 0} / 表示論文:{" "}
                    {meta.deduped_count ?? 0}
                </p>
            )}
            {groups.map((group) => (
                <div key={group.keyword} className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary">
                        {group.keyword}
                    </h3>
                    {group.items.length === 0 && (
                        <p className="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                            該当なし
                        </p>
                    )}
                    {group.items.map((paper) => (
                        <Link
                            key={`${group.keyword}-${paper.paper_id}`}
                            href={`/papers/${paper.paper_id}`}
                            className="block glass-card rounded-xl p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <div className="flex gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                                    {paper.score.toFixed(2)}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <h4 className="font-medium leading-tight group-hover:text-primary transition-colors">
                                        {paper.title}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {paper.authors.join(", ")}
                                        {paper.year && ` · ${paper.year}`}
                                    </p>
                                    {paper.reason && (
                                        <p className="text-xs text-muted-foreground/80">
                                            {paper.reason}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ))}
        </div>
    );
}
