"""PostgreSQL connection helper for the ingest/export scripts.

Reads connection settings from the environment (see infra/.env.example),
loading infra/.env first if present. The deployed SPA never imports this —
Postgres is only a build/dev-time data store.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "infra" / ".env"


def _load_env() -> None:
    """Populate os.environ from infra/.env (without overriding real env vars)."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def dsn() -> dict:
    _load_env()
    return {
        "host": os.environ.get("POSTGRES_HOST", "localhost"),
        "port": int(os.environ.get("POSTGRES_PORT", "5432")),
        "user": os.environ.get("POSTGRES_USER", "iluc"),
        "password": os.environ.get("POSTGRES_PASSWORD", ""),
        "dbname": os.environ.get("POSTGRES_DB", "iluc_nipe"),
    }


@contextmanager
def connect():
    """Yield a psycopg2 connection, committing on success and closing always."""
    conn = psycopg2.connect(**dsn())
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
