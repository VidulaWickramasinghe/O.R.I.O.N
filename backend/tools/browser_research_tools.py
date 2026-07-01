from typing import List

from agents import function_tool

from core.tool_logger import instrument_tool
from core.browser_research import (
    inspect_web_page,
    save_web_research_report,
    compare_web_pages,
    research_public_page,
)


@function_tool
@instrument_tool("research_browser_page")
def research_browser_page(url: str) -> str:
    """
    Safely research a public web page and extract readable page information.
    """
    result = research_public_page(url)

    headings = "\n".join(f"- {item}" for item in result.get("headings", [])) or "No headings found."

    links = "\n".join(
        f"- {item['label']} → {item['href']}"
        for item in result.get("links", [])
    ) or "No links found."

    return f"""
Browser Research Result

URL:
{result["url"]}

Title:
{result["title"]}

Summary:
{result["summary"]}

Headings:
{headings}

Links:
{links}

Content Preview:
{result["content_preview"]}
""".strip()


@function_tool
@instrument_tool("research_web_page")
def research_web_page(url: str) -> str:
    """
    Safely inspect a public web page and extract readable text.
    No login, form submission, purchase, or account action is performed.
    """
    try:
        page = inspect_web_page(url)

        return f"""
Title: {page['title']}
URL: {page['final_url']}
Captured: {page['captured_at']}

Readable Text Preview:
{page['text'][:6000]}
""".strip()

    except Exception as error:
        return f"Web page research failed: {error}"


@function_tool
@instrument_tool("compare_research_pages")
def compare_research_pages(urls: List[str]) -> str:
    """
    Compare up to five public web pages by extracting readable text previews.
    """
    try:
        return compare_web_pages(urls)
    except Exception as error:
        return f"Web page comparison failed: {error}"


@function_tool
@instrument_tool("save_web_research")
def save_web_research(
    title: str,
    url: str,
    summary: str,
    notes: str = "",
) -> str:
    """
    Save a web research report as a markdown artifact.
    """
    try:
        path = save_web_research_report(
            title=title,
            url=url,
            summary=summary,
            notes=notes,
        )

        return f"Web research report saved: {path}"

    except Exception as error:
        return f"Saving web research failed: {error}"
