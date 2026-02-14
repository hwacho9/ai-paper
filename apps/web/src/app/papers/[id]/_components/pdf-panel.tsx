interface PdfPanelProps {
  title: string;
  pdfUrl: string | null;
  page?: number;
}

export function PdfPanel({ title, pdfUrl, page = 1 }: PdfPanelProps) {
  const clampPage = page > 0 ? Math.floor(page) : 1;
  const withPageHash = (targetUrl: string) => {
    if (clampPage <= 1) return targetUrl;

    try {
      const url = new URL(targetUrl);
      url.hash = `page=${clampPage}`;
      return url.toString();
    } catch {
      return `${targetUrl.split("#")[0]}#page=${clampPage}`;
    }
  };

  const pdfViewUrl = pdfUrl ? withPageHash(pdfUrl) : "";
  const downloadUrl = pdfUrl ? withPageHash(pdfUrl) : "#";

  if (!pdfUrl) {
    return (
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="flex h-96 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/30">
              <span className="text-2xl">📄</span>
            </div>
            <p className="text-sm font-medium">PDFが見つかりません</p>
            <p className="mt-1 text-xs text-muted-foreground">
              この論文にはPDF URLが登録されていません
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="max-w-[60%] truncate text-xs text-muted-foreground">
          {pdfUrl}
        </span>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          新しいタブで開く
        </a>
      </div>
      <iframe
        src={pdfViewUrl}
        className="w-full border-0"
        style={{ height: "80vh" }}
        title={`${title} - PDF`}
      />
    </div>
  );
}
