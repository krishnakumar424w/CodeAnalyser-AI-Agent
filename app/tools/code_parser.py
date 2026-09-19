"""Tools for reading source code from files, standard input, or JSON payloads."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional, Tuple

from app.domain import EXTENSION_LANGUAGE_MAP


def detect_language(file_path: Optional[str], explicit_lang: Optional[str] = None) -> str:
    """Infer the programming language from explicit argument, file extension, or default."""
    if explicit_lang:
        return explicit_lang.strip()
    if file_path:
        suffix = Path(file_path).suffix.lower()
        if suffix in EXTENSION_LANGUAGE_MAP:
            return EXTENSION_LANGUAGE_MAP[suffix]
    return "Auto-Detect"


def read_input_source(
    file_path: Optional[str] = None,
    is_stdin: bool = False,
    is_json_input: bool = False,
    explicit_lang: Optional[str] = None,
) -> Tuple[str, str, str]:
    """Read source code and metadata from file, stdin, or JSON stream.

    Returns:
        Tuple of (code_content, language, source_name)
    """
    code_content = ""
    source_name = "input"
    language = explicit_lang or ""

    if is_json_input:
        raw_json = (
            sys.stdin.read()
            if is_stdin or not file_path
            else Path(file_path).read_text(encoding="utf-8")
        )
        try:
            payload = json.loads(raw_json)
            if not isinstance(payload, dict):
                raise ValueError("JSON input payload must be a JSON object (key-value mapping).")
            code_content = payload.get("code") or payload.get("source_code") or ""
            if not code_content:
                raise ValueError("JSON payload missing required 'code' or 'source_code' key.")
            source_name = payload.get("file_path") or payload.get("filename") or "payload.json"
            payload_lang = payload.get("language") or payload.get("lang")
            if payload_lang and not language:
                language = payload_lang
        except json.JSONDecodeError as exc:
            raise ValueError(f"Failed to decode incoming JSON input: {exc}") from exc
    elif is_stdin:
        code_content = sys.stdin.read()
        source_name = "<stdin>"
    elif file_path:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Source code file not found: {file_path}")
        if not path.is_file():
            raise ValueError(f"Target path is not a file: {file_path}")
        try:
            code_content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            code_content = path.read_text(encoding="latin-1")
        source_name = str(path)
    else:
        raise ValueError("No input source provided. Specify --file, --stdin, or --json-input.")

    if not code_content.strip():
        raise ValueError(f"Input source ({source_name}) is empty.")

    language = language or detect_language(source_name, explicit_lang)
    return code_content, language, source_name
