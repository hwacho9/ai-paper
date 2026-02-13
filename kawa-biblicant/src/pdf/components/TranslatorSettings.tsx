import styles from "../PdfTranslatorApp.module.css";

type TranslatorSettingsProps = {
  apiKey: string;
  model: string;
  endpoint: string;
  translationEnabled: boolean;
  dependencyEnabled: boolean;
  onApiKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onEndpointChange: (value: string) => void;
  onTranslationEnabledChange: (value: boolean) => void;
  onDependencyEnabledChange: (value: boolean) => void;
  onTranslateAll: () => void;
  isTranslateDisabled: boolean;
  isTranslating: boolean;
};

export default function TranslatorSettings({
  apiKey,
  model,
  endpoint,
  translationEnabled,
  dependencyEnabled,
  onApiKeyChange,
  onModelChange,
  onEndpointChange,
  onTranslationEnabledChange,
  onDependencyEnabledChange,
  onTranslateAll,
  isTranslateDisabled,
  isTranslating
}: TranslatorSettingsProps) {
  return (
    <section className={styles.settings}>
      <div>
        <label className={styles.label} htmlFor="apiKey">
          OpenAI API Key
        </label>
        <input
          id="apiKey"
          className={styles.input}
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          placeholder="sk-..."
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="model">
          Model
        </label>
        <input
          id="model"
          className={styles.input}
          value={model}
          onChange={(event) => onModelChange(event.target.value)}
        />
      </div>
      <div>
        <label className={styles.label} htmlFor="endpoint">
          Endpoint
        </label>
        <input
          id="endpoint"
          className={styles.input}
          value={endpoint}
          onChange={(event) => onEndpointChange(event.target.value)}
        />
      </div>
      <div>
        <label className={styles.checkRow} htmlFor="translationEnabled">
          <input
            id="translationEnabled"
            type="checkbox"
            checked={translationEnabled}
            onChange={(event) => onTranslationEnabledChange(event.target.checked)}
          />
          翻訳を有効にする
        </label>
        <p className={styles.note}>
          無効にすると翻訳オーバーレイは表示されず、翻訳処理も実行しません。
        </p>
      </div>
      <div>
        <label className={styles.checkRow} htmlFor="dependencyEnabled">
          <input
            id="dependencyEnabled"
            type="checkbox"
            checked={dependencyEnabled}
            onChange={(event) => onDependencyEnabledChange(event.target.checked)}
          />
          O/C（目的語・補語）をハイライトする
        </label>
        <p className={styles.note}>
          英語本文から目的語(O)と補語(C)の範囲を推定して色分けします。
        </p>
      </div>
      <button
        className={styles.primaryButton}
        type="button"
        onClick={onTranslateAll}
        disabled={isTranslateDisabled || isTranslating}
      >
        {isTranslating ? "翻訳中..." : "全文翻訳"}
      </button>
      <p className={styles.note}>APIキーは拡張内のローカルストレージに保存されます。</p>
    </section>
  );
}
