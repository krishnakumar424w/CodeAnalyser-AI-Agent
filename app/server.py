"""Production-ready HTTP Backend API Server for the Code Analysis Agent.
Provides REST API endpoints for upstream/downstream module integration:
- GET  /              : Service information, model specs, and CLI usage
- GET  /api/health    : Health check endpoint
- GET  /api/samples   : Retrieve bundled algorithmic samples
- POST /api/analyze   : Analyze source code payload (Python, C++, Java)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict

from app.agent import CodeAnalysisAgent
from app.providers import AgentError, GroqProvider, default_mock


class CodeAnalysisHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler for Code Analysis REST API."""

    server_version = "GroqCodeAnalysisBackend/1.0"

    def _send_json(self, status: int, data: Dict[str, Any]) -> None:
        """Helper to send JSON response with appropriate headers."""
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:
        """Handle CORS pre-flight requests."""
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self) -> None:
        """Route GET requests."""
        path = self.path.split("?")[0]

        if path in ("/", "/api", "/status"):
            self._send_json(
                HTTPStatus.OK,
                {
                    "service": "Groq-Powered Code Analysis Agent (Backend)",
                    "status": "online",
                    "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    "architecture": "pure-backend (no frontend)",
                    "endpoints": {
                        "GET /api/health": "Health and configuration check",
                        "GET /api/samples": "List available algorithm sample files",
                        "POST /api/analyze": "Analyze code payload {code, language, mock?}",
                    },
                    "cli_commands": [
                        "python agent.py --file samples/two_sum.py",
                        "python -m scripts.analyze --file samples/lru_cache.cpp",
                        "cat samples/trapping_rain_water.java | python agent.py --stdin --lang java",
                        "python -m pytest tests/",
                    ],
                },
            )
        elif path == "/api/health":
            has_key = bool(os.getenv("GROQ_API_KEY"))
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "groq_api_key_configured": has_key,
                    "default_model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                },
            )
        elif path == "/api/samples":
            samples_dir = Path("samples")
            sample_files = []
            if samples_dir.exists():
                for f in sorted(samples_dir.glob("*")):
                    if f.is_file():
                        sample_files.append({"filename": f.name, "path": str(f)})
            self._send_json(HTTPStatus.OK, {"samples": sample_files})
        else:
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"error": "not_found", "message": f"Endpoint '{path}' not found."},
            )

    def do_POST(self) -> None:
        """Route POST requests."""
        path = self.path.split("?")[0]

        if path == "/api/analyze":
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "empty_payload", "message": "Missing JSON request body."},
                )
                return

            try:
                body_bytes = self.rfile.read(content_length)
                payload = json.loads(body_bytes.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as err:
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "invalid_json", "message": f"Failed to parse JSON body: {err}"},
                )
                return

            code = payload.get("code") or payload.get("source_code") or ""
            language = payload.get("language") or payload.get("lang") or "Auto-Detect"
            use_mock = bool(payload.get("mock", False))
            model_name = payload.get("model") or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

            if not code.strip():
                self._send_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "missing_code", "message": "Field 'code' cannot be empty."},
                )
                return

            try:
                if use_mock:
                    provider = default_mock(language=language)
                else:
                    provider = GroqProvider(model=model_name)

                agent = CodeAnalysisAgent(provider=provider)
                analysis = agent.analyze(code=code, language=language)
                self._send_json(HTTPStatus.OK, analysis.model_dump())
            except AgentError as agent_err:
                self._send_json(
                    HTTPStatus.UNPROCESSABLE_ENTITY,
                    {
                        "error": agent_err.code,
                        "message": agent_err.message,
                        "retryable": agent_err.retryable,
                    },
                )
            except Exception as exc:
                self._send_json(
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                    {"error": "internal_error", "message": str(exc)},
                )
        else:
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {"error": "not_found", "message": f"Cannot POST to '{path}'"},
            )

    def log_message(self, format: str, *args: Any) -> None:
        """Custom log formatter to prevent cluttered output."""
        sys.stderr.write(f"[Server] {self.address_string()} - {format % args}\n")


def run_server(host: str = "0.0.0.0", port: int = 3000) -> None:
    """Run HTTP server listening on host and port."""
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, CodeAnalysisHandler)
    print(f"[Server] Backend API running at http://{host}:{port}/", file=sys.stderr)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down cleanly...", file=sys.stderr)
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Code Analysis Agent Backend HTTP Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=3000, help="Port (default: 3000)")
    args, unknown = parser.parse_known_args()
    run_server(host=args.host, port=args.port)
