from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from . import browser_official, changelog, enterprise_html, hasil, legislation_portal, official_portal, professional_library, rss_professional, video_feed, wordpress_feed
from .base import (
    AdapterExecutionContext,
    AdapterRunResult,
    NormalizedUpdate,
    SourceAdapter,
    SourceCandidate,
    SourceConfig,
    normalize_keyword_list,
    stable_hash,
)
from review_queue import AdapterResult as ReviewAdapterResult


@dataclass
class DigestItem:
    page_title: str
    source_url: str
    published_date: str | None = None
    updated_date: str | None = None
    content_snippet: str | None = None
    category: str = "other"


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        return date.fromisoformat(trimmed[:10])
    except ValueError:
        try:
            return datetime.fromisoformat(trimmed.replace("Z", "+00:00")).date()
        except ValueError:
            return None


def _to_digest_item(update: NormalizedUpdate) -> DigestItem:
    return DigestItem(
        page_title=update.title,
        source_url=update.url,
        published_date=update.published_date.isoformat() if update.published_date else None,
        updated_date=update.updated_date.isoformat() if update.updated_date else None,
        content_snippet=update.summary or update.body_text,
        category=update.label.lower().replace(" / ", "-").replace(" ", "-"),
    )


class HasilAdapter(SourceAdapter):
    adapter_name = "hasil"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug != "hasil-en"

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        report = hasil.crawl_source(
            {"slug": source.slug},
            target_date=context.target_date,
            max_list_pages=context.max_list_pages,
            max_detail_pages=context.max_detail_pages,
        )
        candidates: list[SourceCandidate] = []
        for item in report.items:
            candidates.append(
                SourceCandidate(
                    source_slug=source.slug,
                    url=item.url,
                    title=item.title,
                    published_date=_parse_iso_date(item.published_date),
                    updated_date=_parse_iso_date(item.updated_date),
                    summary=item.summary,
                    label=item.label,
                    metadata=item.metadata,
                )
            )
        return candidates

    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        return candidate

    def normalize(
        self,
        source: SourceConfig,
        candidate: SourceCandidate,
        detail: SourceCandidate,
        context: AdapterExecutionContext,
    ) -> list[NormalizedUpdate]:
        return [
            NormalizedUpdate(
                source_slug=source.slug,
                title=detail.title or candidate.url,
                url=detail.url,
                url_hash=stable_hash(f"{source.slug}:{detail.url}:{context.target_date.isoformat()}"),
                target_date=context.target_date,
                published_date=detail.published_date,
                updated_date=detail.updated_date,
                summary=detail.summary,
                body_text=detail.body_text,
                label=detail.label,
                matched_keywords=normalize_keyword_list(source.include_keywords),
                metadata=dict(detail.metadata),
            )
        ]

    def build_digest_items(self, result: AdapterRunResult) -> list[tuple[Any, str]]:
        return [(_to_digest_item(update), update.label) for update in result.normalized_updates]


class ReviewResultAdapter(SourceAdapter):
    adapter_name = "review-result"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return False

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        raise NotImplementedError

    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        return candidate

    def normalize(
        self,
        source: SourceConfig,
        candidate: SourceCandidate,
        detail: SourceCandidate,
        context: AdapterExecutionContext,
    ) -> list[NormalizedUpdate]:
        return []

    def _convert_result(self, source: SourceConfig, context: AdapterExecutionContext, result: ReviewAdapterResult) -> AdapterRunResult:
        normalized_updates: list[NormalizedUpdate] = []
        for item in result.items:
            matched_keywords = normalize_keyword_list(source.include_keywords)
            normalized_updates.append(
                NormalizedUpdate(
                    source_slug=source.slug,
                    title=item.title,
                    url=item.url,
                    url_hash=stable_hash(f"{source.slug}:{item.url}:{context.target_date.isoformat()}"),
                    target_date=context.target_date,
                    published_date=_parse_iso_date(item.published_date),
                    updated_date=_parse_iso_date(item.updated_date),
                    summary=item.summary,
                    label=item.label,
                    matched_keywords=matched_keywords,
                    metadata=dict(item.metadata),
                )
            )

        status = "success" if normalized_updates else "empty"
        if result.review_items and not normalized_updates:
            status = "review_required" if result.automation_level == "review_required" else "empty"

        return AdapterRunResult(
            source_slug=source.slug,
            adapter_name=result.adapter_name,
            status=status,
            failure_class=None,
            candidate_count=len(result.items),
            fetched_count=len(result.items),
            normalized_count=len(normalized_updates),
            normalized_updates=normalized_updates,
            review_items=[item.to_dict() for item in result.review_items],
            automation_level=result.automation_level,
            notes=list(result.notes),
            metadata=dict(result.metadata),
        )

    def build_digest_items(self, result: AdapterRunResult) -> list[tuple[Any, str]]:
        return [(_to_digest_item(update), update.label) for update in result.normalized_updates]


class LegislationPortalAdapter(ReviewResultAdapter):
    adapter_name = "legislation-portal"

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        return self._convert_result(
            source,
            context,
            legislation_portal.crawl_source({"slug": source.slug}, target_date=context.target_date),
        )


class OfficialPortalAdapter(ReviewResultAdapter):
    adapter_name = "official-portal"

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        return self._convert_result(
            source,
            context,
            official_portal.crawl_source({"slug": source.slug}, target_date=context.target_date),
        )


class BrowserOfficialAdapter(ReviewResultAdapter):
    adapter_name = "browser-official"

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        return self._convert_result(
            source,
            context,
            browser_official.crawl_source({"slug": source.slug}, target_date=context.target_date),
        )


class ChangelogAdapter(SourceAdapter):
    adapter_name = "changelog"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug != "sql-accounting-changelog"

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                published_date=_parse_iso_date(item.published_at),
                summary=item.summary,
                label="Vendor Product Update",
                metadata={"version": item.version},
            )
            for item in changelog.crawl_sql_accounting_changelog(timeout=context.timeout_seconds)
        ]

    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        return candidate

    def normalize(self, source: SourceConfig, candidate: SourceCandidate, detail: SourceCandidate, context: AdapterExecutionContext) -> list[NormalizedUpdate]:
        return [
            NormalizedUpdate(
                source_slug=source.slug,
                title=detail.title or detail.url,
                url=detail.url,
                url_hash=stable_hash(f"{source.slug}:{detail.url}:{context.target_date.isoformat()}"),
                target_date=context.target_date,
                published_date=detail.published_date,
                summary=detail.summary,
                label=detail.label,
                matched_keywords=normalize_keyword_list(source.include_keywords),
                metadata=dict(detail.metadata),
            )
        ]

    def build_digest_items(self, result: AdapterRunResult) -> list[tuple[Any, str]]:
        return [(_to_digest_item(update), update.label) for update in result.normalized_updates]


class WordPressFeedAdapter(ChangelogAdapter):
    adapter_name = "wordpress-feed"

    CONFIGS = {
        "landco-my": wordpress_feed.LANDCO_MY,
        "ccs-co-com": wordpress_feed.CCS_CO_COM,
    }

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug not in self.CONFIGS

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        config = self.CONFIGS[source.slug]
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                published_date=_parse_iso_date(item.published_at),
                updated_date=_parse_iso_date(item.updated_at),
                summary=item.summary,
                body_text=item.body_text,
                label="Commentary / Insight",
            )
            for item in wordpress_feed.crawl_wordpress_source(config, timeout=context.timeout_seconds)
        ]


class EnterpriseHtmlAdapter(ChangelogAdapter):
    adapter_name = "enterprise-html"

    CONFIGS = {
        "kpmg-my": enterprise_html.KPMG_MY,
        "yyc-advisors": enterprise_html.YYC_ADVISORS,
    }

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug not in self.CONFIGS and source.slug not in enterprise_html.REVIEW_ONLY_STRATEGIES

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        if source.slug in enterprise_html.REVIEW_ONLY_STRATEGIES:
            return []
        config = self.CONFIGS[source.slug]
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                summary=item.summary,
                label="Commentary / Insight",
                metadata={"matched_keywords": item.matched_keywords, "enterprise_candidate": item},
            )
            for item in enterprise_html.discover_candidates(config, timeout=context.timeout_seconds)
        ]

    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        if source.slug in enterprise_html.REVIEW_ONLY_STRATEGIES:
            return candidate
        hydrated = enterprise_html.hydrate_candidate(
            candidate=candidate.metadata.get("enterprise_candidate", candidate),
            timeout=context.timeout_seconds,
        )
        return SourceCandidate(
            source_slug=source.slug,
            url=hydrated.source_url,
            title=hydrated.title,
            published_date=_parse_iso_date(hydrated.published_at),
            summary=hydrated.summary,
            label="Commentary / Insight",
            metadata={"matched_keywords": hydrated.matched_keywords},
        )

    def normalize(self, source: SourceConfig, candidate: SourceCandidate, detail: SourceCandidate, context: AdapterExecutionContext) -> list[NormalizedUpdate]:
        if source.slug in enterprise_html.REVIEW_ONLY_STRATEGIES:
            return []
        return super().normalize(source, candidate, detail, context)

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        if source.slug in enterprise_html.REVIEW_ONLY_STRATEGIES:
            strategy = enterprise_html.describe_review_only_strategy(source.slug) or {}
            return AdapterRunResult(
                source_slug=source.slug,
                adapter_name=self.adapter_name,
                status="review_required",
                failure_class=None,
                review_items=[strategy],
                automation_level="review_required",
                notes=[strategy.get("rationale", "This source is review-only in v1.")],
                metadata={"review_only": True},
            )
        return super().run(source, context)


class ProfessionalLibraryAdapter(ChangelogAdapter):
    adapter_name = "professional-library"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug != "masb-org-my"

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        report = professional_library.crawl_masb(max_documents_per_section=20)
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                published_date=_parse_iso_date(item.published_date),
                summary=item.summary,
                body_text=item.body_text,
                label="Professional Guidance",
                metadata={"matched_keywords": item.matched_keywords, "content_type": item.content_type},
            )
            for item in report.items
        ]


class RssProfessionalAdapter(ChangelogAdapter):
    adapter_name = "rss-professional"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug != "mia-org-my"

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        report = rss_professional.crawl_mia_feed(feed_url=source.feed_url or rss_professional.MIA_FEED_URL, fetch_pdf=False)
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                published_date=_parse_iso_date(item.published_date),
                summary=item.summary,
                body_text=item.body_text,
                label="Professional Guidance",
                metadata={"matched_keywords": item.matched_keywords, "content_type": item.content_type},
            )
            for item in report.items
        ]


class VideoFeedAdapter(ChangelogAdapter):
    adapter_name = "video-feed"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return source.slug != "anc-group-youtube"

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        if not video_feed.ANC_GROUP_YOUTUBE.channel_id:
            return []
        return [
            SourceCandidate(
                source_slug=source.slug,
                url=item.source_url,
                title=item.title,
                published_date=_parse_iso_date(item.published_at),
                updated_date=_parse_iso_date(item.updated_at),
                summary=item.summary,
                label="Video Update",
                metadata={"video_id": item.video_id},
            )
            for item in video_feed.crawl_youtube_feed(video_feed.ANC_GROUP_YOUTUBE, timeout=context.timeout_seconds)
        ]

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        if not video_feed.ANC_GROUP_YOUTUBE.channel_id:
            return AdapterRunResult(
                source_slug=source.slug,
                adapter_name=self.adapter_name,
                status="review_required",
                failure_class=None,
                review_items=[{"source_slug": source.slug, "queue_reason": "channel-id-missing"}],
                automation_level="review_required",
                notes=["Resolve the YouTube channel ID before automated feed crawling can run."],
            )
        return super().run(source, context)


class UnsupportedAdapter(SourceAdapter):
    def __init__(self, adapter_key: str) -> None:
        self.adapter_key = adapter_key
        self.adapter_name = f"unsupported:{adapter_key}"

    def should_skip(self, source: SourceConfig, context: AdapterExecutionContext) -> bool:
        return False

    def discover_candidates(self, source: SourceConfig, context: AdapterExecutionContext) -> list[SourceCandidate]:
        return []

    def fetch_detail(self, source: SourceConfig, candidate: SourceCandidate, context: AdapterExecutionContext) -> SourceCandidate:
        return candidate

    def normalize(self, source: SourceConfig, candidate: SourceCandidate, detail: SourceCandidate, context: AdapterExecutionContext) -> list[NormalizedUpdate]:
        return []

    def run(self, source: SourceConfig, context: AdapterExecutionContext) -> AdapterRunResult:
        return AdapterRunResult(
            source_slug=source.slug,
            adapter_name=self.adapter_name,
            status="unsupported",
            failure_class="unsupported",
            automation_level="review_required",
            notes=[f"Adapter '{self.adapter_key}' is not enabled yet."],
        )


def build_default_adapter_registry() -> dict[str, SourceAdapter]:
    return {
        "hasil": HasilAdapter(),
        "legislation-portal": LegislationPortalAdapter(),
        "official-portal": OfficialPortalAdapter(),
        "browser-official": BrowserOfficialAdapter(),
        "professional-library": ProfessionalLibraryAdapter(),
        "rss-professional": RssProfessionalAdapter(),
        "changelog": ChangelogAdapter(),
        "wordpress-feed": WordPressFeedAdapter(),
        "enterprise-html": EnterpriseHtmlAdapter(),
        "video-feed": VideoFeedAdapter(),
    }


def resolve_adapter(source: SourceConfig) -> SourceAdapter:
    registry = build_default_adapter_registry()
    adapter_key = source.crawl_strategy or source.adapter_type
    return registry.get(adapter_key, UnsupportedAdapter(adapter_key))
