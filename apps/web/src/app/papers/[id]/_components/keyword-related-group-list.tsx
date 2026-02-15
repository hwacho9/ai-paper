import Link from "next/link";
import { KeywordRelatedGroup } from "@/lib/api/related";

interface KeywordRelatedGroupListProps {
    groups: KeywordRelatedGroup[];
    noHitKeywords?: string[];
}

function keywordToAnchorId(keyword: string): string {
    return `related-keyword-${keyword.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

export function KeywordRelatedGroupList({
    groups,
    noHitKeywords = [],
}: KeywordRelatedGroupListProps) {
    return (
        <>
            {groups.map((group) => (
                <div
                    key={group.keyword}
                    id={keywordToAnchorId(group.keyword)}
                    className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary">
                        {group.keyword}
                    </h3>
                    {group.items.map((paper) => (
                        <Link
                            key={`${group.keyword}-${paper.paper_id}`}
                            href={`/papers/${paper.paper_id}`}
                            className="block glass-card rounded-xl p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                            <div className="min-w-0 flex-1 space-y-1">
                                <h4 className="font-medium leading-tight group-hover:text-primary transition-colors">
                                    {paper.title}
                                </h4>
                                <div>
                                    {paper.score === 1.0 && paper.matched_tag && (
                                        <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                                            {paper.matched_tag}
                                        </span>
                                    )}
                                    {paper.score === 0.7 && paper.candidate_tag && (
                                        <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                                            {paper.candidate_tag}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {paper.authors.join(", ")}
                                    {paper.year && ` · ${paper.year}`}
                                </p>
                                {paper.paper_keywords.length > 0 && (
                                    <div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {paper.paper_keywords.map((tag) => (
                                                <span
                                                    key={`paper-${paper.paper_id}-${tag}`}
                                                    className="inline-flex rounded-full border border-sky-300/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-200">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {paper.prerequisite_keywords.length > 0 && (
                                    <div>
                                        <div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {paper.prerequisite_keywords.map((tag) => (
                                                    <span
                                                        key={`pre-${paper.paper_id}-${tag}`}
                                                        className="inline-flex rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ))}
            {noHitKeywords.length > 0 && (
                <div id="related-keyword-no-hit" className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        該当なし
                    </h3>
                    <div className="glass-card rounded-xl p-4">
                        <div className="flex flex-wrap gap-1.5">
                            {noHitKeywords.map((keyword) => (
                                <span
                                    key={`no-hit-${keyword}`}
                                    className="inline-flex rounded-full border border-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
