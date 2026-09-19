"""Tests for Backend HTTP API Server."""

import json
import threading
import time
import urllib.request
import pytest

from app.server import run_server, CodeAnalysisHandler
from http.server import ThreadingHTTPServer


@pytest.fixture(scope="module")
def api_server():
    """Spin up server on an ephemeral localhost port for integration tests."""
    server = ThreadingHTTPServer(("127.0.0.1", 18888), CodeAnalysisHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.1)
    yield "http://127.0.0.1:18888"
    server.shutdown()
    server.server_close()


def test_server_status_endpoint(api_server):
    """Test GET / status endpoint."""
    with urllib.request.urlopen(f"{api_server}/") as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert data["status"] == "online"
        assert data["architecture"] == "pure-backend (no frontend)"


def test_server_health_endpoint(api_server):
    """Test GET /api/health endpoint."""
    with urllib.request.urlopen(f"{api_server}/api/health") as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert data["status"] == "ok"


def test_server_samples_endpoint(api_server):
    """Test GET /api/samples endpoint."""
    with urllib.request.urlopen(f"{api_server}/api/samples") as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        filenames = [s["filename"] for s in data["samples"]]
        assert "two_sum.py" in filenames
        assert "lru_cache.cpp" in filenames


def test_server_analyze_endpoint_mock(api_server):
    """Test POST /api/analyze with mock option."""
    req_data = json.dumps({
        "code": "def two_sum(nums, target): pass",
        "language": "Python",
        "mock": True
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{api_server}/api/analyze",
        data=req_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert data["language"] == "Python"
        assert data["difficulty"] in ("a", "b", "c")
        assert data["difficulty_label"] in ("Easy", "Medium", "Hard")
