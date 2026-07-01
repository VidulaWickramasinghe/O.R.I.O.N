from datetime import datetime
from typing import Any, Dict, List
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


ALLOWED_SCHEMES = {"http", "https"}

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
    Safely inspect a public web page using requests + BeautifulSoup.
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

        soup = BeautifulSoup(response.text, "lxml")

        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        else:
            title = "Untitled page"

        headings: List[str] = []
        for heading in soup.find_all(["h1", "h2", "h3"]):
            text = heading.get_text(" ", strip=True)
            if text:
                headings.append(text)

        links: List[Dict[str, str]] = []
        for link in soup.find_all("a", href=True):
            label = link.get_text(" ", strip=True)
            href = link["href"]

            if label and href:
                links.append(
                    {
                        "label": label[:120],
                        "href": href[:300],
                    }
                )

        page_text = soup.get_text("\n", strip=True)
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
