from backend.app.catalog import load_catalog


def test_catalog_has_official_counts() -> None:
    catalog = load_catalog()
    assert len(catalog.scenarios) == 40
    assert {"SYS_OUT_OF_SCOPE", "SYS_UNCLEAR", "SYS_GOODBYE"} <= catalog.valid_ids
