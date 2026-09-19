# Groq-Powered Code Analysis Agent ⚡

A production-grade, modular Python backend agent that analyzes algorithmic source code (**Python**, **C++**, **Java**) using Groq's high-speed inference engine (`llama-3.3-70b-versatile`).

Structured to mirror the clean agentic architecture of [`krishnakumar424w/AI-AGENTS-CLASS-2`](https://github.com/krishnakumar424w/AI-AGENTS-CLASS-2). **Pure backend architecture — 100% Python with zero frontend clutter.**

---

## 📁 Repository Structure

```text
.
├── app/
│   ├── __init__.py            # Exports CodeAnalysisAgent, models, and providers
│   ├── agent.py               # Core analysis orchestration & difficulty normalization
│   ├── domain.py              # Pydantic schemas (CodeAnalysisOutput), difficulty ratings ("a", "b", "c")
│   ├── providers.py           # GroqProvider, ScriptedProvider (mock), AgentError handling
│   ├── server.py              # Backend REST API server (HTTP / JSON endpoints)
│   └── tools/
│       ├── __init__.py
│       ├── code_parser.py     # Source readers, language detection (C++, Python, Java), JSON parser
│       └── prompt_builder.py  # Algorithmic system prompt and user query assembler
├── scripts/
│   ├── __init__.py
│   └── analyze.py             # CLI runner script (runnable via python -m scripts.analyze)
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # Pytest fixtures and mock responses (zero quota)
│   ├── test_agent.py          # Agent execution and normalization tests
│   ├── test_domain.py         # Pydantic schema validation & strict difficulty checks
│   ├── test_server.py         # REST API server integration tests
│   └── test_tools.py          # Code parsing, file loading, and language detection tests
├── samples/
│   ├── two_sum.py             # Easy difficulty sample ("a")
│   ├── lru_cache.cpp          # Medium difficulty sample ("b")
│   ├── trapping_rain_water.java # Hard difficulty sample ("c")
│   └── sample_input.json      # Pipeline JSON payload sample
├── agent.py                   # Root CLI entry point (`python agent.py ...`)
├── pytest.ini                 # Pytest configuration (`testpaths = tests`)
├── requirements.txt           # Python dependencies (groq, python-dotenv, pydantic, pytest)
├── .env.example               # Environment variables template
├── .gitignore                 # Python gitignore
└── README.md                  # Project documentation
```

---

## 🎯 Features

- 🧠 **Algorithmic Approach**: High-level technique (Hash Map, Dynamic Programming, Two Pointers, Monotonic Stack).
- ⏱️ **Time Complexity**: Canonical Big-O notation with algorithmic derivation.
- 💾 **Space Complexity**: Formatted auxiliary space with derivation.
- 🏷️ **Strict Difficulty Classification**:
  - `"a"`: **Easy** (elementary loops, hash lookups, direct operations)
  - `"b"`: **Medium** (sliding window, binary search, tree traversals, standard DP)
  - `"c"`: **Hard** (complex state spaces, segment trees, intricate flow/graph algorithms)
- 🧪 **Zero-Quota Mock Mode**: Use `--mock` to test and inspect pipelines locally without consuming Groq API tokens.
- 🔌 **Dual Interface**: Run as a standard CLI tool (`agent.py`) or as a background REST API service (`app.server`).

---

## 🚀 Quick Start

### 1. Set Up Environment
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure API Key
```bash
cp .env.example .env
# Set your Groq API key in .env or export to shell:
export GROQ_API_KEY="gsk_your_groq_api_key_here"
export GROQ_MODEL="llama-3.3-70b-versatile"
```

---

## 💻 Usage Examples

### 1. Direct File Analysis
```bash
python agent.py --file samples/two_sum.py
```
Or with module syntax:
```bash
python -m scripts.analyze --file samples/two_sum.py
```

### 2. Zero-Quota Mock Mode (No API Key Required)
```bash
python agent.py --file samples/lru_cache.cpp --mock
```

### 3. Pipe Code via Standard Input (`stdin`)
```bash
cat samples/lru_cache.cpp | python agent.py --stdin --lang cpp
```

### 4. Upstream JSON Pipeline Payload
```bash
python agent.py --json-input --file samples/sample_input.json
```

### 5. Pure JSON Output to File
```bash
python agent.py --file samples/trapping_rain_water.java --output result.json
```

### 6. Filter with `jq`
```bash
# Extract strictly the difficulty rating ("a", "b", or "c")
python agent.py -q --file samples/two_sum.py --mock | jq -r '.difficulty'

# Extract time complexity
python agent.py -q --file samples/trapping_rain_water.java --mock | jq -r '.time_complexity'
```

---

## 🌐 Backend HTTP REST API

The project includes an embedded HTTP server for microservice integration:

```bash
# Start backend API server (binds to port 3000)
python -m app.server --port 3000
```

### Endpoints:
- `GET /` : Service information, model configuration, and CLI reference.
- `GET /api/health` : Health check (`{"status": "ok"}`).
- `GET /api/samples` : List packaged algorithm sample files.
- `POST /api/analyze` : Analyze code payload.

#### Example API Request:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def two_sum(nums, target): pass",
    "language": "Python",
    "mock": false
  }'
```

---

## 🧪 Running Tests

Run the complete test suite (tests use mock providers and do not consume any API quota):

```bash
pytest
```

All 19 test cases validate:
1. Pydantic schema validation and strict difficulty constraint enforcement (`"a"`, `"b"`, `"c"`).
2. Code parsing, language detection, and JSON stream ingestion.
3. Agent workflow, difficulty string normalization, and error resilience.
4. HTTP backend server endpoints and request handling.
