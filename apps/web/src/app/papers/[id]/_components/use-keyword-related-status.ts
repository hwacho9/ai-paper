"use client";

import { useEffect, useMemo, useState } from "react";
import type { PaperKeywordResponse } from "@/lib/api";
import { relatedApi } from "@/lib/api/related";

export type KeywordRelatedStatusMap = Record<string, boolean>;

function normalizeKeyword(label: string): string {
  return label.trim().toLowerCase();
}

export function useKeywordRelatedStatus(
  paperId: string,
  keywords: PaperKeywordResponse[],
  keywordsLoading: boolean,
) {
  const [statusMap, setStatusMap] = useState<KeywordRelatedStatusMap>({});
  const [loading, setLoading] = useState(false);

  const keywordKey = useMemo(() => {
    return keywords
      .map((keyword) => normalizeKeyword(keyword.label))
      .sort()
      .join("|");
  }, [keywords]);

  useEffect(() => {
    if (!paperId || keywordsLoading) return;

    if (keywords.length === 0) {
      setStatusMap({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      setLoading(true);
      try {
        const data = await relatedApi.getLibraryRelatedByKeywords(
          paperId,
          1,
          Math.max(8, keywords.length),
        );
        if (cancelled) return;

        const nextMap: KeywordRelatedStatusMap = {};
        data.groups.forEach((group) => {
          nextMap[normalizeKeyword(group.keyword)] = group.items.length > 0;
        });

        setStatusMap(nextMap);
      } catch {
        if (!cancelled) {
          setStatusMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [paperId, keywordKey, keywords.length, keywordsLoading]);

  return { statusMap, loading };
}

