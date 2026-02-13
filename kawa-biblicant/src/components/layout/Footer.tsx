import styles from "../Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <p className={styles.footnote}>次のステップ</p>
        <ul className={styles.list}>
          <li>OpenAI APIで検索 + 生成のパイプラインに接続</li>
          <li>Google Custom Search APIとの統合</li>
          <li>論文の引用リンクと要旨を表示</li>
        </ul>
      </div>
      <div className={styles.legend}>
        <div>
          <span className={styles.dot} />
          <span>検索完了</span>
        </div>
        <div>
          <span className={`${styles.dot} ${styles.dotMuted}`} />
          <span>モック</span>
        </div>
      </div>
    </footer>
  );
}
