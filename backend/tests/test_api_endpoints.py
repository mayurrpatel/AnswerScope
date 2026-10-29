import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_api_full_workflow():
    with TestClient(app) as client:
        # 1. Health check
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # 2. Create Website with unique domain
        rand_id = uuid.uuid4().hex[:8]
        domain = f"audit-brand-{rand_id}.io"
        site_payload = {
            "name": f"Audit Test Brand {rand_id}",
            "canonical_url": f"https://{domain}",
            "brand_aliases": ["AuditBrand"],
            "competitor_domains": ["rival-firm.com"],
            "robots_txt_respected": True,
            "max_crawl_pages": 10,
        }
        site_res = client.post("/api/websites", json=site_payload)
        assert site_res.status_code == 201
        site_data = site_res.json()
        site_id = site_data["id"]
        assert site_data["domain"] == domain

        # 3. Add Target Questions
        q_payload = {
            "website_id": site_id,
            "text": "What is the best AI visibility tool?",
            "intent": "commercial_investigation",
            "priority": "high",
        }
        q_res = client.post("/api/questions", json=q_payload)
        assert q_res.status_code == 201
        q_data = q_res.json()
        assert q_data["intent"] == "commercial_investigation"

        # 4. List Questions
        list_q = client.get(f"/api/questions?website_id={site_id}")
        assert list_q.status_code == 200
        assert len(list_q.json()) >= 1

        # 5. Check Providers Status
        prov_res = client.get("/api/visibility/providers")
        assert prov_res.status_code == 200
        assert len(prov_res.json()) >= 3

        # 6. Run Visibility Job using test fixture
        vis_payload = {
            "website_id": site_id,
            "provider_name": "test_fixture",
            "use_test_fixture": True,
        }
        vis_res = client.post("/api/visibility/run", json=vis_payload)
        assert vis_res.status_code == 201
        vis_data = vis_res.json()
        assert vis_data["status"] == "completed"
        assert vis_data["brand_mentions_count"] >= 1
        assert vis_data["is_live_provider"] is False

        # 7. Check Summary Report
        rep_res = client.get(f"/api/reports/summary/{site_id}")
        assert rep_res.status_code == 200
        rep_data = rep_res.json()
        assert rep_data["website_name"] == f"Audit Test Brand {rand_id}"
        assert len(rep_data["data_limitations"]) >= 1
