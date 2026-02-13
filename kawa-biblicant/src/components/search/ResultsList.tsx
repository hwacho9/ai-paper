import type { LineageEdge, RankedPaper } from "../../types";
import ResultsItem from "./ResultsItem";
import styles from "../Results.module.css";

type ResultsListProps = {
  results: RankedPaper[];
  edges: LineageEdge[];
  onSelect: (paper: RankedPaper) => void;
};

export default function ResultsList({ results, edges, onSelect }: ResultsListProps) {
  if (results.length === 0) return null;

  const childrenMap = new Map<string, string[]>();
  const improvementMap = new Map<string, string>();
  const fromSet = new Set<string>();
  const toSet = new Set<string>();

  edges.forEach((edge) => {
    fromSet.add(edge.fromTitle);
    toSet.add(edge.toTitle);
    const list = childrenMap.get(edge.fromTitle) ?? [];
    list.push(edge.toTitle);
    childrenMap.set(edge.fromTitle, list);
    improvementMap.set(edge.toTitle, edge.improvement);
  });

  const roots = Array.from(fromSet).filter((title) => !toSet.has(title));
  const extraRoots = results
    .map((paper) => paper.title)
    .filter((title) => !fromSet.has(title) && !toSet.has(title));
  const orderedTitles = [...roots, ...extraRoots];
  const seen = new Set<string>();
  const ordered: { paper: RankedPaper; depth: number; improvement: string }[] = [];
  const lookup = new Map(results.map((paper) => [paper.title, paper]));

  const walk = (title: string, depth: number) => {
    if (seen.has(title)) return;
    seen.add(title);
    const paper = lookup.get(title);
    if (paper) {
      ordered.push({ paper, depth, improvement: improvementMap.get(title) ?? "" });
    }
    const children = childrenMap.get(title) ?? [];
    children.forEach((child) => walk(child, depth + 1));
  };

  orderedTitles.forEach((title) => walk(title, 0));

  return (
    <ol className={styles.list}>
      {ordered.map(({ paper, depth, improvement }) => (
        <ResultsItem
          key={paper.title}
          paper={paper}
          depth={depth}
          improvement={improvement}
          onSelect={onSelect}
        />
      ))}
    </ol>
  );
}
