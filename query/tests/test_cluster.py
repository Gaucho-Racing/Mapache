from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from query.config.config import Config
from query.routes import query as query_routes
from query.service.cluster import Cluster, merge_buckets


def _ts(minute: int, second: int = 0) -> datetime:
    return datetime(2026, 1, 1, 0, minute, second)


# --- merge_buckets (pure algorithm) ----------------------------------------


def test_merge_buckets_empty():
    assert merge_buckets("gr26", [], gap_seconds=30) == []


def test_merge_buckets_single_contiguous_block():
    buckets = [(_ts(0, 0), _ts(0, 59)), (_ts(1, 0), _ts(1, 59))]
    clusters = merge_buckets("gr26", buckets, gap_seconds=30)
    assert clusters == [Cluster("gr26", _ts(0, 0), _ts(1, 59))]


def test_merge_buckets_splits_on_large_gap():
    # 2-minute gap between the two blocks (> 30s) → two clusters
    buckets = [
        (_ts(0, 0), _ts(0, 59)),
        (_ts(3, 0), _ts(3, 59)),
    ]
    clusters = merge_buckets("gr26", buckets, gap_seconds=30)
    assert len(clusters) == 2
    assert clusters[0] == Cluster("gr26", _ts(0, 0), _ts(0, 59))
    assert clusters[1] == Cluster("gr26", _ts(3, 0), _ts(3, 59))


def test_merge_buckets_gap_exactly_at_threshold_does_not_split():
    # gap of exactly 30s is not > 30s, so it stays one cluster
    buckets = [
        (_ts(0, 0), _ts(0, 30)),
        (_ts(1, 0), _ts(1, 30)),
    ]
    clusters = merge_buckets("gr26", buckets, gap_seconds=30)
    assert len(clusters) == 1
    assert clusters[0] == Cluster("gr26", _ts(0, 0), _ts(1, 30))


def test_merge_buckets_custom_gap_length():
    buckets = [
        (_ts(0, 0), _ts(0, 10)),
        (_ts(0, 20), _ts(0, 30)),
    ]
    # 10s gap: splits when threshold is 5s, stays merged when threshold is 15s
    assert len(merge_buckets("gr26", buckets, gap_seconds=5)) == 2
    assert len(merge_buckets("gr26", buckets, gap_seconds=15)) == 1


def test_cluster_to_dict_is_iso():
    c = Cluster("gr26", _ts(0, 0), _ts(1, 0))
    d = c.to_dict()
    assert d["vehicle_id"] == "gr26"
    assert d["start_time"] == _ts(0, 0).isoformat()
    assert d["end_time"] == _ts(1, 0).isoformat()


# --- route wiring (no DB; service functions monkeypatched) ------------------


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(Config, "SKIP_AUTH_CHECK", True)
    app = FastAPI()
    app.include_router(query_routes.router, prefix="/query")
    return TestClient(app)


def test_signal_names_route(client, monkeypatch):
    monkeypatch.setattr(
        query_routes, "get_signal_names", lambda **kw: ["gps_lat", "gps_lon"]
    )
    resp = client.get("/query/signals/names?vehicle_id=gr26")
    assert resp.status_code == 200
    assert resp.json() == {"data": ["gps_lat", "gps_lon"]}


def test_signal_names_requires_vehicle_id(client):
    resp = client.get("/query/signals/names")
    assert resp.status_code == 400


def test_signal_names_rejects_bad_timestamp(client, monkeypatch):
    monkeypatch.setattr(query_routes, "get_signal_names", lambda **kw: [])
    resp = client.get("/query/signals/names?vehicle_id=gr26&start=not-a-date")
    assert resp.status_code == 400


def test_clusters_route(client, monkeypatch):
    sample = [Cluster("gr26", _ts(0, 0), _ts(1, 0))]
    monkeypatch.setattr(query_routes, "get_clusters", lambda **kw: sample)
    resp = client.get("/query/clusters?vehicle_id=gr26&gap=30")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) == 1
    assert body["data"][0]["vehicle_id"] == "gr26"


def test_clusters_rejects_non_positive_gap(client):
    resp = client.get("/query/clusters?vehicle_id=gr26&gap=0")
    assert resp.status_code == 400


def test_clusters_unauthorized_when_auth_required(monkeypatch):
    monkeypatch.setattr(Config, "SKIP_AUTH_CHECK", False)
    app = FastAPI()
    app.include_router(query_routes.router, prefix="/query")
    c = TestClient(app)
    resp = c.get("/query/clusters?vehicle_id=gr26")
    assert resp.status_code == 401
