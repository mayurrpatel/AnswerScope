import ipaddress
import socket
from urllib.parse import urlparse, urlunparse
import re

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),    # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),   # Private Class C
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local / Cloud metadata
    ipaddress.ip_network("0.0.0.0/8"),        # Broadcast/Current network
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 Unique local
    ipaddress.ip_network("fe80::/10"),        # IPv6 Link-local
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "169.254.169.254",
}


def normalize_url(raw_url: str) -> str:
    """Normalizes URL safely: lowercases scheme and host, removes fragment and duplicate slashes."""
    if not raw_url:
        raise ValueError("URL cannot be empty")
    
    parsed = urlparse(raw_url.strip())
    if not parsed.scheme:
        raw_url = "https://" + raw_url.strip()
        parsed = urlparse(raw_url)
        
    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise ValueError(f"Unsupported scheme '{scheme}'. Only HTTP and HTTPS are permitted.")
        
    netloc = parsed.netloc.lower()
    # Strip port if standard
    if ":" in netloc:
        host, port = netloc.split(":", 1)
        if (scheme == "http" and port == "80") or (scheme == "https" and port == "443"):
            netloc = host
            
    path = re.sub(r"/+", "/", parsed.path)
    if not path:
        path = "/"
        
    return urlunparse((scheme, netloc, path, "", parsed.query, ""))


def validate_url_security(url: str) -> bool:
    """
    Validates URL to protect against SSRF.
    Rejects private networks, loopbacks, and cloud metadata services.
    """
    try:
        normalized = normalize_url(url)
        parsed = urlparse(normalized)
        hostname = parsed.hostname
        if not hostname:
            return False
            
        hostname_lower = hostname.lower()
        if hostname_lower in BLOCKED_HOSTNAMES:
            return False
            
        # Try resolving IP
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                for net in BLOCKED_IP_NETWORKS:
                    if ip_obj in net:
                        return False
        except socket.gaierror:
            # If DNS fails or can't be resolved, we can allow crawler to handle connection error
            # but if it matches plain IP syntax, check directly
            try:
                ip_obj = ipaddress.ip_address(hostname)
                for net in BLOCKED_IP_NETWORKS:
                    if ip_obj in net:
                        return False
            except ValueError:
                pass

        return True
    except Exception:
        return False


def extract_domain(url: str) -> str:
    """Extracts base registered host/domain."""
    parsed = urlparse(url)
    return (parsed.hostname or "").lower()
