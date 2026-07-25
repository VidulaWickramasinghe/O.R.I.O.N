"""Shared SQLite connection lifecycle helpers."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator


@contextmanager
def managed_connection(database: str | Path) -> Iterator[sqlite3.Connection]:
    """Yield a transactional connection and always release its file descriptor.

    ``sqlite3.Connection`` commits or rolls back when used as a context manager,
    but it does not close itself.  Keeping the close in one helper prevents
    request and test workloads from retaining descriptors until garbage
    collection happens to run.
    """

    connection = sqlite3.connect(database)
    try:
        with connection:
            yield connection
    finally:
        connection.close()
