"""Domain models and Pydantic schemas for the Code Analysis Agent.
Enforces strict difficulty classification: 'a' (Easy), 'b' (Medium), 'c' (Hard).
"""

from __future__ import annotations

from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# Canonical mapping for difficulty codes
DIFFICULTY_MAP: Dict[str, str] = {
    "a": "Easy",
    "b": "Medium",
    "c": "Hard",
}

# Supported file extensions to language names
EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".py": "Python",
    ".pyw": "Python",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c++": "C++",
    ".h": "C++",
    ".hpp": "C++",
    ".java": "Java",
}


class CodeAnalysisOutput(BaseModel):
    """Pydantic schema enforcing structured output from the Groq LLM."""

    language: str = Field(
        description="Programming language of the analyzed code (e.g., Python, C++, Java)"
    )
    approach: str = Field(
        description="Concise description of the algorithmic approach and primary technique used"
    )
    time_complexity: str = Field(
        description="Big-O time complexity formatted clearly, e.g., O(N), O(N log N), O(V + E)"
    )
    space_complexity: str = Field(
        description="Big-O auxiliary space complexity formatted clearly, e.g., O(1), O(N)"
    )
    complexity_breakdown: str = Field(
        description="Clear breakdown explaining how the time and space complexities were derived"
    )
    difficulty: Literal["a", "b", "c"] = Field(
        description="Strict difficulty rating: 'a' for Easy, 'b' for Medium, 'c' for Hard"
    )
    difficulty_label: Literal["Easy", "Medium", "Hard"] = Field(
        description="Human-readable difficulty string corresponding to the grade"
    )
    key_observations: List[str] = Field(
        default_factory=list,
        description="Key algorithmic bottlenecks, invariants, or edge-case handling observations",
    )
    potential_optimizations: List[str] = Field(
        default_factory=list,
        description="Constructive optimization opportunities or alternative approaches",
    )


class CodeAnalysisRequest(BaseModel):
    """Input request model for source code analysis."""

    code: str = Field(description="Raw source code content to analyze")
    language: Optional[str] = Field(
        default=None,
        description="Programming language (e.g., Python, C++, Java). Auto-detected if omitted.",
    )
    file_path: Optional[str] = Field(
        default=None,
        description="Optional origin file path or identifier",
    )
