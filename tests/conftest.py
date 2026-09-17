import pytest

from src.conversations import configure
from src.knowledge import configure as configure_knowledge
from src.rag import configure as configure_rag


@pytest.fixture(autouse=True)
def isolated_conversations(tmp_path):
    configure(tmp_path / "conversations.json")
    configure_knowledge(tmp_path / "knowledge_base.json")
    configure_rag(tmp_path / "business", tmp_path / "rag_index.json")
    yield
    configure()
    configure_knowledge()
    configure_rag()
