#!/usr/bin/env python3
"""Defensive secrets hygiene scanner for directories you own.

Exits 1 if suspicious patterns are found. Not an exploit tool.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("private-key-header", re.compile(r"BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY")),
    ("aws-access-key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("generic-api-assignment", re.compile(r"(?i)(api[_-]?key|secret|password)\s*=\s*['\"][^'\"]{8,}")),
    ("jwt-like", re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")),
]

SKIP_PARTS = {".git", "node_modules", "dist", ".venv", "venv", "__pycache__"}


def should_skip(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.parts)


def scan_file(path: Path) -> list[str]:
    findings: list[str] = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return findings
    for name, cre in PATTERNS:
        if cre.search(text):
            findings.append(f"{path}: matched {name}")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a tree for secret-like patterns")
    parser.add_argument("root", type=Path, help="Directory you own / are allowed to scan")
    args = parser.parse_args()
    root: Path = args.root
    if not root.is_dir():
        print(f"Not a directory: {root}", file=sys.stderr)
        return 2

    all_findings: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file() or should_skip(path):
            continue
        if path.stat().st_size > 2_000_000:
            continue
        all_findings.extend(scan_file(path))

    if all_findings:
        print("Potential secrets / credentials patterns:")
        for line in all_findings:
            print(f"  - {line}")
        return 1

    print("No configured secret patterns found.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
