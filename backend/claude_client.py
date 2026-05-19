import anthropic
import json
import os
import re

MODEL = "claude-sonnet-4-6"


def _parse_json(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}") + 1
    raw = text[start:end]
    raw = re.sub(r",\s*([}\]])", r"\1", raw)
    return json.loads(raw)


class ClaudeClient:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not set in environment")
        self.client = anthropic.Anthropic(api_key=api_key)

    def cluster_feedback(self, feedback_list: list[str], language: str) -> tuple[dict, dict]:
        lang_instruction = (
            "Respond entirely in Russian. Use Russian for all names, descriptions, and reasoning."
            if language == "ru"
            else "Respond entirely in English."
        )
        feedback_text = "\n".join([f"{i + 1}. {item}" for i, item in enumerate(feedback_list)])
        prompt = f"""You are an expert product manager. Analyze the following user feedback items and:
1. Group them into 3–8 meaningful clusters of similar requests.
2. For each cluster, estimate RICE scores using the guidelines below.

{lang_instruction}

User Feedback:
{feedback_text}

Return ONLY valid JSON — no markdown fences, no extra text — in exactly this structure:
{{
  "clusters": [
    {{
      "id": 1,
      "name": "Short cluster name (2–4 words)",
      "description": "What users are asking for (1–2 sentences).",
      "items": ["verbatim feedback item 1", "verbatim feedback item 2"],
      "item_count": 3,
      "rice": {{
        "reach": 500,
        "reach_reasoning": "Why this reach estimate",
        "impact": 1,
        "impact_reasoning": "Why this impact level (0.25=minimal, 0.5=low, 1=medium, 2=high, 3=massive)",
        "confidence": 70,
        "confidence_reasoning": "Why this confidence % (0–100)",
        "effort": 2,
        "effort_reasoning": "Why this effort in person-months"
      }}
    }}
  ]
}}

RICE Guidelines:
- Reach: integer 1–10000, estimated users affected per quarter
- Impact: one of 0.25, 0.5, 1, 2, 3
- Confidence: integer 0–100 (percentage)
- Effort: person-months, use 0.5 steps (0.5, 1, 1.5, 2, …)
- RICE Score = (Reach × Impact × Confidence / 100) / Effort"""

        response = self.client.messages.create(
            model=MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        usage = {"input": response.usage.input_tokens, "output": response.usage.output_tokens}
        return _parse_json(raw), usage

    def _prd_prompt(self, clusters: list[dict], language: str, initiative_id: int | None = None) -> str:
        sorted_clusters = sorted(clusters, key=lambda x: x["rice_score"], reverse=True)
        if initiative_id is not None:
            match = next((c for c in clusters if c.get("id") == initiative_id), None)
            top = match if match is not None else sorted_clusters[0]
        else:
            top = sorted_clusters[0]
        others = [c for c in sorted_clusters if c.get("id") != top.get("id")]
        rice = top["rice"]

        top_block = (
            f"Initiative name: {top['name']}\n"
            f"Description: {top['description']}\n"
            f"Based on {top['item_count']} user feedback items.\n"
            f"\n"
            f"RICE scoring:\n"
            f"- Reach: {rice['reach']} users/quarter — {rice['reach_reasoning']}\n"
            f"- Impact: {rice['impact']}x — {rice['impact_reasoning']}\n"
            f"- Confidence: {rice['confidence']}% — {rice['confidence_reasoning']}\n"
            f"- Effort: {rice['effort']} person-months — {rice['effort_reasoning']}\n"
            f"- RICE score: {top['rice_score']:.0f}\n"
        )
        items = top.get("items") or []
        if items:
            top_block += "\nUser feedback excerpts (verbatim):\n"
            top_block += "\n".join(f"- {it}" for it in items) + "\n"

        context_block = ""
        if others:
            context_block = (
                "\nOther feature themes identified in the same dataset "
                "(use ONLY as background context if helpful, "
                "do NOT write a separate PRD for them):\n"
            )
            for c in others:
                context_block += f"- {c['name']} (RICE {c['rice_score']:.0f}): {c['description']}\n"

        is_ru = language == "ru"
        lang_label = "Russian" if is_ru else "English"

        if is_ru:
            s5_1, s5_2, s5_3 = "Целевые пользователи", "Ключевые пользовательские сценарии", "User Stories"
        else:
            s5_1, s5_2, s5_3 = "Target Users", "Key User Scenarios", "User Stories"

        return f"""You are a Senior Product Manager / Product Lead. Generate a concise, high-signal PRD for the top-priority initiative described below.

Write the entire PRD body in **{lang_label}**. The section headings (numbered titles like "## 1. Summary") MUST be reproduced EXACTLY as shown in the template below — do not translate, rename, reorder, add, or remove them.

# Input

{top_block}{context_block}

# Required structure (reproduce headings verbatim)

```
# PRD: <initiative name>

# A. Executive Layer

## 1. Summary

## 2. Problem

## 3. Goal

## 4. Expected Business Impact

# B. Product Layer

## 5. Users & Scenarios

### 5.1. {s5_1}

### 5.2. {s5_2}

### 5.3. {s5_3}

## 6. Hypothesis

## 7. Solution Overview

## 8. Success Metrics

### 8.1. Primary Metric

### 8.2. Secondary Metrics
```

Numbering is sequential — do not insert a "Scope / Non-scope" section or any other section between Hypothesis and Solution Overview.

# Hard rules

1. Output ONLY the Markdown document. No preamble, no closing notes, no code fences around the whole thing.
2. Do NOT add any of the following sections (anywhere, at any level):
   - Scope / Non-scope (intentionally excluded)
   - Guardrail Metrics (intentionally excluded)
   - Functional Requirements, Business Rules, Edge Cases, Acceptance Criteria (intentionally excluded — this is a product-level PRD, not a delivery spec)
   - Dependencies, Risks, Rollout Plan, Open Questions, Decision Log
   - Assumptions as a standalone block
   - A separate analytics block
   - A separate non-functional requirements block
   - A separate UX & Flows block
   - A separate UI states block
   If such information is important and present in the input, fold it briefly into the most appropriate allowed section instead of creating a new heading.
3. Do NOT invent facts, numbers, percentages, dollar amounts, dates, or evidence that are not in the input.
4. When the input is thin, never leave a required section empty. Use cautious phrasing inside the section — e.g., "Предполагается, что…", "На основании текущего описания…" / "Based on the current description…", "Requires further validation, but for the purposes of this PRD we can assume…". The document must still read as a coherent PRD.
5. Stay at the product level. Do NOT specify architecture, technology choices, API contracts, DB schemas, or implementation internals unless they are explicitly given in the input.
6. Be **concise**. This is a product-level PRD meant to be read in a few minutes, not a delivery specification. Prefer tight paragraphs and short bullet lists over exhaustive prose.
7. Style: structured, business-clear, no fluff, no marketing tone, no excessive jargon. Causal flow must hold: **problem → goal → hypothesis → solution → metrics**.
8. Title line: `# PRD: <initiative name>` — use the initiative name from the input.

# Self-check before emitting

- Structure matches the template exactly — only blocks A and B, only the listed sections, numbering 1..8 sequential.
- Problem, Goal, Hypothesis, and Solution Overview are causally consistent.
- Success Metrics are tied to the stated Goal and Expected Business Impact.
- No invented numbers, no forbidden sections, no delivery-layer content.
- Document reads as a focused product brief, not an exhaustive specification.

Now produce the PRD."""

    def stream_prd(self, clusters: list[dict], language: str, initiative_id: int | None = None):
        return self.client.messages.stream(
            model=MODEL,
            max_tokens=4500,
            messages=[{"role": "user", "content": self._prd_prompt(clusters, language, initiative_id)}],
        )

    def _exec_summary_prompt(self, clusters: list[dict], language: str) -> str:
        lang_instruction = (
            "Write the entire summary in Russian." if language == "ru" else "Write the entire summary in English."
        )
        sorted_clusters = sorted(clusters, key=lambda x: x["rice_score"], reverse=True)
        clusters_text = ""
        for i, c in enumerate(sorted_clusters, 1):
            clusters_text += (
                f"\n{i}. {c['name']} — RICE Score: {c['rice_score']:.0f}\n"
                f"   {c['description']}\n"
                f"   Reach: {c['rice']['reach']} | Impact: {c['rice']['impact']}x | "
                f"Confidence: {c['rice']['confidence']}% | Effort: {c['rice']['effort']} person-months\n"
            )
        return f"""You are a senior product manager. Write a concise one-page executive summary for stakeholders.
{lang_instruction}

Prioritized Feature Backlog:
{clusters_text}

Write a structured executive summary in clean Markdown with exactly these sections:

## Executive Summary

### Top Priorities
(Top 3 features with a 1–2 sentence rationale each, referencing RICE scores)

### Key Metrics & Expected Impact

### Recommended Next Steps
(3–5 actionable bullets, ordered by priority)

### Risks & Dependencies

Keep it to one page (~400 words). Be crisp and business-focused."""

    def stream_executive_summary(self, clusters: list[dict], language: str):
        return self.client.messages.stream(
            model=MODEL,
            max_tokens=1500,
            messages=[{"role": "user", "content": self._exec_summary_prompt(clusters, language)}],
        )
