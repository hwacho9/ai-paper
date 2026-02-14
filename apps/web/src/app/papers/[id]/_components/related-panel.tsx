"use client";

import { useEffect, useState } from "react";
import {
    KeywordRelatedGroup,
    LibraryRelatedByKeywordResponse,
    relatedApi,
} from "@/lib/api/related";
import { Loader2 } from "lucide-react";
import { KeywordRelatedSummary } from "./keyword-related-summary";
import { KeywordRelatedGroupList } from "./keyword-related-group-list";

interface RelatedPanelProps {
    paperId: string;
}

export function RelatedPanel({ paperId }: RelatedPanelProps) {
    const [groups, setGroups] = useState<KeywordRelatedGroup[]>([]);
    const [meta, setMeta] =
        useState<LibraryRelatedByKeywordResponse["meta"] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const visibleGroups = groups.filter((group) => group.items.length > 0);

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

    if (visibleGroups.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                関連論文が見つかりませんでした
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <KeywordRelatedSummary meta={meta} />
            <KeywordRelatedGroupList groups={visibleGroups} />
        </div>
    );
}
