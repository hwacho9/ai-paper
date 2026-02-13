import { useEffect, useReducer, useRef, useState } from "react";
import PdfColumn from "./components/PdfColumn";
import TranslatorHeader from "./components/TranslatorHeader";
import TranslatorSettings from "./components/TranslatorSettings";
import { OPENAI_DEFAULTS } from "./lib/openai";
import { PdfTranslatorSession } from "./lib/PdfTranslatorSession";
import { TranslationController } from "./lib/TranslationController";
import styles from "./PdfTranslatorApp.module.css";
import type { LoadState, PageTranslation, ParagraphTranslation } from "./types";

const API_KEY_STORAGE = "openai_api_key";
const MODEL_STORAGE = "openai_model";
const ENDPOINT_STORAGE = "openai_endpoint";
const TRANSLATION_ENABLED_STORAGE = "translation_enabled";
const DEPENDENCY_ENABLED_STORAGE = "dependency_enabled";
const DEFAULT_SCALE = 1.2;

function getPdfUrlFromQuery(): string {
  const params = new URLSearchParams(window.location.search);
  const src = params.get("src");
  return src ? decodeURIComponent(src) : "";
}

type State = {
  pdfUrl: string;
  loadState: LoadState;
  pages: PageTranslation[];
  currentPage: number;
  apiKey: string;
  model: string;
  endpoint: string;
  isTranslating: boolean;
  translationEnabled: boolean;
  dependencyEnabled: boolean;
};

type Action =
  | { type: "set_pdf_url"; payload: string }
  | { type: "set_load_state"; payload: LoadState }
  | { type: "set_pages"; payload: PageTranslation[] }
  | { type: "set_current_page"; payload: number }
  | {
      type: "update_paragraph";
      payload: {
        pageNumber: number;
        paragraphId: string;
        updater: Partial<ParagraphTranslation>;
      };
    }
  | { type: "set_api_key"; payload: string }
  | { type: "set_model"; payload: string }
  | { type: "set_endpoint"; payload: string }
  | { type: "set_translating"; payload: boolean }
  | { type: "set_translation_enabled"; payload: boolean }
  | { type: "set_dependency_enabled"; payload: boolean }
  | { type: "reset_translations" };

const initialState: State = {
  pdfUrl: getPdfUrlFromQuery(),
  loadState: { status: "idle" },
  pages: [],
  currentPage: 0,
  apiKey: localStorage.getItem(API_KEY_STORAGE) ?? "",
  model: localStorage.getItem(MODEL_STORAGE) ?? OPENAI_DEFAULTS.model,
  endpoint: localStorage.getItem(ENDPOINT_STORAGE) ?? OPENAI_DEFAULTS.endpoint,
  isTranslating: false,
  translationEnabled: localStorage.getItem(TRANSLATION_ENABLED_STORAGE) !== "false",
  dependencyEnabled: localStorage.getItem(DEPENDENCY_ENABLED_STORAGE) !== "false"
};

function reducer(state: State, action: Action): State {
  /**
   * UI全体の状態更新を集約するreducer。
   * 依存: UIイベントからのAction
   * 役割: PDFロード/翻訳/設定変更の状態遷移を一箇所で管理。
   */
  switch (action.type) {
    case "set_pdf_url":
      return { ...state, pdfUrl: action.payload };
    case "set_load_state":
      return { ...state, loadState: action.payload };
    case "set_pages":
      return { ...state, pages: action.payload };
    case "set_current_page":
      return { ...state, currentPage: action.payload };
    case "update_paragraph":
      return {
        ...state,
        pages: state.pages.map((page) => {
          if (page.pageNumber !== action.payload.pageNumber) return page;
          return {
            ...page,
            paragraphs: page.paragraphs.map((paragraph) =>
              paragraph.id === action.payload.paragraphId
                ? { ...paragraph, ...action.payload.updater }
                : paragraph
            )
          };
        })
      };
    case "set_api_key":
      return { ...state, apiKey: action.payload };
    case "set_model":
      return { ...state, model: action.payload };
    case "set_endpoint":
      return { ...state, endpoint: action.payload };
    case "set_translating":
      return { ...state, isTranslating: action.payload };
    case "set_translation_enabled":
      return { ...state, translationEnabled: action.payload };
    case "set_dependency_enabled":
      return { ...state, dependencyEnabled: action.payload };
    case "reset_translations":
      return {
        ...state,
        isTranslating: false,
        pages: state.pages.map((page) => ({
          ...page,
          paragraphs: page.paragraphs.map((paragraph) => ({
            ...paragraph,
            status: "idle",
            translation: "",
            error: undefined,
            ocStatus: "idle",
            ocTargets: undefined
          }))
        }))
      };
    default:
      return state;
  }
}

function splitTranslationByRatio(text: string, ratio: number): [string, string] {
  /**
   * 結合翻訳した文章を元の比率で2分割する。
   * 依存: 句点/改行を優先する分割ロジック
   * 役割: カラム跨ぎ段落の訳文を2ブロックに再配分。
   */
  const target = Math.max(1, Math.floor(text.length * ratio));
  const breakChars = ["。", ".", "!", "?", "\n"];
  let splitIndex = target;

  for (let offset = 0; offset < 80; offset += 1) {
    const forward = target + offset;
    const backward = target - offset;
    if (forward < text.length && breakChars.includes(text[forward])) {
      splitIndex = forward + 1;
      break;
    }
    if (backward > 0 && breakChars.includes(text[backward])) {
      splitIndex = backward + 1;
      break;
    }
  }

  return [text.slice(0, splitIndex).trim(), text.slice(splitIndex).trim()];
}

export default function PdfTranslatorApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const sessionRef = useRef<PdfTranslatorSession | null>(null);
  const translatorRef = useRef<TranslationController | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasPdfUrl = Boolean(state.pdfUrl);
  const isTranslateDisabled =
    !hasPdfUrl || state.loadState.status !== "ready" || !state.translationEnabled;

  useEffect(() => {
    stateRef.current = state;
    localStorage.setItem(API_KEY_STORAGE, state.apiKey);
    localStorage.setItem(MODEL_STORAGE, state.model);
    localStorage.setItem(ENDPOINT_STORAGE, state.endpoint);
    localStorage.setItem(TRANSLATION_ENABLED_STORAGE, String(state.translationEnabled));
    localStorage.setItem(DEPENDENCY_ENABLED_STORAGE, String(state.dependencyEnabled));
  }, [state]);

  if (!sessionRef.current) {
    sessionRef.current = new PdfTranslatorSession({
      dispatch,
      getState: () => stateRef.current,
      defaultScale: DEFAULT_SCALE
    });
  }
  if (!translatorRef.current) {
    translatorRef.current = new TranslationController({
      dispatch,
      getState: () => stateRef.current,
      splitTranslationByRatio
    });
  }

  useEffect(() => {
    if (!state.pdfUrl) return;

    let isActive = true;

    sessionRef.current?.loadPdf(() => isActive);

    return () => {
      isActive = false;
    };
  }, [state.pdfUrl]);

  const session = sessionRef.current!;
  const translator = translatorRef.current!;
  const handleParagraphVisible = session.handleParagraphVisible.bind(session);
  const handlePageVisible = (pageNumber: number) => {
    session.handlePageVisible(pageNumber);
    translator.handlePageVisible(pageNumber);
  };
  const handleTranslateAll = translator.handleTranslateAll.bind(translator);

  useEffect(() => {
    const translatorEnabled = state.translationEnabled || state.dependencyEnabled;
    translator.setEnabled(translatorEnabled);
    if (!translatorEnabled) {
      dispatch({ type: "reset_translations" });
    } else if (state.currentPage > 0) {
      translator.handlePageVisible(state.currentPage);
    }
  }, [state.translationEnabled, state.dependencyEnabled, translator, state.currentPage]);

  // dependency setting logs removed

  return (
    <div className={styles.page}>
      <TranslatorHeader
        onOpenSettings={() => setSettingsOpen(true)}
        pageCount={state.pages.length}
        currentPage={state.currentPage}
      />

      {settingsOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setSettingsOpen(false)} />
          <aside className={styles.settingsPanel}>
            <div className={styles.settingsHeader}>
              <h2>設定</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSettingsOpen(false)}
                aria-label="設定を閉じる"
              >
                ×
              </button>
            </div>
            <TranslatorSettings
              apiKey={state.apiKey}
              model={state.model}
              endpoint={state.endpoint}
              translationEnabled={state.translationEnabled}
              dependencyEnabled={state.dependencyEnabled}
              onApiKeyChange={(value) => dispatch({ type: "set_api_key", payload: value })}
              onModelChange={(value) => dispatch({ type: "set_model", payload: value })}
              onEndpointChange={(value) => dispatch({ type: "set_endpoint", payload: value })}
              onTranslationEnabledChange={(value) =>
                dispatch({ type: "set_translation_enabled", payload: value })
              }
              onDependencyEnabledChange={(value) =>
                dispatch({ type: "set_dependency_enabled", payload: value })
              }
              onTranslateAll={handleTranslateAll}
              isTranslateDisabled={isTranslateDisabled}
              isTranslating={state.isTranslating}
            />
          </aside>
        </>
      )}

      <main className={styles.main}>
        <PdfColumn
          hasPdfUrl={hasPdfUrl}
          loadState={state.loadState}
          pages={state.pages}
          pdfDoc={session?.getPdfDoc()}
          scale={DEFAULT_SCALE}
          showTranslations={state.translationEnabled}
          showDependencies={state.dependencyEnabled}
          onParagraphVisible={handleParagraphVisible}
          onPageVisible={handlePageVisible}
        />
      </main>
    </div>
  );
}
