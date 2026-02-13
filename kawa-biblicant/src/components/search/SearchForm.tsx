import type { FormEvent } from "react";
import styles from "../SearchForm.module.css";

type SearchFormProps = {
  theme: string;
  loading: boolean;
  suggestions: string[];
  submittedTheme: string;
  onThemeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSuggestionSelect: (value: string) => void;
};

export default function SearchForm({
  theme,
  loading,
  suggestions,
  submittedTheme,
  onThemeChange,
  onSubmit,
  onSuggestionSelect
}: SearchFormProps) {
  const showSuggestions = Boolean(submittedTheme.trim());
  return (
    <form className={styles.search} onSubmit={onSubmit}>
      <label className={styles.label} htmlFor="theme">
        研究メモ
      </label>
      <div className={styles.inputRow}>
        <textarea
          id="theme"
          className={styles.inputField}
          value={theme}
          onChange={(event) => onThemeChange(event.target.value)}
          placeholder="例: マルチエージェントシステムの協調学習について。協調戦略の形成、価値分解、評価指標あたりを重点的に知りたい。"
          rows={4}
        />
        <button
          type="submit"
          className={`${styles.buttonBase} ${styles.submitButton}`}
          disabled={!theme.trim() || loading}
        >
          {loading ? "調査中..." : "重要論文を抽出"}
        </button>
      </div>
      {showSuggestions && (
        <div className={styles.suggestions}>
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className={`${styles.buttonBase} ${styles.chip}`}
              onClick={() => onSuggestionSelect(item)}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
