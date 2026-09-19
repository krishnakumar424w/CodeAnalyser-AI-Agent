"""Groq-Powered Code Analysis Agent CLI Entrypoint.
Enables direct execution via:
    python agent.py --file samples/two_sum.py
    cat samples/lru_cache.cpp | python agent.py --stdin --lang cpp
    python agent.py --json-input --file samples/sample_input.json

Or via module script:
    python -m scripts.analyze --file samples/two_sum.py
"""

import sys
from scripts.analyze import main

if __name__ == "__main__":
    main()
