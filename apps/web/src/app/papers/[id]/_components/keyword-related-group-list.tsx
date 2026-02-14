import Link from "next/link";
import { KeywordRelatedGroup } from "@/lib/api/related";

interface KeywordRelatedGroupListProps {
    groups: KeywordRelatedGroup[];
}

export function KeywordRelatedGroupList({ groups }: KeywordRelatedGroupListProps) {
    return (
        <>
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
        </>
    );
}
