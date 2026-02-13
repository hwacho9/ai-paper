import styles from "../PdfTranslatorApp.module.css";

type TranslatorHeaderProps = {
  onOpenSettings: () => void;
  pageCount: number;
  currentPage: number;
};

export default function TranslatorHeader({
  onOpenSettings,
  pageCount,
  currentPage
}: TranslatorHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.pageMeta}>
        <span>Page</span>
        <strong>
          {currentPage || "-"} / {pageCount || "-"}
        </strong>
      </div>
      <button
        type="button"
        className={styles.menuButton}
        aria-label="設定を開く"
        onClick={onOpenSettings}
      >
        <span />
        <span />
        <span />
      </button>
    </header>
  );
}
