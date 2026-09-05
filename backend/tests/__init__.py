"""Isolate tests before any runtime store is imported.

The environment is deliberately overridden even if a developer exported their
real ORION_DATA_DIR. Both unittest discovery and individual test modules import
this package before importing core or api_main.
"""

import os
import tempfile
import atexit

_runtime = tempfile.TemporaryDirectory(prefix="orion-tests-", dir="/tmp" if os.name != "nt" else None)
TEST_DATA_DIR = _runtime.name
os.environ["ORION_DATA_DIR"] = TEST_DATA_DIR
os.environ["ORION_DEV_AUTH_SOCKET"] = os.path.join(TEST_DATA_DIR, "session.sock")
# Local .env loading must never turn a unit test into a paid provider request.
os.environ["OPENAI_API_KEY"] = ""
atexit.register(_runtime.cleanup)
