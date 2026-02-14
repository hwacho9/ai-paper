interface OverviewPanelProps {
  abstract: string;
}

export function OverviewPanel({ abstract }: OverviewPanelProps) {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="mb-3 text-lg font-semibold">Abstract</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {abstract || "(Abstractなし)"}
      </p>
    </div>
  );
}
