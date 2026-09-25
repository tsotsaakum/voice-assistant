import pytest

from src.conversations import configure


@pytest.fixture(autouse=True)
def isolated_conversations(tmp_path):
    configure(tmp_path / "conversations.json")
    yield
    configure()
