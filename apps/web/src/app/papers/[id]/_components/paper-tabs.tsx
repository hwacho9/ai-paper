import type { Tab } from "../types";

interface PaperTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "概要" },
  { key: "pdf", label: "PDF" },
  { key: "memos", label: "メモ" },
  { key: "related", label: "関連論文" },
];

export function PaperTabs({ activeTab, onChange }: PaperTabsProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted/30 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === tab.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
