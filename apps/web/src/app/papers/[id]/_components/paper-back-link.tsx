import Link from "next/link";

export function PaperBackLink() {
  return (
    <Link
      href="/library"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 19.5L8.25 12l7.5-7.5"
        />
      </svg>
      ライブラリに戻る
    </Link>
  );
}
