"""Shared settings loaded from the .env file at the project root.

Copy .env.example to .env and fill in your values. The .env file is not
committed to git.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_FILE)


def census_api_key():
    """Return the Census API key from .env, or stop with a clear message."""
    key = os.environ.get("CENSUS_API_KEY", "").strip()
    if not key:
        raise SystemExit(
            f"CENSUS_API_KEY is not set. Add it to {ENV_FILE}\n"
            "(copy .env.example to .env). "
            "Free key: https://api.census.gov/data/key_signup.html"
        )
    return key
