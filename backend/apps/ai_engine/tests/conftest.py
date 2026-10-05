from __future__ import annotations

import pytest

from apps.ai_engine.catalog.bootstrap import seed_ai_engine_data


@pytest.fixture(autouse=True)
def seed_active_ai_catalogs(db: None) -> None:
    seed_ai_engine_data()
