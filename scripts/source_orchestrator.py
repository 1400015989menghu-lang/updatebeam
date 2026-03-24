from __future__ import annotations

import concurrent.futures
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from adapters import (
    AdapterExecutionContext,
    AdapterRunResult,
    SourceAdapter,
    SourceConfig,
    resolve_adapter,
)
from adapters.base import classify_exception, retryable_failure

LOGGER = logging.getLogger("source_orchestrator")


@dataclass
class SourceRuntimeRecord:
    slug: str
    name: str
    root_url: str
    category: str
    adapter_type: str
    source_type: str = "official-website"
    automation_mode: str = "html"
    trust_tier: str = "official"


def _project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _manifest_path() -> Path:
    return _project_root() / "data" / "source-manifest.json"


def _normalize_text_list(value: Any) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    return tuple(
        dict.fromkeys(
            item.strip()
            for item in value
            if isinstance(item, str) and item.strip()
        )
    )


def _normalize_selector_map(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, str] = {}
    for key, item in value.items():
        if not isinstance(key, str) or not isinstance(item, str):
            continue
        normalized_key = key.strip()
        normalized_value = item.strip()
        if normalized_key and normalized_value:
            normalized[normalized_key] = normalized_value
    return normalized


class SourceOrchestrator:
    def __init__(
        self,
        *,
        manifest_path: Path | None = None,
        timeout_seconds: int = 120,
        retry_attempts: int = 1,
        logger: logging.Logger | None = None,
    ) -> None:
        self.manifest_path = manifest_path or _manifest_path()
        self.timeout_seconds = timeout_seconds
        self.retry_attempts = retry_attempts
        self.logger = logger or LOGGER
        self.shared_cache: dict[str, Any] = {}
        self._manifest_index = self._load_manifest_index(self.manifest_path)

    def _load_manifest_index(self, manifest_path: Path) -> dict[str, SourceConfig]:
        if not manifest_path.exists():
            return {}

        try:
            payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as exc:
            self.logger.warning("Failed to load source manifest: %s", exc)
            return {}

        index: dict[str, SourceConfig] = {}
        if not isinstance(payload, list):
            return index

        for entry in payload:
            if not isinstance(entry, dict):
                continue
            slug = str(entry.get("slug") or "").strip()
            name = str(entry.get("name") or slug).strip() or slug
            root_url = str(entry.get("rootUrl") or "").strip()
            category = str(entry.get("category") or "general").strip()
            adapter_type = str(entry.get("adapterType") or "generic-html").strip()
            if not slug or not root_url:
                continue
            index[slug] = SourceConfig(
                slug=slug,
                name=name,
                root_url=root_url,
                category=category,
                adapter_type=adapter_type,
                crawl_strategy=str(entry.get("crawlStrategy") or "").strip() or None,
                source_type=str(entry.get("sourceType") or "official-website").strip() or "official-website",
                automation_mode=str(entry.get("automationMode") or "html").strip() or "html",
                timezone=str(entry.get("timezone") or "Asia/Kuala_Lumpur").strip() or "Asia/Kuala_Lumpur",
                language=str(entry.get("language") or "en").strip() or "en",
                trust_tier=str(entry.get("trustTier") or "official").strip() or "official",
                organization_name=str(entry.get("organizationName") or "").strip() or None,
                description=str(entry.get("description") or "").strip() or None,
                include_keywords=_normalize_text_list(entry.get("includeKeywords")),
                exclude_keywords=_normalize_text_list(entry.get("excludeKeywords")),
                seed_urls=_normalize_text_list(entry.get("seedUrls")),
                entry_urls=_normalize_text_list(entry.get("entryUrls")),
                feed_url=str(entry.get("feedUrl") or "").strip() or None,
                list_selectors=_normalize_selector_map(entry.get("listSelectors")),
                detail_selectors=_normalize_selector_map(entry.get("detailSelectors")),
                requires_browser=bool(entry.get("requiresBrowser", False)),
                review_mode=str(entry.get("reviewMode") or "automatic").strip() or "automatic",
                dedupe_key_strategy=str(entry.get("dedupeKeyStrategy") or "source-url-target-date").strip()
                or "source-url-target-date",
                detail_patterns=_normalize_text_list(entry.get("detailPatterns")),
                is_active=bool(entry.get("isActive", True)),
                is_public=bool(entry.get("isPublic", True)),
            )
        return index

    def build_source_config(self, source: SourceRuntimeRecord) -> SourceConfig:
        manifest_source = self._manifest_index.get(source.slug)
        if manifest_source is not None:
            return manifest_source

        return SourceConfig(
            slug=source.slug,
            name=source.name,
            root_url=source.root_url,
            category=source.category,
            adapter_type=source.adapter_type,
            source_type=source.source_type,
            automation_mode=source.automation_mode,
            trust_tier=source.trust_tier,
        )

    def resolve_adapter(self, source_config: SourceConfig) -> SourceAdapter:
        return resolve_adapter(source_config)

    def run_source(
        self,
        source: SourceRuntimeRecord,
        *,
        target_date: date,
        max_list_pages: int,
        max_detail_pages: int,
    ) -> AdapterRunResult:
        source_config = self.build_source_config(source)
        adapter = self.resolve_adapter(source_config)
        context = AdapterExecutionContext(
            target_date=target_date,
            max_list_pages=max_list_pages,
            max_detail_pages=max_detail_pages,
            timeout_seconds=self.timeout_seconds,
            retry_attempts=self.retry_attempts,
            shared_cache=self.shared_cache,
            logger=self.logger,
        )

        last_error: Exception | None = None
        last_failure_class = None
        started_at = datetime.now().timestamp()
        attempts_used = 0
        for attempt in range(1, self.retry_attempts + 2):
            attempts_used = attempt
            self.logger.info(
                "source-run-start slug=%s adapter=%s attempt=%s target_date=%s",
                source.slug,
                adapter.adapter_name,
                attempt,
                target_date.isoformat(),
            )
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            future = executor.submit(adapter.run, source_config, context)
            shutdown_wait = True
            try:
                result = future.result(timeout=self.timeout_seconds)
            except concurrent.futures.TimeoutError as exc:
                shutdown_wait = False
                future.cancel()
                last_error = exc
                last_failure_class = "timeout"
                self.logger.warning(
                    "source-run-timeout slug=%s adapter=%s attempt=%s timeout_seconds=%s",
                    source.slug,
                    adapter.adapter_name,
                    attempt,
                    self.timeout_seconds,
                )
            except Exception as exc:
                last_error = exc
                last_failure_class = classify_exception(exc)
                self.logger.exception(
                    "source-run-error slug=%s adapter=%s attempt=%s failure_class=%s",
                    source.slug,
                    adapter.adapter_name,
                    attempt,
                    last_failure_class,
                )
            else:
                result.attempts = attempt
                result.duration_ms = max(result.duration_ms, int((datetime.now().timestamp() - started_at) * 1000))
                self.logger.info(
                    "source-run-finish slug=%s adapter=%s status=%s candidates=%s normalized=%s",
                    source.slug,
                    adapter.adapter_name,
                    result.status,
                    result.candidate_count,
                    result.normalized_count,
                )
                return result
            finally:
                executor.shutdown(wait=shutdown_wait, cancel_futures=not shutdown_wait)

            if not retryable_failure(last_failure_class):
                break
            if attempt <= self.retry_attempts:
                self.logger.info(
                    "source-run-retry slug=%s adapter=%s next_attempt=%s failure_class=%s",
                    source.slug,
                    adapter.adapter_name,
                    attempt + 1,
                    last_failure_class,
                )

        status = "timeout" if last_failure_class == "timeout" else "failed"
        failure_notes = [
            f"Source run ended with {status}.",
        ]
        if last_error is not None:
            failure_notes.append(str(last_error))
        return AdapterRunResult(
            source_slug=source.slug,
            adapter_name=adapter.adapter_name,
            status=status,
            failure_class=last_failure_class or "permanent",
            attempts=attempts_used or 1,
            notes=failure_notes,
            metadata={"adapter_type": source.adapter_type},
        )

    def get_source_items(
        self,
        source: SourceRuntimeRecord,
        target_date: date,
        cache: dict[tuple[str, date, int, int], list[tuple[Any, str]]],
        max_list_pages: int,
        max_detail_pages: int,
    ) -> list[tuple[Any, str]]:
        cache_key = (source.slug, target_date, max_list_pages, max_detail_pages)
        if cache_key in cache:
            return cache[cache_key]

        result = self.run_source(
            source,
            target_date=target_date,
            max_list_pages=max_list_pages,
            max_detail_pages=max_detail_pages,
        )
        adapter = self.resolve_adapter(self.build_source_config(source))
        digest_items = adapter.build_digest_items(result)
        cache[cache_key] = digest_items
        self.logger.info(
            "source-items-ready slug=%s adapter=%s status=%s item_count=%s",
            source.slug,
            result.adapter_name,
            result.status,
            len(digest_items),
        )
        return digest_items


def build_default_orchestrator() -> SourceOrchestrator:
    return SourceOrchestrator()
