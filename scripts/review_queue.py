from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Literal

UTC = timezone.utc

AutomationLevel = Literal["automatic", "hybrid", "review_required"]
ReviewPriority = Literal["low", "medium", "high", "critical"]


def utc_now_iso() -> str:
    return datetime.now(tz=UTC).isoformat()


@dataclass
class DiscoveredUpdate:
    source_slug: str
    title: str
    url: str
    label: str = "Other"
    published_date: str | None = None
    updated_date: str | None = None
    summary: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["metadata"] = dict(sorted(self.metadata.items()))
        return payload


@dataclass
class ReviewQueueItem:
    source_slug: str
    queue_reason: str
    priority: ReviewPriority
    summary: str
    seed_url: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["details"] = dict(sorted(self.details.items()))
        return payload


@dataclass
class AdapterResult:
    source_slug: str
    adapter_name: str
    automation_level: AutomationLevel
    items: list[DiscoveredUpdate] = field(default_factory=list)
    review_items: list[ReviewQueueItem] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_slug": self.source_slug,
            "adapter_name": self.adapter_name,
            "automation_level": self.automation_level,
            "items": [item.to_dict() for item in self.items],
            "review_items": [item.to_dict() for item in self.review_items],
            "notes": list(self.notes),
            "metadata": dict(sorted(self.metadata.items())),
        }


def make_review_item(
    *,
    source_slug: str,
    queue_reason: str,
    summary: str,
    priority: ReviewPriority = "medium",
    seed_url: str | None = None,
    **details: Any,
) -> ReviewQueueItem:
    return ReviewQueueItem(
        source_slug=source_slug,
        queue_reason=queue_reason,
        priority=priority,
        summary=summary,
        seed_url=seed_url,
        details=details,
    )


def queue_file_path(base_dir: str | Path | None = None) -> Path:
    root = Path(base_dir) if base_dir is not None else Path(__file__).resolve().parent.parent
    return root / "logs" / "review-queue.jsonl"


def append_review_items(items: Iterable[ReviewQueueItem], path: str | Path | None = None) -> Path:
    target = Path(path) if path is not None else queue_file_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        for item in items:
            handle.write(json.dumps(item.to_dict(), ensure_ascii=False))
            handle.write("\n")
    return target
