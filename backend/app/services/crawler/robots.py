import urllib.robotparser
import httpx
from urllib.parse import urljoin, urlparse
import logging

logger = logging.getLogger(__name__)


class RobotsChecker:
    def __init__(self, user_agent: str = "AnswerEngineAuditor"):
        self.user_agent = user_agent
        self._parsers: dict[str, urllib.robotparser.RobotFileParser] = {}

    async def can_fetch(self, url: str) -> bool:
        """Checks if robots.txt allows crawling the given URL."""
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        if base not in self._parsers:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = urljoin(base, "/robots.txt")
            try:
                async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                    resp = await client.get(robots_url)
                    if resp.status_code == 200:
                        rp.parse(resp.text.splitlines())
                    else:
                        rp.allow_all = True
            except Exception as e:
                logger.debug(f"Could not fetch robots.txt for {base}: {e}")
                rp.allow_all = True
            self._parsers[base] = rp

        parser = self._parsers[base]
        return parser.can_fetch(self.user_agent, url)
