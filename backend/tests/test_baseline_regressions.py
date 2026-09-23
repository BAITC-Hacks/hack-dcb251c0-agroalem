"""Offline unit fixtures only. These tests do not measure live routing accuracy."""
from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from backend.app.evaluation import (
    generate_predictions, load_dev_utterances, prediction_ids,
    select_smoke_utterances, write_predictions, write_text_atomic,
)
from backend.app.schemas import RouterOutput, TextTurnRequest
from backend.scripts import run_baseline


def output(confidence: float = 0.9, identifier: str = "SC01") -> RouterOutput:
    return RouterOutput.model_validate({
        "language": "ru", "scenarios": [{"scenario_id": identifier,
        "confidence": confidence, "reason": "Unit test fixture, not a live route"}],
    })


class StubRouter:
    def __init__(self, fail_at: int | None = None) -> None:
        self.calls: list[dict] = []
        self.fail_at = fail_at

    def route(self, **kwargs):
        self.calls.append(kwargs)
        if len(self.calls) == self.fail_at:
            raise RuntimeError("SECRET-LIKE-TEST-VALUE must not enter reports")
        return output(), 1.25


@pytest.fixture
def rows():
    return [
        {"id": f"unit-{lang}", "text": text, "lang": lang,
         "expected": ["SC01"], "type": "single"}
        for lang, text in [("ru", "Тестовый запрос"), ("kk", "Сынақ сұрағы"), ("mixed", "Тест сұрағы")]
    ]


@pytest.fixture
def dataset(tmp_path, rows):
    path = tmp_path / "fixture-dev.json"
    path.write_text(json.dumps({"utterances": rows}, ensure_ascii=False), encoding="utf-8")
    return path


@pytest.mark.parametrize("field", ["text", "session_id"])
@pytest.mark.parametrize("value", ["", " ", "\t\r\n", "\u2003"])
def test_whitespace_request_is_rejected(field, value):
    payload = {"session_id": "session", "text": "message", field: value}
    with pytest.raises(ValidationError):
        TextTurnRequest.model_validate(payload)


def test_request_strips_edges_but_preserves_mixed_text():
    request = TextTurnRequest(session_id=" session ", text="  Сәлем, полис керек  ")
    assert request.session_id == "session"
    assert request.text == "Сәлем, полис керек"


@pytest.mark.parametrize("length, accepted", [(4000, True), (4001, False)])
def test_request_text_length_limit(length, accepted):
    if accepted:
        assert len(TextTurnRequest(session_id="s", text="x" * length).text) == length
    else:
        with pytest.raises(ValidationError):
            TextTurnRequest(session_id="s", text="x" * length)


@pytest.mark.parametrize("score,expected", [(0.0, "SYS_UNCLEAR"), (0.45, "SYS_UNCLEAR"), (0.7499, "SYS_UNCLEAR"), (0.75, "SC01"), (1.0, "SC01")])
def test_existing_prediction_threshold_is_unchanged(score, expected):
    assert prediction_ids(output(score)) == [expected]


def test_atomic_write_creates_parent_and_preserves_unicode(tmp_path):
    target = tmp_path / "вложено" / "predictions.json"
    write_predictions({"Қазақша": ["SC01"]}, target)
    assert json.loads(target.read_text()) == {"Қазақша": ["SC01"]}
    assert list(target.parent.glob("*.tmp")) == []


def test_failed_atomic_replace_keeps_old_result(tmp_path, monkeypatch):
    path = tmp_path / "output.txt"
    path.write_text("old")
    def fail(*args):
        raise PermissionError("unit-test failure")
    monkeypatch.setattr("backend.app.evaluation.os.replace", fail)
    with pytest.raises(PermissionError):
        write_text_atomic(path, "new")
    assert path.read_text() == "old"
    assert list(tmp_path.glob("*.tmp")) == []


def test_labels_and_expected_ids_are_never_supplied_to_router(rows):
    stub = StubRouter()
    result = generate_predictions(stub, rows)
    assert set(result) == {item["id"] for item in rows}
    assert stub.calls == [{"text": item["text"]} for item in rows]


@pytest.mark.parametrize("bad", [{"id": "", "text": "x"}, {"id": "u", "text": " "}, {"id": 123, "text": "x"}])
def test_invalid_rows_fail_before_provider_calls(bad):
    stub = StubRouter()
    with pytest.raises(ValueError):
        generate_predictions(stub, [bad])
    assert stub.calls == []


def test_duplicate_rows_fail_before_provider_calls(rows):
    stub = StubRouter()
    with pytest.raises(ValueError, match="Duplicate"):
        generate_predictions(stub, [rows[0], rows[0]])
    assert stub.calls == []


def test_partial_predictions_survive_provider_error(tmp_path, rows):
    checkpoint = tmp_path / "partial.json"
    with pytest.raises(RuntimeError):
        generate_predictions(StubRouter(fail_at=2), rows, checkpoint_path=checkpoint)
    assert json.loads(checkpoint.read_text()) == {rows[0]["id"]: ["SC01"]}


def test_progress_reports_only_completed_calls(rows):
    progress = []
    generate_predictions(StubRouter(), rows, progress=lambda *args: progress.append(args))
    assert [item[:2] for item in progress] == [(1, 3), (2, 3), (3, 3)]


def test_smoke_covers_all_language_buckets(rows):
    assert [item["lang"] for item in select_smoke_utterances(list(reversed(rows)))] == ["ru", "kk", "mixed"]


def test_missing_language_fails(rows):
    with pytest.raises(ValueError, match="mixed"):
        select_smoke_utterances(rows[:2])


def test_smoke_only_is_never_labelled_full_baseline(tmp_path, dataset):
    report = tmp_path / "report.txt"
    code = run_baseline.execute_baseline(StubRouter(), model="unit-fixture", dev_path=dataset,
        output_path=tmp_path / "predictions.json", report_path=report, smoke_only=True)
    assert code == 0
    assert "status=SMOKE_COMPLETE" in report.read_text()
    assert "full_baseline=NOT_RUN" in report.read_text()
    assert not (tmp_path / "predictions.json").exists()


def test_failure_does_not_produce_full_predictions_or_leak_error(tmp_path, dataset):
    report = tmp_path / "report.txt"
    code = run_baseline.execute_baseline(StubRouter(fail_at=5), model="unit-fixture", dev_path=dataset,
        output_path=tmp_path / "predictions.json", report_path=report)
    assert code == 1
    assert not (tmp_path / "predictions.json").exists()
    assert "status=FAILED" in report.read_text()
    assert "completed_predictions=1" in report.read_text()
    assert "SECRET-LIKE" not in report.read_text()
    assert (tmp_path / "predictions.partial.json").exists()


def test_official_evaluator_subprocess_on_fixture_rows(tmp_path, dataset, monkeypatch):
    # Exercises file/encoding/subprocess wiring, NOT the real 104-item baseline.
    monkeypatch.chdir(tmp_path)
    report = tmp_path / "evidence" / "fixture-report.txt"
    result = run_baseline.execute_baseline(StubRouter(), model="unit-fixture", dev_path=dataset,
        output_path=Path("output") / "fixture-predictions.json", report_path=report)
    assert result == 0
    content = report.read_text()
    assert "status=COMPLETE" in content
    assert "dataset_count=3" in content
    assert "dataset_sha256=" in content
    assert "primary_acc" in content
    assert "completed_predictions=3" in content
    assert not (tmp_path / "output" / "fixture-predictions.partial.json").exists()


def test_output_cannot_overwrite_dataset(tmp_path, dataset):
    original = dataset.read_bytes()
    with pytest.raises(ValueError, match="distinct"):
        run_baseline.execute_baseline(StubRouter(), model="unit-fixture", dev_path=dataset,
            output_path=dataset, report_path=tmp_path / "report.txt")
    assert dataset.read_bytes() == original


def test_missing_key_stops_before_sdk_import(monkeypatch, capsys):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setattr(run_baseline, "load_settings", lambda: SimpleNamespace(router_model="unit-fixture"))
    assert run_baseline.main(["--smoke-only"]) == 2
    assert "OPENAI_API_KEY is missing" in capsys.readouterr().err
