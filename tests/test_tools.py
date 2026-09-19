"""Tests for input parsing, language detection, and file readers."""

import json
import pytest
from pathlib import Path

from app.tools.code_parser import detect_language, read_input_source


def test_detect_language():
    """Test file extension mapping and explicit overrides."""
    assert detect_language("solution.py") == "Python"
    assert detect_language("code.cpp") == "C++"
    assert detect_language("Main.java") == "Java"
    assert detect_language("source.cxx") == "C++"
    assert detect_language("script.py", explicit_lang="C++") == "C++"
    assert detect_language("unknown.xyz") == "Auto-Detect"


def test_read_sample_files():
    """Verify reading sample files from samples/ directory."""
    code, lang, name = read_input_source(file_path="samples/two_sum.py")
    assert "two_sum" in code
    assert lang == "Python"

    code, lang, name = read_input_source(file_path="samples/lru_cache.cpp")
    assert "LRUCache" in code
    assert lang == "C++"

    code, lang, name = read_input_source(file_path="samples/trapping_rain_water.java")
    assert "trap" in code
    assert lang == "Java"


def test_read_json_payload():
    """Test extracting code and language from structured upstream JSON payload."""
    code, lang, name = read_input_source(
        file_path="samples/sample_input.json",
        is_json_input=True,
    )
    assert "binary_search" in code
    assert lang == "Python"


def test_missing_file_raises():
    """Test error raised when targeting non-existent file."""
    with pytest.raises(FileNotFoundError):
        read_input_source(file_path="non_existent_file.cpp")


def test_empty_input_raises():
    """Test error raised when input has no content."""
    with pytest.raises(ValueError):
        read_input_source(file_path=None, is_stdin=False)
