import { LibraryRelatedByKeywordResponse } from "@/lib/api/related";

interface KeywordRelatedSummaryProps {
    meta: LibraryRelatedByKeywordResponse["meta"] | null;
}

export function KeywordRelatedSummary({ meta }: KeywordRelatedSummaryProps) {
    if (!meta) return null;

    return (
        <p className="text-xs text-muted-foreground">
            キーワード: {meta.keywords_used ?? 0} / 表示論文:{" "}
            {meta.deduped_count ?? 0}
        </p>
    );
}
