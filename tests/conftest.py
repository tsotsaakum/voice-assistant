import pytest

from src.conversations import configure
from src.knowledge import configure as configure_knowledge


@pytest.fixture(autouse=True)
def isolated_conversations(tmp_path):
    configure(tmp_path / "conversations.json")
    configure_knowledge(tmp_path / "knowledge_base.json")
    yield
    configure()
    configure_knowledge()
