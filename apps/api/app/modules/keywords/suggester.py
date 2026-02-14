"""D-06: LLMベースの自動キーワード推薦"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SuggestedKeyword:
    label: str
    confidence: float
    reason: str


# ── Gemini (Vertex AI) によるLLM推薦 ──────────────────────────

async def suggest_keywords_llm(
    title: str,
    abstract: str,
    owner_keyword_labels: list[str],
    limit: int = 8,
) -> list[SuggestedKeyword]:
    """
    Gemini LLMで論文キーワード + 事前知識キーワードを英語で生成し、
    SuggestedKeyword のリストとして返す。

    既存ユーザーキーワードにマッチするものは confidence を高くする。
    """
    try:
        from app.core.gemini import gemini_client

        result = await gemini_client.generate_paper_keywords(title, abstract)
        keywords = result.get("keywords", [])
        prerequisite_keywords = result.get("prerequisite_keywords", [])

        suggestions: list[SuggestedKeyword] = []
        owner_labels_lower = {lbl.lower() for lbl in owner_keyword_labels}

        # 論文キーワード
        for kw in keywords:
            label = kw.strip()
            if not label:
                continue
            conf = 0.95 if label.lower() in owner_labels_lower else 0.85
            suggestions.append(
                SuggestedKeyword(label=label, confidence=conf, reason="llm_paper_keyword")
            )

        # 事前知識キーワード
        for kw in prerequisite_keywords:
            label = kw.strip()
            if not label:
                continue
            conf = 0.90 if label.lower() in owner_labels_lower else 0.75
            suggestions.append(
                SuggestedKeyword(label=label, confidence=conf, reason="llm_prerequisite_keyword")
            )

        return suggestions[:limit * 2]  # keywords + prerequisite で多めに返す

    except Exception as exc:
        logger.warning("LLM keyword suggestion failed, falling back to rule-based: %s", exc)
        return suggest_keywords_mock(title, abstract, owner_keyword_labels, limit)


# ── フォールバック: ルールベースのモック推薦 ────────────────────

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
    LLM推薦のフォールバック。
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
