"""SSRF regression coverage for the browser research transport."""

import os
import socket
import unittest
from unittest.mock import Mock, patch

from core import browser_research


def _dns_row(address: str, port: int = 80):
    if ":" in address:
        return (socket.AF_INET6, socket.SOCK_STREAM, 6, "", (address, port, 0, 0))
    return (socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, port))


class BrowserResearchNetworkSecurityTests(unittest.TestCase):
    def test_non_public_ipv4_and_ipv6_destinations_are_blocked(self) -> None:
        blocked = [
            "127.0.0.1",
            "10.0.0.1",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "0.0.0.0",
            "::1",
            "fc00::1",
            "fe80::1",
        ]
        for address in blocked:
            with self.subTest(address=address), patch.object(
                browser_research.socket,
                "getaddrinfo",
                return_value=[_dns_row(address)],
            ):
                with self.assertRaisesRegex(ValueError, "non-public"):
                    browser_research._resolve_public_destination("http://example.test/")

    def test_url_credentials_and_non_http_schemes_are_blocked(self) -> None:
        for url in (
            "file:///etc/passwd",
            "ftp://example.com/file",
            "http://user:password@example.com/",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                browser_research._resolve_public_destination(url)

    def test_mixed_dns_answer_fails_closed_against_rebinding(self) -> None:
        with patch.object(
            browser_research.socket,
            "getaddrinfo",
            return_value=[_dns_row("8.8.8.8"), _dns_row("127.0.0.1")],
        ), patch.object(browser_research, "_request_once") as request:
            result = browser_research.research_public_page("https://rebinding.test/")

        request.assert_not_called()
        self.assertEqual(result["title"], "Research failed")
        self.assertIn("non-public", result["summary"])

    def test_request_is_pinned_to_the_validated_dns_answer(self) -> None:
        answers = [[_dns_row("8.8.8.8")], [_dns_row("127.0.0.1")]]
        captured = []

        def request(destination):
            captured.append(destination)
            return browser_research._FetchResponse(
                200, {"Content-Type": "text/html"}, b"<title>Safe</title>"
            )

        with patch.object(
            browser_research.socket, "getaddrinfo", side_effect=answers
        ) as resolver, patch.object(
            browser_research, "_request_once", side_effect=request
        ):
            final_url, status, _body = browser_research._fetch_public_page(
                "https://rebind-on-connect.test/"
            )

        self.assertEqual(resolver.call_count, 1)
        self.assertEqual(captured[0].addresses, ("8.8.8.8",))
        self.assertEqual(status, 200)
        self.assertEqual(final_url, "https://rebind-on-connect.test/")

    def test_each_redirect_is_resolved_and_private_redirect_is_blocked(self) -> None:
        def resolve(hostname, port, **_kwargs):
            address = "8.8.8.8" if hostname == "public.test" else "169.254.169.254"
            return [_dns_row(address, port)]

        responses = [
            browser_research._FetchResponse(
                302,
                {"Location": "http://metadata.test/latest/meta-data/"},
                b"",
            )
        ]
        with patch.object(
            browser_research.socket, "getaddrinfo", side_effect=resolve
        ), patch.object(
            browser_research, "_request_once", side_effect=responses
        ) as request:
            with self.assertRaisesRegex(ValueError, "non-public"):
                browser_research._fetch_public_page("https://public.test/")

        self.assertEqual(request.call_count, 1)

    def test_redirect_limit_is_enforced(self) -> None:
        response = browser_research._FetchResponse(
            302, {"Location": "/another"}, b""
        )
        with patch.object(
            browser_research.socket,
            "getaddrinfo",
            return_value=[_dns_row("8.8.8.8")],
        ), patch.object(browser_research, "_request_once", return_value=response):
            with self.assertRaisesRegex(ValueError, "Redirect"):
                browser_research._fetch_public_page("https://public.test/start")

    def test_response_types_are_allowlisted(self) -> None:
        response = browser_research._FetchResponse(
            200, {"Content-Type": "application/octet-stream"}, b"binary"
        )
        with patch.object(
            browser_research.socket,
            "getaddrinfo",
            return_value=[_dns_row("8.8.8.8")],
        ), patch.object(browser_research, "_request_once", return_value=response):
            with self.assertRaisesRegex(ValueError, "content type"):
                browser_research._fetch_public_page("https://public.test/file")

    def test_declared_and_streamed_response_size_limits_are_enforced(self) -> None:
        declared = Mock()
        declared.headers = {
            "Content-Length": str(browser_research.MAX_RESPONSE_BYTES + 1)
        }
        with self.assertRaisesRegex(ValueError, "byte limit"):
            browser_research._read_limited_response(declared)
        declared.read.assert_not_called()

        streamed = Mock()
        streamed.headers = {}
        streamed.read.return_value = b"x" * (browser_research.MAX_RESPONSE_BYTES + 1)
        with self.assertRaisesRegex(ValueError, "byte limit"):
            browser_research._read_limited_response(streamed)
        streamed.read.assert_called_once_with(browser_research.MAX_RESPONSE_BYTES + 1)

    def test_transport_ignores_environment_proxy_and_connects_to_pinned_ip(self) -> None:
        response = Mock()
        response.status = 200
        response.headers = {"Content-Type": "text/html"}
        response.read.return_value = b"<title>Public</title>"
        pool = Mock()
        pool.request.return_value = response
        destination = browser_research._ResolvedDestination(
            url="http://public.test/",
            scheme="http",
            hostname="public.test",
            port=80,
            request_target="/",
            host_header="public.test",
            addresses=("8.8.8.8",),
        )
        with patch.dict(
            os.environ,
            {"HTTP_PROXY": "http://127.0.0.1:9999", "NO_PROXY": ""},
        ), patch.object(
            browser_research.urllib3, "HTTPConnectionPool", return_value=pool
        ) as pool_factory:
            fetched = browser_research._request_once(destination)

        pool_factory.assert_called_once_with(
            host="8.8.8.8", port=80, maxsize=1, block=True
        )
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(pool.request.call_args.kwargs["headers"]["Host"], "public.test")
        self.assertFalse(pool.request.call_args.kwargs["redirect"])
        self.assertFalse(pool.request.call_args.kwargs["retries"])
        pool.close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
