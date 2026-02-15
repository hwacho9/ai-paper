"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { app } from "@/lib/firebase";

export function AnalyticsProvider() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const initAnalytics = async () => {
            if (app && (await isSupported())) {
                const analytics = getAnalytics(app);
                const url =
                    pathname +
                    (searchParams?.toString()
                        ? `?${searchParams.toString()}`
                        : "");

                // Use a small timeout to ensure document.title is updated
                setTimeout(() => {
                    logEvent(analytics, "page_view", {
                        page_path: url,
                        page_title: document.title,
                        screen_class: pathname,
                    });
                    console.log(`Page view logged: ${url}`, {
                        title: document.title,
                        screen: pathname,
                    });
                }, 100);
            }
        };

        initAnalytics();
    }, [pathname, searchParams]);

    return null;
}
