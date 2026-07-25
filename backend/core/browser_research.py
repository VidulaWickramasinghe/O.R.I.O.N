from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import urljoin, urlparse

import requests


ALLOWED_SCHEMES = {"http", "https"}
RESEARCH_REPORT_DIR = Path(__file__).resolve().parents[1] / "data" / "browser_research"

BLOCKED_HOST_PREFIXES = [
    "localhost",
    "127.",
    "0.",
    "10.",
    "192.168.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
]


class _PublicPageParser(HTMLParser):
    """Extract the small, presentation-safe subset needed by browser research."""

    _SKIPPED_TAGS = {"script", "style", "noscript"}
    _TEXT_BREAK_TAGS = {"p", "br", "div", "li", "section", "article", "header", "footer", "main"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.headings: List[str] = []
        self.links: List[Dict[str, str]] = []
        self._text: List[str] = []
        self._tag_stack: List[str] = []
        self._active_heading: List[str] | None = None
        self._active_link: Dict[str, Any] | None = None
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: List[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self._tag_stack.append(tag)
        if tag in self._SKIPPED_TAGS:
            self._skip_depth += 1
            return
        if tag in self._TEXT_BREAK_TAGS:
            self._text.append("\n")
        if tag in {"h1", "h2", "h3"}:
            self._active_heading = []
        elif tag == "a":
            href = dict(attrs).get("href")
            self._active_link = {"href": href or "", "label": []}

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self._SKIPPED_TAGS and self._skip_depth:
            self._skip_depth -= 1
        if not self._skip_depth and tag in {"h1", "h2", "h3"} and self._active_heading is not None:
            heading = " ".join("".join(self._active_heading).split())
            if heading:
                self.headings.append(heading)
            self._active_heading = None
        elif not self._skip_depth and tag == "a" and self._active_link is not None:
            label = " ".join("".join(self._active_link["label"]).split())
            if label and self._active_link["href"]:
                self.links.append({"label": label, "href": self._active_link["href"]})
            self._active_link = None
        if self._tag_stack:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        self._text.append(data)
        if self._active_heading is not None:
            self._active_heading.append(data)
        if self._active_link is not None:
            self._active_link["label"].append(data)
        if self._tag_stack and self._tag_stack[-1] == "title":
            self.title += data

    @property
    def text(self) -> str:
        return unescape("".join(self._text))


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _empty_result(
    url: str,
    title: str,
    summary: str,
    final_url: str = "",
    status_code: int = 0,
) -> Dict[str, Any]:
    return {
        "url": url,
        "final_url": final_url or url,
        "status_code": status_code,
        "title": title,
        "summary": summary,
        "headings": [],
        "links": [],
        "content_preview": "",
        "created_at": _now(),
    }


def _is_safe_public_url(url: str) -> bool:
    parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_SCHEMES:
        return False

    hostname = parsed.hostname or ""

    for blocked in BLOCKED_HOST_PREFIXES:
        if hostname.startswith(blocked):
            return False

    return True


def research_public_page(url: str) -> Dict[str, Any]:
    """
    Safely inspect a public web page using requests and the standard library parser.
    No login, no form submission, no browser automation.
    """
    clean_url = url.strip()

    if not _is_safe_public_url(clean_url):
        return _empty_result(
            url=clean_url,
            title="Blocked URL",
            summary="Only public http/https pages are allowed. Local/private addresses are blocked.",
        )

    try:
        response = requests.get(
            clean_url,
            timeout=15,
            allow_redirects=True,
            headers={
                "User-Agent": "O.R.I.O.N. Browser Research/2.0"
            },
        )

        response.raise_for_status()

        final_url = response.url
        status_code = response.status_code

        parser = _PublicPageParser()
        parser.feed(response.text)
        parser.close()

        title = " ".join(parser.title.split()) or "Untitled page"
        headings = parser.headings
        links = [
            {"label": link["label"][:120], "href": urljoin(final_url, link["href"])[:300]}
            for link in parser.links
        ]

        page_text = parser.text
        clean_lines = [line.strip() for line in page_text.splitlines() if line.strip()]
        content_preview = "\n".join(clean_lines[:100])[:6000]

        return {
            "url": clean_url,
            "final_url": final_url,
            "status_code": status_code,
            "title": title,
            "summary": (
                f"Fetched public page successfully. "
                f"Found {len(headings)} headings and {len(links)} links."
            ),
            "headings": headings[:30],
            "links": links[:30],
            "content_preview": content_preview,
            "created_at": _now(),
        }

    except Exception as error:
        return _empty_result(
            url=clean_url,
            title="Research failed",
            summary=f"Could not inspect page: {error}",
        )


def browser_research_public_page(url: str) -> Dict[str, Any]:
    """
    Compatibility alias for API code using the older function name.
    """
    return research_public_page(url)


def inspect_web_page(url: str) -> Dict[str, Any]:
    """
    Compatibility alias for older Playwright-based API imports.
    """
    return research_public_page(url)


def summarize_web_page(url: str) -> str:
    """
    Text summary helper for tool calling.
    """
    result = research_public_page(url)

    headings = "\n".join(
        f"- {item}" for item in result.get("headings", [])
    ) or "No headings found."

    return f"""
Browser Research Summary

URL:
{result.get("url", url)}

Final URL:
{result.get("final_url", url)}

Status Code:
{result.get("status_code", 0)}

Title:
{result.get("title", "Untitled page")}

Summary:
{result.get("summary", "")}

Headings:
{headings}

Content Preview:
{result.get("content_preview", "")}
""".strip()


def compare_web_pages(urls: List[str]) -> str:
    """Compare at most five public pages without performing browser actions."""
    results = [research_public_page(url) for url in urls[:5]]
    sections = [
        f"## {result['title']}\n- URL: {result['final_url']}\n- {result['summary']}"
        for result in results
    ]
    return "# Browser Research Comparison\n\n" + "\n\n".join(sections)


def save_web_research_report(title: str, url: str, summary: str, notes: str = "") -> str:
    """Save a local-only research note and return its path."""
    RESEARCH_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_title = "".join(character if character.isalnum() else "_" for character in title).strip("_") or "research"
    path = RESEARCH_REPORT_DIR / f"{safe_title[:80]}_{timestamp}.md"
    path.write_text(
        f"# {title}\n\nURL: {url}\n\n## Summary\n\n{summary}\n\n## Notes\n\n{notes}\n",
        encoding="utf-8",
    )
    return str(path)
