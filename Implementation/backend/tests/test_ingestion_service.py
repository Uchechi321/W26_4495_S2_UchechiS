"""Unit tests for ingestion_service routing and helpers."""

from app.services.ingestion_service import parse_pdf_report, sha256_bytes


def test_sha256_bytes_hex_length():
    h = sha256_bytes(b"test")
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_parse_pdf_report_unknown_parser():
    out = parse_pdf_report(b"%PDF-1.4 minimal", "NOT_A_REAL_PARSER")
    assert out.get("operations") == []
    assert "No parser matched" in (out.get("notes") or "")


def test_parse_pdf_report_routes_nnpc():
    out = parse_pdf_report(b"%PDF-1.4\n", "NNPC_FORMAT_A")
    assert "operations" in out
    assert isinstance(out["operations"], list)


def test_parse_pdf_report_routes_daily_flexible():
    out = parse_pdf_report(b"%PDF-1.4\n", "DAILY_OPERATIONS_FLEXIBLE")
    assert "operations" in out
    assert isinstance(out["operations"], list)
