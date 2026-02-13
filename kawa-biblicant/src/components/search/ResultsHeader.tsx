import styles from "../Results.module.css";

type ResultsHeaderProps = {
  title: string;
  status: string;
};

export default function ResultsHeader({ title, status }: ResultsHeaderProps) {
  return (
    <div className={styles.resultsHeader}>
      <h2 className={styles.title}>{title}</h2>
      <span className={styles.status}>{status}</span>
    </div>
  );
}
