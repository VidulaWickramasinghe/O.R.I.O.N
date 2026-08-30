import ipaddress
import socket
from dataclasses import dataclass
from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Dict, List, Mapping
from urllib.parse import urljoin, urlparse, urlunparse

import certifi
import urllib3

from core.capability_gateway import requires_gateway
from core.runtime_paths import runtime_data_dir


ALLOWED_SCHEMES = {"http", "https"}
RESEARCH_REPORT_DIR = runtime_data_dir() / "browser_research"

MAX_REDIRECTS = 5
MAX_RESPONSE_BYTES = 2 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"text/html", "application/xhtml+xml", "text/plain"}
REQUEST_TIMEOUT = urllib3.Timeout(connect=5.0, read=10.0)


@dataclass(frozen=True)
class _ResolvedDestination:
    url: str
    scheme: str
    hostname: str
    port: int
    request_target: str
    host_header: str
    addresses: tuple[str, ...]


@dataclass(frozen=True)
class _FetchResponse:
    status_code: int
    headers: Mapping[str, str]
    body: bytes


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


def _resolve_public_destination(url: str) -> _ResolvedDestination:
    parsed = urlparse(str(url).strip())
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_SCHEMES:
        raise ValueError("Only http and https URLs are allowed.")
    if parsed.username is not None or parsed.password is not None:
        raise ValueError("URLs containing credentials are not allowed.")
    hostname = (parsed.hostname or "").rstrip(".").lower()
    if not hostname:
        raise ValueError("URL hostname is required.")
    try:
        port = parsed.port or (443 if scheme == "https" else 80)
    except ValueError as error:
        raise ValueError("URL port is invalid.") from error

    try:
        address_rows = socket.getaddrinfo(
            hostname,
            port,
            family=socket.AF_UNSPEC,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as error:
        raise ValueError(f"URL hostname could not be resolved: {error}.") from error
    addresses = tuple(dict.fromkeys(str(row[4][0]) for row in address_rows))
    if not addresses:
        raise ValueError("URL hostname did not resolve to an address.")
    for address in addresses:
        try:
            parsed_address = ipaddress.ip_address(address.split("%", 1)[0])
        except ValueError as error:
            raise ValueError("URL hostname resolved to an invalid address.") from error
        if not parsed_address.is_global:
            raise ValueError(
                f"URL hostname resolved to a non-public address ({parsed_address})."
            )

    path = parsed.path or "/"
    request_target = f"{path}?{parsed.query}" if parsed.query else path
    default_port = 443 if scheme == "https" else 80
    bracketed_host = f"[{hostname}]" if ":" in hostname else hostname
    host_header = (
        bracketed_host if port == default_port else f"{bracketed_host}:{port}"
    )
    normalized_url = urlunparse(
        (scheme, host_header, path, parsed.params, parsed.query, "")
    )
    return _ResolvedDestination(
        url=normalized_url,
        scheme=scheme,
        hostname=hostname,
        port=port,
        request_target=request_target,
        host_header=host_header,
        addresses=addresses,
    )


def _read_limited_response(response: Any) -> bytes:
    content_length = response.headers.get("Content-Length", "")
    if content_length:
        try:
            if int(content_length) > MAX_RESPONSE_BYTES:
                raise ValueError("Response exceeds the browser research byte limit.")
        except ValueError as error:
            if "exceeds" in str(error):
                raise
    body = response.read(MAX_RESPONSE_BYTES + 1)
    if len(body) > MAX_RESPONSE_BYTES:
        raise ValueError("Response exceeds the browser research byte limit.")
    return body


def _request_once(destination: _ResolvedDestination) -> _FetchResponse:
    """Fetch one DNS-pinned hop without environment proxy inheritance."""

    address = destination.addresses[0]
    pool_options: Dict[str, Any] = {
        "host": address,
        "port": destination.port,
        "maxsize": 1,
        "block": True,
    }
    if destination.scheme == "https":
        pool = urllib3.HTTPSConnectionPool(
            **pool_options,
            cert_reqs="CERT_REQUIRED",
            ca_certs=certifi.where(),
            assert_hostname=destination.hostname,
            server_hostname=destination.hostname,
        )
    else:
        pool = urllib3.HTTPConnectionPool(**pool_options)
    response = None
    try:
        response = pool.request(
            "GET",
            destination.request_target,
            headers={
                "Host": destination.host_header,
                "User-Agent": "O.R.I.O.N. Browser Research/3.0",
                "Accept": "text/html,application/xhtml+xml,text/plain;q=0.8",
            },
            redirect=False,
            retries=False,
            preload_content=False,
            timeout=REQUEST_TIMEOUT,
        )
        body = _read_limited_response(response)
        return _FetchResponse(
            status_code=int(response.status),
            headers={str(key): str(value) for key, value in response.headers.items()},
            body=body,
        )
    finally:
        if response is not None:
            response.release_conn()
        pool.close()


def _content_type(headers: Mapping[str, str]) -> str:
    value = next(
        (item for key, item in headers.items() if key.lower() == "content-type"), ""
    )
    return value.split(";", 1)[0].strip().lower()


def _decode_body(body: bytes, headers: Mapping[str, str]) -> str:
    content_type = next(
        (item for key, item in headers.items() if key.lower() == "content-type"), ""
    )
    charset = "utf-8"
    for parameter in content_type.split(";")[1:]:
        key, separator, value = parameter.strip().partition("=")
        if separator and key.lower() == "charset":
            charset = value.strip(" \"'") or "utf-8"
            break
    try:
        return body.decode(charset, errors="replace")
    except LookupError:
        return body.decode("utf-8", errors="replace")


def _fetch_public_page(url: str) -> tuple[str, int, str]:
    current_url = str(url).strip()
    visited = set()
    for redirect_count in range(MAX_REDIRECTS + 1):
        destination = _resolve_public_destination(current_url)
        if destination.url in visited:
            raise ValueError("Redirect loop detected.")
        visited.add(destination.url)
        response = _request_once(destination)
        if response.status_code in {301, 302, 303, 307, 308}:
            if redirect_count >= MAX_REDIRECTS:
                raise ValueError("Redirect limit exceeded.")
            location = next(
                (
                    value
                    for key, value in response.headers.items()
                    if key.lower() == "location"
                ),
                "",
            )
            if not location:
                raise ValueError("Redirect response is missing a destination.")
            current_url = urljoin(destination.url, location)
            continue
        if response.status_code >= 400:
            raise ValueError(f"Remote server returned HTTP {response.status_code}.")
        media_type = _content_type(response.headers)
        if media_type not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Response content type is not allowed: {media_type or 'missing'}.")
        return destination.url, response.status_code, _decode_body(
            response.body, response.headers
        )
    raise ValueError("Redirect limit exceeded.")


def _is_safe_public_url(url: str) -> bool:
    try:
        _resolve_public_destination(url)
        return True
    except ValueError:
        return False


def research_public_page(url: str) -> Dict[str, Any]:
    """
    Safely inspect a public web page using a DNS-pinned transport and parser.
    No login, no form submission, no browser automation.
    """
    clean_url = url.strip()

    try:
        final_url, status_code, response_text = _fetch_public_page(clean_url)

        parser = _PublicPageParser()
        parser.feed(response_text)
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


@requires_gateway
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
