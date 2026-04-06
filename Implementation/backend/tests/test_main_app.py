"""Smoke test for FastAPI app import and root route."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_returns_message():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json().get("message") == "Backend is running"
