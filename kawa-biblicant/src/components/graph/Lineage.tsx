import type { LineageEdge, RankedPaper } from "../../types";
import styles from "../Results.module.css";

type LineageProps = {
  edges: LineageEdge[];
  papers: RankedPaper[];
};

export default function Lineage({ edges, papers }: LineageProps) {
  if (edges.length === 0) return null;

  const lookup = new Map(papers.map((paper) => [paper.title, paper]));

  return (
    <section className={styles.lineage}>
      <div className={styles.lineageHeader}>
        <h2 className={styles.title}>系譜</h2>
        <span className={styles.status}>派生関係と追加された利点</span>
      </div>
      <div className={styles.lineageBody}>
        {edges.map((edge) => {
          const fromPaper = lookup.get(edge.fromTitle);
          const toPaper = lookup.get(edge.toTitle);
          return (
            <div key={`${edge.fromTitle}-${edge.toTitle}`} className={styles.lineageRow}>
              <div className={styles.lineageNode}>
                <p className={styles.lineageLabel}>派生元</p>
                <p className={styles.lineageTitle}>{fromPaper?.title ?? edge.fromTitle}</p>
              </div>
              <div className={styles.lineageArrow}>
                <span className={styles.lineageLine} />
                <span className={styles.lineageText}>{edge.improvement}</span>
              </div>
              <div className={styles.lineageNode}>
                <p className={styles.lineageLabel}>派生先</p>
                <p className={styles.lineageTitle}>{toPaper?.title ?? edge.toTitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
