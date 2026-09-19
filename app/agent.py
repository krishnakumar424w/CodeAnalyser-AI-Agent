"""Core Code Analysis Agent implementation.
Orchestrates prompt generation, LLM provider interaction, difficulty normalization,
and Pydantic schema validation.
"""

from __future__ import annotations

import sys
from typing import Any, Dict, Optional
from pydantic import ValidationError

from app.domain import CodeAnalysisOutput, DIFFICULTY_MAP
from app.providers import AgentError, GroqProvider, default_provider
from app.tools.prompt_builder import SYSTEM_PROMPT, build_analysis_user_prompt


class CodeAnalysisAgent:
    """Agent that performs deep algorithmic code analysis using a model provider."""

    def __init__(self, provider: Optional[Any] = None, model: Optional[str] = None):
        self.provider = provider or default_provider(model=model)

    def analyze(
        self,
        code: str,
        language: str = "Auto-Detect",
        temperature: float = 0.1,
    ) -> CodeAnalysisOutput:
        """Analyze source code and return validated CodeAnalysisOutput."""
        if not code or not code.strip():
            raise AgentError(code="empty_code", message="Source code to analyze cannot be empty.")

        user_prompt = build_analysis_user_prompt(code=code, language=language)

        raw_data = self.provider.generate_json(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=temperature,
        )

        return self._validate_and_normalize(raw_data, fallback_language=language)

    def _validate_and_normalize(
        self,
        raw_data: Dict[str, Any],
        fallback_language: str,
    ) -> CodeAnalysisOutput:
        """Normalize difficulty codes and validate against Pydantic schema."""
        data = dict(raw_data)

        # Normalize difficulty rating to strictly 'a', 'b', or 'c'
        diff = str(data.get("difficulty", "")).strip().lower()
        if diff in ("easy", "e", "1"):
            diff = "a"
        elif diff in ("medium", "med", "m", "2"):
            diff = "b"
        elif diff in ("hard", "h", "3"):
            diff = "c"

        data["difficulty"] = diff
        data["difficulty_label"] = DIFFICULTY_MAP.get(diff, "Medium")

        # Fallback language if unspecified
        if not data.get("language") or data.get("language") == "Auto-Detect":
            data["language"] = fallback_language if fallback_language != "Auto-Detect" else "Unknown"

        try:
            return CodeAnalysisOutput.model_validate(data)
        except ValidationError as val_err:
            raise AgentError(
                code="schema_validation_error",
                message=f"Model output did not conform to the required JSON schema: {val_err}",
                retryable=False,
            ) from val_err
