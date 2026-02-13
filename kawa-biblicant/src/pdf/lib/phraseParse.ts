export type OcTarget = { role: "O" | "C"; start: number; end: number };

type StackItem = {
  role: "O" | "C" | null;
  start: number | null;
};

const normalize = (value: string) =>
  value
    .replace(/[“”"()]/g, "")
    .replace(/[.,;:!?]/g, "")
    .trim()
    .toLowerCase();

export function parseBracketedOcTargets(bracket: string, tokens: string[]) {
  const targets: OcTarget[] = [];
  const stack: StackItem[] = [];
  const parts = bracket
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  let tokenIndex = 0;

  for (const part of parts) {
    if (part.startsWith("(")) {
      const label = part.replace("(", "").trim().toUpperCase();
      const role = label === "O" || label === "C" ? (label as "O" | "C") : null;
      stack.push({ role, start: null });
      continue;
    }

    if (part.endsWith(")")) {
      const tokenPart = part.replace(")", "");
      if (tokenPart) {
        tokenIndex = consumeToken(tokenPart, tokens, tokenIndex, stack);
      }
      const current = stack.pop();
      if (current && current.role && current.start !== null) {
        const end = Math.max(current.start, tokenIndex - 1);
        targets.push({ role: current.role, start: current.start, end });
      }
      continue;
    }

    tokenIndex = consumeToken(part, tokens, tokenIndex, stack);
  }

  return targets;
}

function consumeToken(
  token: string,
  tokens: string[],
  tokenIndex: number,
  stack: StackItem[]
) {
  if (tokenIndex >= tokens.length) return tokenIndex;
  const targetToken = tokens[tokenIndex];
  const normalized = normalize(token);
  const normalizedTarget = normalize(targetToken);

  if (normalized && normalizedTarget && normalized !== normalizedTarget) {
    const nextIndex = tokens.findIndex(
      (candidate, idx) => idx >= tokenIndex && normalize(candidate) === normalized
    );
    if (nextIndex !== -1) {
      tokenIndex = nextIndex;
    }
  }

  stack.forEach((item) => {
    if (item.role && item.start === null) {
      item.start = tokenIndex;
    }
  });

  return tokenIndex + 1;
}
