from __future__ import annotations

import dataclasses
import io
import os
import re
import shutil
import ssl
import subprocess
import tempfile
import urllib.parse
import urllib.request
from typing import Optional

USER_AGENT = "Mozilla/5.0 (compatible; OpenClawPdfExtractor/1.0)"
DEFAULT_TIMEOUT = 20


@dataclasses.dataclass
class PdfExtractionResult:
    source_url: str
    title: Optional[str]
    text: str
    page_count: Optional[int]
    used_fallback: bool = False


def _request_bytes(url: str, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/pdf,*/*;q=0.8",
    }
    request = urllib.request.Request(url, headers=headers)
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        return response.read()


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def title_from_url(url: str) -> Optional[str]:
    path = urllib.parse.urlparse(url).path
    filename = path.rsplit("/", 1)[-1]
    if not filename:
        return None
    filename = re.sub(r"\.pdf$", "", filename, flags=re.I)
    filename = urllib.parse.unquote(filename).replace("_", " ").replace("-", " ")
    return clean_text(filename) or None


def _extract_with_pypdf(body: bytes, max_pages: int) -> tuple[str, Optional[str], Optional[int]]:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return "", None, None

    try:
        reader = PdfReader(io.BytesIO(body))
        pages = []
        for page in reader.pages[:max_pages]:
            try:
                pages.append(page.extract_text() or "")
            except Exception:
                continue
        metadata_title = None
        if reader.metadata:
            raw_title = getattr(reader.metadata, "title", None)
            if raw_title:
                metadata_title = clean_text(str(raw_title))
        text = "\n".join(part for part in pages if part)
        return text, metadata_title, len(reader.pages)
    except Exception:
        return "", None, None


def _extract_with_strings(body: bytes) -> str:
    if not shutil.which("strings"):
        return ""

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(body)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["strings", "-n", "8", tmp_path],
            capture_output=True,
            text=True,
            check=False,
        )
        return result.stdout or ""
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def extract_pdf_text_from_bytes(
    body: bytes,
    source_url: str,
    *,
    max_pages: int = 8,
) -> PdfExtractionResult:
    text, metadata_title, page_count = _extract_with_pypdf(body, max_pages=max_pages)
    used_fallback = False

    if not clean_text(text):
        text = _extract_with_strings(body)
        used_fallback = bool(clean_text(text))

    title = metadata_title or title_from_url(source_url)
    return PdfExtractionResult(
        source_url=source_url,
        title=title,
        text=text.strip(),
        page_count=page_count,
        used_fallback=used_fallback,
    )


def extract_pdf_text_from_url(
    url: str,
    *,
    timeout: int = DEFAULT_TIMEOUT,
    max_pages: int = 8,
) -> PdfExtractionResult:
    body = _request_bytes(url, timeout=timeout)
    return extract_pdf_text_from_bytes(body, url, max_pages=max_pages)
