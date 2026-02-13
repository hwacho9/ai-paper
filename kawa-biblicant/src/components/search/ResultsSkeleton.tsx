import styles from "../Results.module.css";

export default function ResultsSkeleton() {
  return (
    <div className={styles.skeleton}>
      {[...Array(3)].map((_, index) => (
        <div key={index} className={styles.skeletonRow} />
      ))}
    </div>
  );
}
