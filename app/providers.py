"""Model providers for the Code Analysis Agent.
Provides GroqProvider (official Groq API) and ScriptedProvider (for zero-quota testing).
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()


class AgentError(Exception):
    """An agent operation could not finish. `retryable` indicates if retrying may succeed."""

    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable

    def __str__(self) -> str:
        return f"[{self.code}] {self.message}"


class GroqProvider:
    """Production provider using the official Groq API client."""

    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None):
        from groq import Groq

        key = api_key or os.getenv("GROQ_API_KEY")
        if not key:
            raise AgentError(
                code="provider_missing_key",
                message="GROQ_API_KEY environment variable is not set. Please set it in .env or your shell.",
                retryable=False,
            )
        self.client = Groq(api_key=key)
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Request structured JSON completion from Groq."""
        from groq import APIStatusError, RateLimitError

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                model=self.model,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        except RateLimitError as e:
            raise AgentError(
                code="provider_rate_limited",
                message="Groq API rate limit reached. Please wait a moment before retrying.",
                retryable=True,
            ) from e
        except APIStatusError as e:
            status = getattr(e, "status_code", None)
            if status == 429:
                raise AgentError(
                    code="provider_rate_limited",
                    message="Groq API rate limit reached (HTTP 429).",
                    retryable=True,
                ) from e
            if status and status >= 500:
                raise AgentError(
                    code="provider_unavailable",
                    message=f"Groq service unavailable (HTTP {status}).",
                    retryable=True,
                ) from e
            raise AgentError(
                code="provider_error",
                message=f"Groq API error ({status}): {e}",
                retryable=False,
            ) from e
        except Exception as e:
            raise AgentError(
                code="provider_error",
                message=f"Unexpected error communicating with Groq API: {e}",
                retryable=False,
            ) from e

        content = chat_completion.choices[0].message.content
        if not content:
            raise AgentError(
                code="empty_response",
                message="Groq API returned an empty response.",
                retryable=True,
            )

        # Clean markdown code fences if inadvertently included
        clean = content.strip()
        if clean.startswith("```"):
            lines = clean.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean = "\n".join(lines).strip()

        try:
            return json.loads(clean)
        except json.JSONDecodeError as err:
            raise AgentError(
                code="json_decode_error",
                message=f"Failed to decode Groq JSON output: {err}",
                retryable=False,
            ) from err


class ScriptedProvider:
    """Mock provider that returns predetermined responses without making network calls.
    Used by unit tests to avoid burning Groq API quota.
    """

    def __init__(self, responses: List[Dict[str, Any]]):
        self.responses = list(responses)
        self.call_log: List[Dict[str, str]] = []

    def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        self.call_log.append({"system": system_prompt, "user": user_prompt})
        if not self.responses:
            raise AgentError(
                code="mock_exhausted",
                message="ScriptedProvider has no remaining simulated responses.",
                retryable=False,
            )
        next_resp = self.responses.pop(0)
        if isinstance(next_resp, Exception):
            raise next_resp
        return next_resp


def default_provider(model: Optional[str] = None) -> GroqProvider:
    """Factory returning configured GroqProvider or raising descriptive AgentError."""
    return GroqProvider(model=model)


def default_mock(language: str = "Python") -> ScriptedProvider:
    """Factory returning a ScriptedProvider with realistic algorithmic mock analysis.
    Permits deterministic CLI testing and demonstration without an API key or quota usage.
    """
    mock_payload = {
        "language": language if language != "Auto-Detect" else "Python",
        "approach": "Optimized algorithmic implementation with single-pass auxiliary lookups.",
        "time_complexity": "O(N)",
        "space_complexity": "O(N)",
        "complexity_breakdown": "Linear scan across input collection with O(1) hash map operations.",
        "difficulty": "a",
        "difficulty_label": "Easy",
        "key_observations": [
            "Trading linear auxiliary space to reduce search complexity from quadratic to linear time.",
            "Handles duplicate values and boundary edge conditions correctly.",
        ],
        "potential_optimizations": [
            "If input collection is already sorted, a two-pointer technique achieves O(1) space complexity.",
        ],
    }
    return ScriptedProvider([mock_payload])
