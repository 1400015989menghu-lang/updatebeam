from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any, Callable, Iterable, Literal, Optional, Protocol

UTC = timezone.utc

AdapterFailureClass = Literal["timeout", "transient", "permanent", "unsupported", "skipped"]
AdapterStatus = Literal["success", "empty", "failed", "timeout", "unsupported", "review_required", "skipped"]


@dataclass
class SourceConfig:
    slug: str
    name: str
    root_url: str
    category: str
    adapter_type: str
    source_type: str = "official-website"
    automation_mode: str = "html"
    timezone: str = "Asia/Kuala_Lumpur"
    language: str = "en"
    trust_tier: str = "official"
    organization_name: str | None = None
    description: str | None = None
    include_keywords: tuple[str, ...] = ()
    exclude_keywords: tuple[str, ...] = ()
    seed_urls: tuple[str, ...] = ()
    entry_urls: tuple[str, ...] = ()
    feed_url: str | None = None
    crawl_strategy: str | None = None
    list_selectors: dict[str, str] = field(default_factory=dict)
    detail_selectors: dict[str, str] = field(default_factory=dict)
    requires_browser: bool = False
    review_mode: str = "automatic"
    dedupe_key_strategy: str = "source-url-target-date"
    detail_patterns: tuple[str, ...] = ()
    is_active: bool = True
    is_public: bool = True


@dataclass
class SourceCandidate:
    source_slug: str
    url: str
    title: str | None = None
    published_date: date | None = None
    updated_date: date | None = None
    summary: str | None = None
    body_text: str | None = None
    label: str = "Other"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NormalizedUpdate:
    source_slug: str
    title: str
    url: str
    url_hash: str
    target_date: date
    published_date: date | None = None
    updated_date: date | None = None
    summary: str | None = None
    body_text: str | None = None
    label: str = "Other"
    matched_keywords: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AdapterExecutionContext:
    target_date: date
    max_list_pages: int
    max_detail_pages: int
    timeout_seconds: int
    retry_attempts: int
    shared_cache: dict[str, Any]
    logger: Any


@dataclass
class AdapterRunResult:
    source_slug: str
    adapter_name: str
    status: AdapterStatus
    failure_class: AdapterFailureClass | None = None
    attempts: int = 0
    duration_ms: int = 0
    candidate_count: int = 0
    fetched_count: int = 0
    normalized_count: int = 0
    normalized_updates: list[NormalizedUpdate] = field(default_factory=list)
    review_items: list[dict[str, Any]] = field(default_factory=list)
    automation_level: str = "automatic"
    notes: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_success(self) -> bool:
        return self.status in {"success", "empty"}


class SourceAdapter(ABC):
    adapter_name: str

    @abstractmethod
    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        raise NotImplementedError

    @abstractmethod
    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        raise NotImplementedError

    @abstractmethod
    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        raise NotImplementedError

    @abstractmethod
    def normalize(
        self,
        source: SourceConfig,
        candidate: SourceCandidate,
        detail: SourceCandidate,
        context: AdapterExecutionContext,
    ) -> list[NormalizedUpdate]:
        raise NotImplementedError

    def build_digest_items(self, result: AdapterRunResult) -> list[tuple[Any, str]]:
        return []

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        import time

        started_at = time.perf_counter()
        if self.should_skip(source, context):
            return AdapterRunResult(
                source_slug=source.slug,
                adapter_name=self.adapter_name,
                status="skipped",
                failure_class="skipped",
                notes=["Adapter chose to skip this source."],
            )

        candidates = self.discover_candidates(source, context)
        fetched_count = 0
        normalized_updates: list[NormalizedUpdate] = []

        for candidate in candidates:
            detail = self.fetch_detail(source, candidate, context)
            fetched_count += 1
            normalized_updates.extend(self.normalize(source, candidate, detail, context))

        status: AdapterStatus = "empty" if not normalized_updates else "success"
        return AdapterRunResult(
            source_slug=source.slug,
            adapter_name=self.adapter_name,
            status=status,
            attempts=1,
            duration_ms=int((time.perf_counter() - started_at) * 1000),
            candidate_count=len(candidates),
            fetched_count=fetched_count,
            normalized_count=len(normalized_updates),
            normalized_updates=normalized_updates,
        )


def stable_hash(value: str) -> str:
    import hashlib

    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return digest[:16]


def classify_exception(exc: Exception) -> AdapterFailureClass:
    import socket
    import urllib.error

    if isinstance(exc, (TimeoutError, socket.timeout)):
        return "timeout"
    if isinstance(exc, urllib.error.HTTPError):
        if 500 <= exc.code < 600:
            return "transient"
        return "permanent"
    if isinstance(exc, urllib.error.URLError):
        reason = getattr(exc, "reason", None)
        if isinstance(reason, socket.timeout):
            return "timeout"
        return "transient"
    message = str(exc).lower()
    if "timeout" in message or "timed out" in message:
        return "timeout"
    if "429" in message or "temporar" in message or "retry" in message:
        return "transient"
    return "permanent"


def retryable_failure(failure_class: AdapterFailureClass | None) -> bool:
    return failure_class in {"timeout", "transient"}


def normalize_keyword_list(values: Iterable[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    return tuple(
        dict.fromkeys(
            value.strip()
            for value in values
            if isinstance(value, str) and value.strip()
        )
    )
