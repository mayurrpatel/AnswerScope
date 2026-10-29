from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_reports_status_and_database_state():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"] in {"not_configured", "ok", "unreachable"}


def test_openapi_docs_available():
    assert client.get("/openapi.json").status_code == 200
