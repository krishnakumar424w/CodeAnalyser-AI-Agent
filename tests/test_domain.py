"""Tests for domain models and Pydantic schema validation."""

import pytest
from pydantic import ValidationError

from app.domain import CodeAnalysisOutput, DIFFICULTY_MAP


def test_valid_domain_schema(mock_easy_response):
    """Ensure a compliant schema payload parses without error."""
    output = CodeAnalysisOutput.model_validate(mock_easy_response)
    assert output.language == "Python"
    assert output.difficulty == "a"
    assert output.difficulty_label == "Easy"
    assert output.time_complexity == "O(N)"
    assert output.space_complexity == "O(N)"
    assert len(output.key_observations) == 2


def test_difficulty_strict_values(mock_easy_response):
    """Test that difficulty strictly allows 'a', 'b', or 'c' and rejects anything else."""
    data = dict(mock_easy_response)

    # Valid values
    for code, label in [("a", "Easy"), ("b", "Medium"), ("c", "Hard")]:
        data["difficulty"] = code
        data["difficulty_label"] = label
        obj = CodeAnalysisOutput.model_validate(data)
        assert obj.difficulty == code
        assert obj.difficulty_label == label

    # Invalid value should raise ValidationError
    data["difficulty"] = "d"
    with pytest.raises(ValidationError):
        CodeAnalysisOutput.model_validate(data)

    data["difficulty"] = "easy"  # must be 'a'
    with pytest.raises(ValidationError):
        CodeAnalysisOutput.model_validate(data)


def test_missing_required_fields(mock_easy_response):
    """Test that missing essential fields triggers validation failure."""
    for field in ["language", "approach", "time_complexity", "space_complexity", "difficulty"]:
        bad_data = dict(mock_easy_response)
        del bad_data[field]
        with pytest.raises(ValidationError):
            CodeAnalysisOutput.model_validate(bad_data)


def test_difficulty_map_integrity():
    """Verify DIFFICULTY_MAP has all three canonical values."""
    assert DIFFICULTY_MAP == {"a": "Easy", "b": "Medium", "c": "Hard"}
