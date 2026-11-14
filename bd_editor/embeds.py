import re
from urllib.parse import parse_qs, urlsplit

_YOUTUBE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
_VIMEO_ID = re.compile(r"^\d{1,12}$")


def canonicalize_embed_url(value, providers):
    """Return a canonical HTTPS embed URL for a supported video URL."""
    if not isinstance(value, str) or len(value) > 2048:
        return None

    try:
        parsed = urlsplit(value.strip())
        port = parsed.port
    except ValueError:
        return None

    if (
        parsed.scheme.lower() not in {"http", "https"}
        or parsed.username
        or parsed.password
        or port is not None
        or not parsed.hostname
    ):
        return None

    host = parsed.hostname.lower()
    path_parts = [part for part in parsed.path.split("/") if part]
    enabled = set(providers)

    # Exact host matching prevents attacker-controlled lookalike domains from
    # passing checks intended for a trusted provider.
    if "youtube" in enabled and host in {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
    }:
        video_id = None
        if host in {"youtu.be"} and path_parts:
            video_id = path_parts[0]
        elif path_parts and path_parts[0] == "watch":
            video_id = parse_qs(parsed.query).get("v", [None])[0]
        elif len(path_parts) >= 2 and path_parts[0] in {"embed", "shorts", "live"}:
            video_id = path_parts[1]
        if video_id and _YOUTUBE_ID.fullmatch(video_id):
            return f"https://www.youtube-nocookie.com/embed/{video_id}"

    if "vimeo" in enabled and host in {"vimeo.com", "www.vimeo.com", "player.vimeo.com"}:
        if host == "player.vimeo.com" and len(path_parts) == 2 and path_parts[0] == "video":
            video_id = path_parts[1]
        elif host != "player.vimeo.com" and len(path_parts) == 1:
            video_id = path_parts[0]
        else:
            video_id = None
        if video_id and _VIMEO_ID.fullmatch(video_id):
            return f"https://player.vimeo.com/video/{video_id}"

    return None
