"""Tests for CodeAnalysisAgent execution and difficulty normalization."""

import pytest
from app.agent import CodeAnalysisAgent
from app.providers import AgentError, ScriptedProvider


def test_agent_analyze_easy(mock_easy_response):
    """Test full analysis pass for an easy problem using ScriptedProvider."""
    provider = ScriptedProvider([mock_easy_response])
    agent = CodeAnalysisAgent(provider=provider)

    result = agent.analyze(
        code="def two_sum(nums, target): return [0, 1]",
        language="Python",
    )

    assert result.language == "Python"
    assert result.difficulty == "a"
    assert result.difficulty_label == "Easy"
    assert result.time_complexity == "O(N)"
    assert result.space_complexity == "O(N)"
    assert len(provider.call_log) == 1


def test_agent_normalizes_difficulty_strings():
    """Verify that model returns like 'Medium' or 'med' are properly normalized to 'b'."""
    raw_response = {
        "language": "C++",
        "approach": "Hash map with doubly linked list",
        "time_complexity": "O(1)",
        "space_complexity": "O(N)",
        "complexity_breakdown": "O(1) lookups and updates",
        "difficulty": "medium",  # String instead of 'b'
        "difficulty_label": "Medium",
        "key_observations": ["Double linked list for LRU"],
        "potential_optimizations": [],
    }
    provider = ScriptedProvider([raw_response])
    agent = CodeAnalysisAgent(provider=provider)

    result = agent.analyze(code="class LRUCache {};", language="C++")
    assert result.difficulty == "b"
    assert result.difficulty_label == "Medium"


def test_agent_normalizes_hard():
    """Verify that model returns like 'Hard' are properly normalized to 'c'."""
    raw_response = {
        "language": "Java",
        "approach": "Two pointer sweep",
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "complexity_breakdown": "Converging pointers",
        "difficulty": "Hard",
        "difficulty_label": "Hard",
        "key_observations": ["Optimal approach"],
        "potential_optimizations": [],
    }
    provider = ScriptedProvider([raw_response])
    agent = CodeAnalysisAgent(provider=provider)

    result = agent.analyze(code="class Solution { int trap(int[] h) {} }", language="Java")
    assert result.difficulty == "c"
    assert result.difficulty_label == "Hard"


def test_agent_empty_code_raises():
    """Ensure agent rejects empty or whitespace-only code."""
    agent = CodeAnalysisAgent(provider=ScriptedProvider([]))
    with pytest.raises(AgentError) as exc_info:
        agent.analyze(code="   ")
    assert exc_info.value.code == "empty_code"


def test_agent_schema_violation_raises():
    """Ensure malformed model output is handled cleanly with descriptive AgentError."""
    bad_output = {"language": "Python"}  # Missing required fields
    agent = CodeAnalysisAgent(provider=ScriptedProvider([bad_output]))

    with pytest.raises(AgentError) as exc_info:
        agent.analyze(code="x = 1", language="Python")
    assert exc_info.value.code == "schema_validation_error"


def test_default_mock_provider():
    """Verify default_mock generates valid schema output for testing."""
    from app.providers import default_mock
    provider = default_mock("C++")
    agent = CodeAnalysisAgent(provider=provider)
    res = agent.analyze("int main() { return 0; }", "C++")
    assert res.language == "C++"
    assert res.difficulty in ("a", "b", "c")
    assert res.difficulty_label in ("Easy", "Medium", "Hard")

