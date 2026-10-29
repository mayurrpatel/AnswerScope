import pytest
from app.services.crawler.security import normalize_url, validate_url_security, extract_domain


def test_normalize_url():
    assert normalize_url("EXAMPLE.COM") == "https://example.com/"
    assert normalize_url("http://example.com:80/path//to/page#anchor") == "http://example.com/path/to/page"
    assert normalize_url("https://example.com:443/docs") == "https://example.com/docs"


def test_normalize_invalid_url():
    with pytest.raises(ValueError):
        normalize_url("")
    with pytest.raises(ValueError):
        normalize_url("ftp://example.com")


def test_ssrf_rejections():
    # Loopback
    assert validate_url_security("http://127.0.0.1") is False
    assert validate_url_security("http://localhost") is False
    assert validate_url_security("http://localhost:8000") is False

    # Private IP ranges
    assert validate_url_security("http://10.0.0.1") is False
    assert validate_url_security("http://172.16.0.1") is False
    assert validate_url_security("http://192.168.1.1") is False

    # Cloud metadata endpoints
    assert validate_url_security("http://169.254.169.254/latest/meta-data/") is False
    assert validate_url_security("http://metadata.google.internal") is False


def test_extract_domain():
    assert extract_domain("https://www.example.com/page") == "www.example.com"
    assert extract_domain("http://sub.domain.org:8080/path") == "sub.domain.org"
