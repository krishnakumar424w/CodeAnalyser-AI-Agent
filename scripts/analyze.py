"""CLI Script for running the Groq Code Analysis Agent.
Can be executed via:
    python -m scripts.analyze --file samples/two_sum.py
    python -m scripts.analyze --stdin --lang cpp < samples/lru_cache.cpp
    python -m scripts.analyze --json-input --file samples/sample_input.json --output analysis.json
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.agent import CodeAnalysisAgent
from app.providers import AgentError, GroqProvider, default_mock
from app.tools.code_parser import read_input_source


def parse_args() -> argparse.Namespace:
    """Configure and parse CLI command-line arguments."""
    parser = argparse.ArgumentParser(
        prog="analyze",
        description="Groq-Powered Code Analysis Agent (llama-3.3-70b-versatile)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Analyze a Python algorithm file and output JSON to stdout
  python -m scripts.analyze --file samples/two_sum.py

  # Analyze C++ code piped through stdin
  cat samples/lru_cache.cpp | python -m scripts.analyze --stdin --lang cpp

  # Read a JSON payload from an upstream pipeline module and write to file
  python -m scripts.analyze --json-input --file samples/sample_input.json --output result.json

  # Filter with jq
  python -m scripts.analyze --file samples/trapping_rain_water.java --quiet | jq '.difficulty'
        """,
    )

    input_group = parser.add_argument_group("Input Options")
    input_group.add_argument(
        "-f",
        "--file",
        type=str,
        help="Path to source code file (Python, C++, Java, etc.) or input JSON payload",
    )
    input_group.add_argument(
        "--stdin",
        action="store_true",
        help="Read source code or JSON payload directly from standard input",
    )
    input_group.add_argument(
        "--json-input",
        action="store_true",
        help="Indicate that input is a JSON payload with 'code' and 'language' fields",
    )
    input_group.add_argument(
        "-l",
        "--lang",
        type=str,
        default=None,
        help="Explicitly declare programming language (e.g., Python, C++, Java)",
    )

    output_group = parser.add_argument_group("Output Options")
    output_group.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Destination path to write output JSON (defaults to stdout)",
    )
    output_group.add_argument(
        "--indent",
        type=int,
        default=2,
        help="Number of spaces for JSON output indentation (default: 2; 0 for minified)",
    )
    output_group.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Suppress stderr diagnostic logs so stdout is strictly clean JSON",
    )

    model_group = parser.add_argument_group("Model Configuration")
    model_group.add_argument(
        "--model",
        type=str,
        default="llama-3.3-70b-versatile",
        help="Groq model identifier (default: llama-3.3-70b-versatile)",
    )
    model_group.add_argument(
        "--temperature",
        type=float,
        default=0.1,
        help="Sampling temperature (default: 0.1 for high determinism)",
    )
    model_group.add_argument(
        "--mock",
        action="store_true",
        help="Use simulated deterministic model analysis without requiring a GROQ_API_KEY or network quota",
    )

    return parser.parse_args()


def main() -> None:
    """Execute analysis workflow."""
    args = parse_args()

    if not args.file and not args.stdin:
        print(
            "ERROR: You must specify an input source using either --file <path> or --stdin.",
            file=sys.stderr,
        )
        sys.exit(2)

    try:
        code_content, language, source_name = read_input_source(
            file_path=args.file,
            is_stdin=args.stdin,
            is_json_input=args.json_input,
            explicit_lang=args.lang,
        )
    except Exception as read_err:
        print(f"INPUT ERROR: {read_err}", file=sys.stderr)
        sys.exit(3)

    if not args.quiet:
        mode_label = "mock provider" if args.mock else f"model '{args.model}'"
        print(
            f"[Agent] Analyzing {source_name} ({language}) using {mode_label}...",
            file=sys.stderr,
        )

    try:
        provider = default_mock(language) if args.mock else GroqProvider(model=args.model)
        agent = CodeAnalysisAgent(provider=provider)
        result = agent.analyze(
            code=code_content,
            language=language,
            temperature=args.temperature,
        )
    except AgentError as agent_err:
        print(f"AGENT ERROR: {agent_err}", file=sys.stderr)
        sys.exit(4)
    except Exception as exc:
        print(f"UNEXPECTED ERROR: {exc}", file=sys.stderr)
        sys.exit(5)

    indent_val = args.indent if args.indent > 0 else None
    json_output = result.model_dump_json(indent=indent_val)

    if args.output:
        try:
            out_path = Path(args.output)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json_output, encoding="utf-8")
            if not args.quiet:
                print(f"[Agent] Successfully wrote analysis to '{args.output}'", file=sys.stderr)
        except IOError as write_err:
            print(f"OUTPUT WRITE ERROR: Failed to write to {args.output}: {write_err}", file=sys.stderr)
            sys.exit(6)
    else:
        print(json_output)


if __name__ == "__main__":
    main()
