from __future__ import annotations

import json
import os
import subprocess
from datetime import date
from pathlib import Path
from typing import Any


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _probe_script() -> Path:
    return _project_root() / "scripts" / "browser_probe.cjs"


def _node_path_entries(project_root: Path) -> list[str]:
    entries = [
        str(project_root / "browser-runtime" / "node_modules"),
        str(project_root / "node_modules"),
    ]
    existing = os.environ.get("NODE_PATH")
    if existing:
        entries.append(existing)
    return [entry for entry in entries if Path(entry).exists()]


def run_browser_probe(slug: str, target_date: date, *, timeout_seconds: int = 120) -> dict[str, Any]:
    project_root = _project_root()
    script_path = _probe_script()
    env = os.environ.copy()
    node_path_entries = _node_path_entries(project_root)
    if node_path_entries:
        env["NODE_PATH"] = os.pathsep.join(node_path_entries)

    command = [
        "node",
        str(script_path),
        "--slug",
        slug,
        "--target-date",
        target_date.isoformat(),
    ]
    completed = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        cwd=str(project_root),
        env=env,
    )

    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()
    if completed.returncode != 0:
        message = stderr or stdout or f"browser probe failed for {slug}"
        raise RuntimeError(message)

    if not stdout:
        raise RuntimeError(f"browser probe returned no output for {slug}")

    try:
        return json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"browser probe returned invalid JSON for {slug}: {exc}") from exc
