"""D-06: モック自動キーワード推薦（ルールベース）"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class SuggestedKeyword:
    label: str
    confidence: float
    reason: str


DEFAULT_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Transformer", ("transformer", "attention", "bert", "gpt")),
    ("NLP", ("nlp", "language", "text", "token")),
    ("Computer Vision", ("vision", "image", "visual")),
    ("Graph Learning", ("graph", "gnn", "node", "edge")),
    ("Reinforcement Learning", ("reinforcement", "policy", "agent")),
    ("Optimization", ("optimization", "gradient", "loss")),
    ("Survey", ("survey", "review", "overview")),
]


def suggest_keywords_mock(
    title: str,
    abstract: str,
    owner_keyword_labels: list[str],
    limit: int = 5,
) -> list[SuggestedKeyword]:
    """
    論文タイトル/要旨からルールベースでキーワード候補を返す。
    D-05のVector Search連携前の暫定実装。
    """
    corpus = f"{title} {abstract}".lower()
    corpus = re.sub(r"\s+", " ", corpus).strip()

    suggestions: list[SuggestedKeyword] = []
    used_labels: set[str] = set()

    # 1) ユーザー定義キーワードにマッチするものを優先
    for label in owner_keyword_labels:
        label_norm = label.strip().lower()
        if not label_norm or label_norm in used_labels:
            continue
        if label_norm in corpus:
            suggestions.append(
                SuggestedKeyword(
                    label=label.strip(),
                    confidence=0.9,
                    reason="owner keyword match",
                )
            )
            used_labels.add(label_norm)

    # 2) 既定ルールで補完
    for label, triggers in DEFAULT_RULES:
        if len(suggestions) >= limit:
            break
        label_norm = label.lower()
        if label_norm in used_labels:
            continue
        if any(token in corpus for token in triggers):
            suggestions.append(
                SuggestedKeyword(
                    label=label,
                    confidence=0.75,
                    reason="rule trigger match",
                )
            )
            used_labels.add(label_norm)

    # 3) 何も引っかからない場合は薄いデフォルト候補
    if not suggestions:
        suggestions.append(
            SuggestedKeyword(
                label="General",
                confidence=0.55,
                reason="fallback",
            )
        )

    return suggestions[:limit]
