const DEFAULT_MODEL = "gpt-5-mini-2025-08-07";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";

export const OPENAI_DEFAULTS = {
  model: DEFAULT_MODEL,
  endpoint: DEFAULT_ENDPOINT
};

function clampText(text: string, limit = 12000) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[...truncated for request size...]`;
}

function extractOutputText(data: any): string {
  if (!data?.output) return "";
  const chunks: string[] = [];
  for (const item of data.output) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

export async function translateWithOpenAI({
  endpoint,
  apiKey,
  model,
  text
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  text: string;
}) {
  /**
   * 指定テキストをOpenAI Responses APIで翻訳して返す。
   * 依存: `fetch` / Responses API
   * 役割: 翻訳処理の単一窓口（PdfTranslatorAppから呼ばれる）。
   */
  const normalizedKey = apiKey?.trim() ?? "";
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${normalizedKey}`
    },
    body: JSON.stringify({
      model,
      reasoning: {
        effort: "low"
      },
      instructions:
        "与えられた英語を情報処理学会論文誌の形式の日本語に翻訳してください。翻訳結果以外の内容を含めないでください。",
      input: clampText(text)
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "OpenAI request failed");
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("No output text returned by OpenAI.");
  }

  return outputText;
}

export async function analyzeOcTargetsWithOpenAI({
  endpoint,
  apiKey,
  model,
  text
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  text: string;
}) {
  const normalizedKey = apiKey?.trim() ?? "";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${normalizedKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "For the following English paragraph, bracket only O (object) and C (complement) spans.",
                "Use bracket format like: (O ... ) and (C ... ). You may include multiple O/C spans.",
                "Return ONLY valid JSON with the shape:",
                "{\"tokens\":[\"...\"],\"bracket\":\"(O ... ) (C ... )\"}",
                "Tokens must be whitespace-split tokens in order. Bracket must use the same tokens.",
                "Do not include any extra text.",
                "",
                text
              ].join("\n")
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "OpenAI request failed");
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("No output text returned by OpenAI.");
  }

  const parsed = JSON.parse(outputText);
  return parsed as {
    tokens: string[];
    bracket: string;
  };
}
