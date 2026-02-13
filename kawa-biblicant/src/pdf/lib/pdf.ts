import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import type { PageTranslation, ParagraphTranslation } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function loadPdfDocument(url: string) {
  /**
   * PDFをURLから取得し、PDF.jsのドキュメントを返す。
   * 依存: pdfjs-dist の `getDocument`
   * 役割: 上位（PdfTranslatorApp）がページ列を読み込むための入口。
   */
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status}`);
  }
  const data = await response.arrayBuffer();
  return pdfjsLib.getDocument({ data }).promise;
}

export async function renderPageToCanvas({
  page,
  canvas,
  scale
}: {
  page: any;
  canvas: HTMLCanvasElement;
  scale: number;
}) {
  /**
   * 指定ページをCanvasに描画し、描画サイズを返す。
   * 依存: pdfjs-dist の `page.render`
   * 役割: PdfPage がPDF本体を描画する際の共通処理。
   */
  const viewport = page.getViewport({ scale });
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context not available.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  return { width: viewport.width, height: viewport.height };
}

function buildParagraphsFromItems(
  items: any[],
  viewport: any,
  pageNumber: number
): ParagraphTranslation[] {
  /**
   * PDF.jsのtextContent.itemsを順序通りに舐め、
   * 行間/インデント/カラム巻き戻りを用いて段落を組み立てる。
   * 依存: pdfjs-dist の `Util.transform`（座標取得）
   * 役割: 抽出テキストを段落単位のbboxへ変換するコアロジック。
   */
  const paragraphs: ParagraphTranslation[] = [];
  let current: ParagraphTranslation | null = null;
  let lastY: number | null = null;
  let lastHeight = 0;
  let currentLineStartX: number | null = null;
  let previousLineStartX: number | null = null;
  let avgCharWidth = 0;
  let avgCharCount = 0;
  const lineThreshold = 6;
  let mergeGroupCount = 0;
  let lineCount = 0;
  const symbolRegex = /[=+\-×*/^_∑∫∂≤≥≈≠→←↔]/g;

  const computeCharWidth = (text: string, width: number) =>
    text.length > 0 ? width / text.length : 0;

  const updateAvgCharWidth = (text: string, width: number) => {
    if (!text.length) return;
    const charWidth = computeCharWidth(text, width);
    avgCharWidth = (avgCharWidth * avgCharCount + charWidth) / (avgCharCount + 1);
    avgCharCount += 1;
  };

  const isNewLine = (y: number) => lastY === null || Math.abs(y - lastY) > lineThreshold;
  const isNewColumn = (y: number) => lastY !== null && y < lastY - lineThreshold;

  const isIndentedLine = (isLineBreak: boolean, isColumnBreak: boolean) => {
    const indentThreshold = Math.max(8, avgCharWidth * 2.0);
    return (
      isLineBreak &&
      !isColumnBreak &&
      previousLineStartX !== null &&
      currentLineStartX !== null &&
      currentLineStartX - previousLineStartX > indentThreshold
    );
  };

  const shouldBreakParagraph = (gap: number, height: number, isIndented: boolean, isColumn: boolean) => {
    const threshold = Math.max(height, lastHeight || height) * 1.4;
    return gap > threshold || isIndented || isColumn;
  };

  const updateMathLike = (paragraph: ParagraphTranslation) => {
    const text = paragraph.text;
    const symbolCount = (text.match(symbolRegex) ?? []).length;
    const tokens = text.split(/\s+/).filter(Boolean);
    const shortTokens = tokens.filter((token) => token.length <= 2).length;
    const symbolRatio = symbolCount / Math.max(text.length, 1);
    const shortTokenRatio = shortTokens / Math.max(tokens.length, 1);
    paragraph.isMathLike = symbolRatio > 0.08 && shortTokenRatio > 0.5;
  };

  const createParagraph = (x: number, y: number, width: number, height: number, text: string) => {
    const paragraph: ParagraphTranslation = {
      id: `${pageNumber}-${paragraphs.length + 1}`,
      text,
      bbox: {
        x,
        y: y - height,
        width,
        height
      },
      translation: "",
      status: "idle",
      lineCount: 1,
      isMathLike: false,
      tokenPositions: []
    };
    updateMathLike(paragraph);
    return paragraph;
  };

  const appendToParagraph = (
    paragraph: ParagraphTranslation,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string
  ) => {
    paragraph.text = `${paragraph.text} ${text}`.trim();
    const minX = Math.min(paragraph.bbox.x, x);
    const minY = Math.min(paragraph.bbox.y, y - height);
    const maxX = Math.max(paragraph.bbox.x + paragraph.bbox.width, x + width);
    const maxY = Math.max(paragraph.bbox.y + paragraph.bbox.height, y);
    paragraph.bbox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    paragraph.lineCount = Math.max(paragraph.lineCount ?? 1, lineCount);
    updateMathLike(paragraph);
  };

  const maybeMarkMergeGroup = (isColumnBreak: boolean, isIndented: boolean, nextParagraph: ParagraphTranslation) => {
    if (!isColumnBreak || isIndented || paragraphs.length === 0) return;
    const previous = paragraphs[paragraphs.length - 1];
    const mergeId = previous.mergeGroupId ?? `${pageNumber}-merge-${mergeGroupCount++}`;
    previous.mergeGroupId = mergeId;
    previous.mergeIndex = 0;
    nextParagraph.mergeGroupId = mergeId;
    nextParagraph.mergeIndex = 1;
  };

  const appendTokens = (
    paragraph: ParagraphTranslation,
    rawText: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    if (!rawText.trim()) return;
    const charWidth = rawText.length > 0 ? width / rawText.length : 0;
    const matches = Array.from(rawText.matchAll(/\S+/g));
    matches.forEach((match) => {
      if (typeof match.index !== "number") return;
      const token = match[0];
      const tokenX = x + match.index * charWidth;
      const tokenWidth = token.length * charWidth;
      paragraph.tokenPositions?.push({
        token,
        x: tokenX,
        y,
        width: tokenWidth,
        height
      });
    });
  };

  items.forEach((item) => {
    if (!item.str) return;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const x = tx[4];
    const y = tx[5];
    const height = Math.abs(tx[3]) || item.height || 10;
    const width = item.width ? item.width * viewport.scale : item.width || 0;

    const lineBreak = isNewLine(y);
    const columnBreak = isNewColumn(y);
    if (lineBreak) {
      previousLineStartX = columnBreak ? null : currentLineStartX;
      currentLineStartX = x;
      lineCount = current ? lineCount + 1 : 1;
    } else if (currentLineStartX === null) {
      currentLineStartX = x;
    }

    const gap = lastY === null ? 0 : Math.abs(y - lastY);
    const isIndented = isIndentedLine(lineBreak, columnBreak);
    const shouldBreak = shouldBreakParagraph(gap, height, isIndented, columnBreak);

    if (!current || shouldBreak) {
      if (current) paragraphs.push(current);
      current = createParagraph(x, y, width, height, item.str);
      appendTokens(current, item.str, x, y, width, height);
      lineCount = 1;

      maybeMarkMergeGroup(columnBreak, isIndented, current);
    } else {
      appendToParagraph(current, x, y, width, height, item.str);
      appendTokens(current, item.str, x, y, width, height);
    }

    lastY = y;
    lastHeight = height;
    updateAvgCharWidth(item.str, width);
  });

  if (current) paragraphs.push(current);
  return paragraphs;
}

export async function extractParagraphs({
  page,
  pageNumber,
  scale
}: {
  page: any;
  pageNumber: number;
  scale: number;
}): Promise<PageTranslation> {
  /**
   * 1ページ分の段落配列（bbox付き）を生成して返す。
   * 依存: `page.getTextContent` + `buildParagraphsFromItems`
   * 役割: PdfTranslatorApp がページごとの段落データを構築するための入口。
   */
  const viewport = page.getViewport({ scale });
  const textContent = await page.getTextContent();
  if (pageNumber === 1) {
    console.log("pdfjs textContent.items (page 1):", textContent.items);
  }
  const paragraphs = buildParagraphsFromItems(textContent.items ?? [], viewport, pageNumber);

  if (pageNumber === 1) {
    console.log(
      "paragraphs (page 1):",
      paragraphs.map((p, index) => ({
        index: index + 1,
        text: p.text,
        bbox: p.bbox
      }))
    );
  }

  return {
    pageNumber,
    paragraphs
  };
}
