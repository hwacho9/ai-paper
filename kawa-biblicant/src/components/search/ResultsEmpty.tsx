import styles from "../Results.module.css";

export default function ResultsEmpty() {
  return (
    <div className={styles.empty}>
      <p>研究テーマを入力して重要論文のランキングを生成してください。</p>
    </div>
  );
}
