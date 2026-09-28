"""Extract and validate a single Amazon product link from pasted text."""

import re
from dataclasses import dataclass
from urllib.parse import urlsplit

from app.core.exceptions import CustomAppException, ErrorDetail


AMAZON_ONLY_ERROR = ErrorDetail(
    "AMAZON_ONLY",
    400,
    "Amazon only",
)
MULTIPLE_LINKS_ERROR = ErrorDetail(
    "MULTIPLE_LINKS",
    400,
    "Paste one link at a time",
)
INVALID_LINK_ERROR = ErrorDetail(
    "INVALID_AMAZON_LINK",
    400,
    "A valid Amazon product link is required",
)

# Match URLs with or without a scheme, including shortened links and common
# bare domains. Trailing punctuation is trimmed after extraction.
_URL_PATTERN = re.compile(
    r"(?:https?://|www\.)[^\s<>\"']+"
    r"|(?<![@\w])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+"
    r"[a-zA-Z]{2,}(?::\d+)?(?:/[^\s<>\"']*)?",
    re.IGNORECASE,
)
_TRAILING_PUNCTUATION = ".,;:!?)]}"
_ASIN_PATTERN = re.compile(r"/(?:dp|gp/product)/([A-Z0-9]{10})(?:[/?#]|$)", re.IGNORECASE)


@dataclass(frozen=True)
class AmazonLink:
    """Validated marketplace URL and its ASIN, when present in the URL."""

    url: str
    asin: str | None


def _extract_urls(text: str) -> list[str]:
    return [match.group(0).rstrip(_TRAILING_PUNCTUATION) for match in _URL_PATTERN.finditer(text)]


def _is_amazon_domain(hostname: str) -> bool:
    hostname = hostname.lower().rstrip(".")
    return hostname == "amzn.to" or hostname == "amazon.com" or hostname.endswith(".amazon.com")


def parse_amazon_link(text: str) -> AmazonLink:
    """Validate pasted text and return its sole Amazon link and optional ASIN.

    Amazon short links (``amzn.to``) are accepted, but have no ASIN unless the
    identifier is present in the pasted URL itself.

    Raises:
        CustomAppException: if the text contains multiple links, a non-Amazon
            domain, or no URL.
    """
    urls = _extract_urls(text or "")
    if len(urls) >= 2:
        raise MULTIPLE_LINKS_ERROR.throw()
    if not urls:
        raise INVALID_LINK_ERROR.throw()

    url = urls[0]
    candidate = url if re.match(r"^https?://", url, re.IGNORECASE) else f"https://{url}"
    hostname = urlsplit(candidate).hostname or ""
    if not _is_amazon_domain(hostname):
        raise AMAZON_ONLY_ERROR.throw()

    asin_match = _ASIN_PATTERN.search(urlsplit(candidate).path + ("?" if urlsplit(candidate).query else ""))
    asin = asin_match.group(1).upper() if asin_match else None
    return AmazonLink(url=url, asin=asin)
