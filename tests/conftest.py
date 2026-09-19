"""Shared pytest fixtures for the Code Analysis Agent test suite."""

import pytest
from app.providers import ScriptedProvider


@pytest.fixture
def mock_easy_response():
    """Mock LLM response for an Easy ('a') problem (e.g. Two Sum with Hash Map)."""
    return {
        "language": "Python",
        "approach": "Hash map single pass complementary lookup.",
        "time_complexity": "O(N)",
        "space_complexity": "O(N)",
        "complexity_breakdown": "Linear scan through the array with O(1) hash map operations.",
        "difficulty": "a",
        "difficulty_label": "Easy",
        "key_observations": [
            "Trading space for time using an auxiliary hash map.",
            "Handles duplicate values naturally via complement checks.",
        ],
        "potential_optimizations": [
            "If input array is pre-sorted, two-pointer approach yields O(1) space.",
        ],
    }


@pytest.fixture
def mock_medium_response():
    """Mock LLM response for a Medium ('b') problem (e.g. LRU Cache)."""
    return {
        "language": "C++",
        "approach": "Hash map combined with doubly-linked list for O(1) eviction.",
        "time_complexity": "O(1)",
        "space_complexity": "O(capacity)",
        "complexity_breakdown": "Hash map gives O(1) key-to-node access, doubly linked list allows O(1) splice/remove.",
        "difficulty": "b",
        "difficulty_label": "Medium",
        "key_observations": [
            "Dummy head and tail nodes simplify edge cases in doubly-linked list splice.",
        ],
        "potential_optimizations": [
            "Use std::list::splice to avoid redundant memory allocations during move-to-front.",
        ],
    }


@pytest.fixture
def mock_hard_response():
    """Mock LLM response for a Hard ('c') problem (e.g. Trapping Rain Water)."""
    return {
        "language": "Java",
        "approach": "Two-pointer convergent sweep maintaining prefix and suffix maximums.",
        "time_complexity": "O(N)",
        "space_complexity": "O(1)",
        "complexity_breakdown": "Pointers meet in single pass; space is constant auxiliary variables.",
        "difficulty": "c",
        "difficulty_label": "Hard",
        "key_observations": [
            "Water level at any index depends strictly on min(max_left, max_right).",
        ],
        "potential_optimizations": [
            "Current two-pointer solution is already asymptotically optimal in both time and space.",
        ],
    }


@pytest.fixture
def scripted_provider(mock_easy_response):
    """A ScriptedProvider pre-loaded with mock responses."""
    return ScriptedProvider([mock_easy_response])
